import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

const mockAbort = vi.fn();
const mockSupportedCommands = vi.fn().mockResolvedValue([]);

const createMockQuery = (messages: any[] = [], options: { throwError?: Error; abortError?: boolean } = {}) => {
  const asyncIterator = {
    async *[Symbol.asyncIterator]() {
      if (options.abortError) {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        throw error;
      }
      if (options.throwError) {
        throw options.throwError;
      }
      for (const msg of messages) {
        yield msg;
      }
    },
    abort: mockAbort,
    supportedCommands: mockSupportedCommands,
  };
  return asyncIterator;
};

vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn(() => createMockQuery()),
  createSdkMcpServer: vi.fn(() => ({})),
  tool: vi.fn((name, desc, schema, handler) => ({ name, handler })),
}));

vi.mock('../utils/logger', () => ({
  debug: vi.fn(),
}));

vi.mock('../utils/titleGenerator', () => ({
  generateTitle: vi.fn().mockResolvedValue('Mock Generated Title'),
}));

import { AgentSDKManager, AUTO_ACCEPT_EDIT_TOOLS } from './manager';
import { query } from '@anthropic-ai/claude-agent-sdk';

describe('AgentSDKManager', () => {
  let manager: AgentSDKManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(query).mockReset();
    vi.mocked(query).mockImplementation(() => createMockQuery() as any);
    manager = new AgentSDKManager();
  });

  afterEach(() => {
    manager.removeAllListeners();
  });

  describe('constructor', () => {
    it('creates an instance that extends EventEmitter', () => {
      expect(manager).toBeInstanceOf(EventEmitter);
    });
  });

  describe('spawn', () => {
    it('creates a new agent query with correct parameters', async () => {
      const outputHandler = vi.fn();
      manager.on('output', outputHandler);
      manager.on('idle', vi.fn());

      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      expect(query).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'test prompt',
          options: expect.objectContaining({
            cwd: '/test/dir',
            permissionMode: 'default',
            maxThinkingTokens: 16384,
          }),
        })
      );
    });

    it('uses acceptEdits permission mode for auto-accept agent type', async () => {
      manager.on('idle', vi.fn());

      await manager.spawn('test-id', 'test prompt', '/test/dir', 'auto-accept');

      expect(query).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            permissionMode: 'acceptEdits',
          }),
        })
      );
    });

    it('uses default permission mode for planning agent type', async () => {
      manager.on('idle', vi.fn());

      await manager.spawn('test-id', 'test prompt', '/test/dir', 'planning');

      expect(query).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            permissionMode: 'default',
          }),
        })
      );
    });

    it('includes images in prompt when provided', async () => {
      manager.on('idle', vi.fn());

      const images = [
        { id: 'img1', mediaType: 'image/png' as const, base64: 'base64data', path: '/tmp/img1.png', timestamp: Date.now() },
      ];

      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal', undefined, undefined, images);

      expect(query).toHaveBeenCalled();
      const callArgs = vi.mocked(query).mock.calls[0][0];
      expect(typeof callArgs.prompt).not.toBe('string');
      expect(callArgs.prompt[Symbol.asyncIterator]).toBeDefined();
    });

    it('includes worktree context in system prompt when provided', async () => {
      manager.on('idle', vi.fn());

      const worktreeContext = {
        enabled: true,
        gitRoot: '/test/repo',
        currentBranch: 'main',
        repoName: 'test-repo',
      };

      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal', worktreeContext);

      expect(query).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            systemPrompt: expect.objectContaining({
              type: 'preset',
              preset: 'claude_code',
              append: expect.any(String),
            }),
          }),
        })
      );
    });
  });

  describe('event emission', () => {
    it('emits idle event when query iteration completes', async () => {
      const idleHandler = vi.fn();
      manager.on('idle', idleHandler);

      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      await vi.waitFor(() => {
        expect(idleHandler).toHaveBeenCalledWith('test-id');
      });
    });

    it('emits sessionId event when session init message received', async () => {
      vi.mocked(query).mockImplementation(() =>
        createMockQuery([
          { type: 'system', subtype: 'init', session_id: 'session-123' },
        ]) as any
      );

      const sessionIdHandler = vi.fn();
      manager.on('sessionId', sessionIdHandler);
      manager.on('idle', vi.fn());

      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      await vi.waitFor(() => {
        expect(sessionIdHandler).toHaveBeenCalledWith('test-id', 'session-123');
      });
    });

    it('emits output event for text content', async () => {
      vi.mocked(query).mockImplementation(() =>
        createMockQuery([
          {
            type: 'assistant',
            parent_tool_use_id: null,
            message: {
              content: [{ type: 'text', text: 'Hello world' }],
            },
          },
        ]) as any
      );

      const outputHandler = vi.fn();
      manager.on('output', outputHandler);
      manager.on('idle', vi.fn());

      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      await vi.waitFor(() => {
        expect(outputHandler).toHaveBeenCalledWith('test-id', 'Hello world', false, undefined, undefined, expect.any(Number));
      });
    });

    it('emits output event for tool use', async () => {
      vi.mocked(query).mockImplementation(() =>
        createMockQuery([
          {
            type: 'assistant',
            parent_tool_use_id: null,
            message: {
              content: [
                {
                  type: 'tool_use',
                  name: 'Read',
                  id: 'tool-1',
                  input: { file_path: '/test/file.ts' },
                },
              ],
            },
          },
        ]) as any
      );

      const outputHandler = vi.fn();
      manager.on('output', outputHandler);
      manager.on('idle', vi.fn());

      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      await vi.waitFor(() => {
        expect(outputHandler).toHaveBeenCalledWith(
          'test-id',
          expect.objectContaining({
            text: expect.stringContaining('[>] Read('),
            isSubagent: false,
            toolCallId: expect.any(String),
            toolStatus: 'pending',
          })
        );
      });
    });

    it('emits output event for thinking state', async () => {
      vi.mocked(query).mockImplementation(() =>
        createMockQuery([
          {
            type: 'assistant',
            parent_tool_use_id: null,
            message: {
              content: [{ type: 'thinking', text: 'Thinking...' }],
            },
          },
        ]) as any
      );

      const idleHandler = vi.fn();
      manager.on('idle', idleHandler);

      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      await vi.waitFor(() => {
        expect(idleHandler).toHaveBeenCalledWith('test-id');
      });
    });

    it('emits done event on AbortError', async () => {
      vi.mocked(query).mockImplementation(() =>
        createMockQuery([], { abortError: true }) as any
      );

      const doneHandler = vi.fn();
      manager.on('done', doneHandler);

      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      await vi.waitFor(() => {
        expect(doneHandler).toHaveBeenCalledWith('test-id', 0);
      });
    });

    it('emits error event on non-abort errors', async () => {
      const testError = new Error('Test error message');
      vi.mocked(query).mockImplementation(() =>
        createMockQuery([], { throwError: testError }) as any
      );

      const errorHandler = vi.fn();
      manager.on('error', errorHandler);

      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      await vi.waitFor(() => {
        expect(errorHandler).toHaveBeenCalledWith('test-id', 'Test error message');
      });
    });

    it('emits result success output', async () => {
      vi.mocked(query).mockImplementation(() =>
        createMockQuery([
          { type: 'result', subtype: 'success', parent_tool_use_id: null },
        ]) as any
      );

      const outputHandler = vi.fn();
      manager.on('output', outputHandler);
      manager.on('idle', vi.fn());

      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      await vi.waitFor(() => {
        expect(outputHandler).toHaveBeenCalledWith(
          'test-id',
          '[+] Task completed successfully',
          false,
          undefined,
          undefined,
          expect.any(Number)
        );
      });
    });

    it('emits result error output', async () => {
      vi.mocked(query).mockImplementation(() =>
        createMockQuery([
          { type: 'result', subtype: 'error', error: 'Something went wrong', parent_tool_use_id: null },
        ]) as any
      );

      const outputHandler = vi.fn();
      manager.on('output', outputHandler);
      manager.on('idle', vi.fn());

      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      await vi.waitFor(() => {
        expect(outputHandler).toHaveBeenCalledWith(
          'test-id',
          '[x] Error: Something went wrong',
          false,
          undefined,
          undefined,
          expect.any(Number)
        );
      });
    });
  });

  describe('permission flow', () => {
    it('auto-allows artifact directory operations', async () => {
      let canUseToolFn: any;
      vi.mocked(query).mockImplementationOnce((opts: any) => {
        canUseToolFn = opts.options.canUseTool;
        return createMockQuery([]) as any;
      });

      manager.on('idle', vi.fn());
      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      const result = await canUseToolFn(
        'Write',
        { file_path: '~/.agent-manager/artifacts/test.md' },
        { signal: new AbortController().signal, toolUseID: 'tool-1' }
      );

      expect(result.behavior).toBe('allow');
    });

    it('auto-accepts edit tools when permission mode is acceptEdits', async () => {
      let canUseToolFn: any;
      vi.mocked(query).mockImplementationOnce((opts: any) => {
        canUseToolFn = opts.options.canUseTool;
        return createMockQuery([]) as any;
      });

      manager.on('idle', vi.fn());
      await manager.spawn('test-id', 'test prompt', '/test/dir', 'auto-accept');

      for (const tool of AUTO_ACCEPT_EDIT_TOOLS) {
        const result = await canUseToolFn(
          tool,
          { file_path: '/test/file.ts' },
          { signal: new AbortController().signal, toolUseID: `tool-${tool}` }
        );
        expect(result.behavior).toBe('allow');
      }
    });

    it('emits permissionRequest for write tools', async () => {
      let canUseToolFn: any;
      vi.mocked(query).mockImplementationOnce((opts: any) => {
        canUseToolFn = opts.options.canUseTool;
        return createMockQuery([]) as any;
      });

      const permissionRequestHandler = vi.fn((id, request) => {
        request.resolve({ allowed: true });
      });
      manager.on('permissionRequest', permissionRequestHandler);
      manager.on('idle', vi.fn());

      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      await canUseToolFn(
        'Write',
        { file_path: '/test/file.ts' },
        { signal: new AbortController().signal, toolUseID: 'tool-1' }
      );

      expect(permissionRequestHandler).toHaveBeenCalledWith(
        'test-id',
        expect.objectContaining({
          toolName: 'Write',
          toolInput: { file_path: '/test/file.ts' },
        })
      );
    });

    it('returns deny when permission is not granted', async () => {
      let canUseToolFn: any;
      vi.mocked(query).mockImplementationOnce((opts: any) => {
        canUseToolFn = opts.options.canUseTool;
        return createMockQuery([]) as any;
      });

      manager.on('permissionRequest', (id, request) => {
        request.resolve({ allowed: false });
      });
      manager.on('idle', vi.fn());

      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      const result = await canUseToolFn(
        'Write',
        { file_path: '/test/file.ts' },
        { signal: new AbortController().signal, toolUseID: 'tool-1' }
      );

      expect(result.behavior).toBe('deny');
      expect(result.message).toBe('User denied permission');
    });

    it('includes updated permissions when suggestions are provided', async () => {
      let canUseToolFn: any;
      vi.mocked(query).mockImplementationOnce((opts: any) => {
        canUseToolFn = opts.options.canUseTool;
        return createMockQuery([]) as any;
      });

      const suggestions = [{ type: 'allow', tool: 'Write' }];

      manager.on('permissionRequest', (id, request) => {
        request.resolve({ allowed: true, suggestions });
      });
      manager.on('idle', vi.fn());

      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      const result = await canUseToolFn(
        'Write',
        { file_path: '/test/file.ts' },
        { signal: new AbortController().signal, toolUseID: 'tool-1', suggestions }
      );

      expect(result.behavior).toBe('allow');
      expect(result.updatedPermissions).toBe(suggestions);
    });
  });

  describe('subagent tracking', () => {
    it('processes user messages with tool results', async () => {
      vi.mocked(query).mockImplementation(() =>
        createMockQuery([
          {
            type: 'user',
            parent_tool_use_id: 'tool-1',
            tool_use_result: 'Done',
          },
        ]) as any
      );

      manager.on('idle', vi.fn());

      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      await vi.waitFor(() => {
        expect(manager.isRunning('test-id')).toBe(true);
      });
    });
  });

  describe('kill', () => {
    it('aborts and cleans up an existing agent', async () => {
      manager.on('idle', vi.fn());
      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      expect(manager.isRunning('test-id')).toBe(true);

      const result = manager.kill('test-id');

      expect(result).toBe(true);
      expect(manager.isRunning('test-id')).toBe(false);
    });

    it('returns false for non-existent agent', () => {
      const result = manager.kill('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('isRunning', () => {
    it('returns true for running agent', async () => {
      manager.on('idle', vi.fn());
      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      expect(manager.isRunning('test-id')).toBe(true);
    });

    it('returns false for non-existent agent', () => {
      expect(manager.isRunning('non-existent')).toBe(false);
    });
  });

  describe('isAlive', () => {
    it('returns true for alive agent', async () => {
      manager.on('idle', vi.fn());
      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      await vi.waitFor(() => {
        expect(manager.isAlive('test-id')).toBe(true);
      });
    });

    it('returns false for killed agent', async () => {
      manager.on('idle', vi.fn());
      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');
      manager.kill('test-id');

      expect(manager.isAlive('test-id')).toBe(false);
    });

    it('returns false for non-existent agent', () => {
      expect(manager.isAlive('non-existent')).toBe(false);
    });
  });

  describe('isIterating', () => {
    it('returns false for non-existent agent', () => {
      expect(manager.isIterating('non-existent')).toBe(false);
    });
  });

  describe('close', () => {
    it('cleans up agent without aborting', async () => {
      manager.on('idle', vi.fn());
      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      manager.close('test-id');

      expect(manager.isRunning('test-id')).toBe(false);
    });
  });

  describe('setPermissionMode', () => {
    it('updates permission mode for existing agent', async () => {
      let canUseToolFn: any;
      vi.mocked(query).mockImplementationOnce((opts: any) => {
        canUseToolFn = opts.options.canUseTool;
        return createMockQuery([]) as any;
      });

      manager.on('idle', vi.fn());
      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      manager.setPermissionMode('test-id', 'acceptEdits');

      const result = await canUseToolFn(
        'Write',
        { file_path: '/test/file.ts' },
        { signal: new AbortController().signal, toolUseID: 'tool-1' }
      );

      expect(result.behavior).toBe('allow');
    });

    it('does nothing for non-existent agent', () => {
      expect(() => manager.setPermissionMode('non-existent', 'acceptEdits')).not.toThrow();
    });
  });

  describe('sendFollowUpMessage', () => {
    it('throws error for non-existent agent', async () => {
      await expect(
        manager.sendFollowUpMessage('non-existent', 'test message')
      ).rejects.toThrow('Agent non-existent not found');
    });

    it('throws error when agent is terminated', async () => {
      manager.on('idle', vi.fn());
      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');
      manager.kill('test-id');

      vi.mocked(query).mockReturnValueOnce(createMockQuery([]) as any);
      manager.on('idle', vi.fn());
      await manager.spawn('test-id-2', 'test prompt', '/test/dir', 'normal');

      await vi.waitFor(() => {
        expect(manager.isAlive('test-id-2')).toBe(true);
      });
    });

    it('throws error when no session ID available', async () => {
      manager.on('idle', vi.fn());
      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      await vi.waitFor(() => {
        expect(manager.isAlive('test-id')).toBe(true);
      });

      await expect(
        manager.sendFollowUpMessage('test-id', 'test message')
      ).rejects.toThrow('No session ID available');
    });

    it('sends follow-up message when agent has session ID', async () => {
      let idleCallback: () => void;
      const idlePromise = new Promise<void>(resolve => { idleCallback = resolve; });

      vi.mocked(query).mockImplementation(() =>
        createMockQuery([
          { type: 'system', subtype: 'init', session_id: 'session-123' },
        ]) as any
      );

      manager.on('idle', () => idleCallback!());
      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      await idlePromise;

      expect(manager.isAlive('test-id')).toBe(true);
      expect(manager.isIterating('test-id')).toBe(false);

      vi.mocked(query).mockImplementation(() => createMockQuery([]) as any);

      const outputHandler = vi.fn();
      manager.on('output', outputHandler);

      await manager.sendFollowUpMessage('test-id', 'follow-up message');

      expect(outputHandler).toHaveBeenCalledWith('test-id', '[>] User: follow-up message', false, undefined, undefined, expect.any(Number));
    });

    it('includes images in follow-up message when provided', async () => {
      let idleCallback: () => void;
      const idlePromise = new Promise<void>(resolve => { idleCallback = resolve; });

      vi.mocked(query).mockImplementation(() =>
        createMockQuery([
          { type: 'system', subtype: 'init', session_id: 'session-123' },
        ]) as any
      );

      manager.on('idle', () => idleCallback!());
      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      await idlePromise;

      expect(manager.isAlive('test-id')).toBe(true);
      expect(manager.isIterating('test-id')).toBe(false);

      vi.mocked(query).mockImplementation(() => createMockQuery([]) as any);

      const images = [
        { id: 'img1', mediaType: 'image/png' as const, base64: 'base64data', path: '/tmp/img1.png', timestamp: Date.now() },
      ];

      await manager.sendFollowUpMessage('test-id', 'with image', images);

      const lastCall = vi.mocked(query).mock.calls[vi.mocked(query).mock.calls.length - 1][0];
      expect(typeof lastCall.prompt).not.toBe('string');
      expect(lastCall.prompt[Symbol.asyncIterator]).toBeDefined();
    });
  });

  describe('getAvailableCommands', () => {
    it('returns cached commands on subsequent calls', async () => {
      const commands = await AgentSDKManager.getAvailableCommands('/test/dir');
      expect(commands).toEqual([]);

      const commands2 = await AgentSDKManager.getAvailableCommands('/test/dir');
      expect(commands2).toBe(commands);
    });
  });

  describe('formatToolInput', () => {
    it('formats Bash command correctly', async () => {
      vi.mocked(query).mockImplementation(() =>
        createMockQuery([
          {
            type: 'assistant',
            parent_tool_use_id: null,
            message: {
              content: [
                {
                  type: 'tool_use',
                  name: 'Bash',
                  id: 'tool-1',
                  input: { command: 'npm install' },
                },
              ],
            },
          },
        ]) as any
      );

      const outputHandler = vi.fn();
      manager.on('output', outputHandler);
      manager.on('idle', vi.fn());

      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      await vi.waitFor(() => {
        expect(outputHandler).toHaveBeenCalledWith(
          'test-id',
          expect.objectContaining({
            text: '[>] Bash(npm install)',
            isSubagent: false,
            toolCallId: expect.any(String),
            toolStatus: 'pending',
          })
        );
      });
    });

    it('formats Glob pattern correctly', async () => {
      vi.mocked(query).mockImplementation(() =>
        createMockQuery([
          {
            type: 'assistant',
            parent_tool_use_id: null,
            message: {
              content: [
                {
                  type: 'tool_use',
                  name: 'Glob',
                  id: 'tool-1',
                  input: { pattern: '**/*.ts' },
                },
              ],
            },
          },
        ]) as any
      );

      const outputHandler = vi.fn();
      manager.on('output', outputHandler);
      manager.on('idle', vi.fn());

      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      await vi.waitFor(() => {
        expect(outputHandler).toHaveBeenCalledWith(
          'test-id',
          expect.objectContaining({
            text: '[>] Glob(**/*.ts)',
            isSubagent: false,
            toolCallId: expect.any(String),
            toolStatus: 'pending',
          })
        );
      });
    });

    it('formats WebSearch query correctly', async () => {
      vi.mocked(query).mockImplementation(() =>
        createMockQuery([
          {
            type: 'assistant',
            parent_tool_use_id: null,
            message: {
              content: [
                {
                  type: 'tool_use',
                  name: 'WebSearch',
                  id: 'tool-1',
                  input: { query: 'typescript best practices' },
                },
              ],
            },
          },
        ]) as any
      );

      const outputHandler = vi.fn();
      manager.on('output', outputHandler);
      manager.on('idle', vi.fn());

      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      await vi.waitFor(() => {
        expect(outputHandler).toHaveBeenCalledWith(
          'test-id',
          expect.objectContaining({
            text: '[>] WebSearch(typescript best practices)',
            isSubagent: false,
            toolCallId: expect.any(String),
            toolStatus: 'pending',
          })
        );
      });
    });

    it('truncates long tool input', async () => {
      const longPath = '/very/long/path/that/exceeds/the/maximum/length/allowed/for/display/in/the/output/line.ts';
      vi.mocked(query).mockImplementation(() =>
        createMockQuery([
          {
            type: 'assistant',
            parent_tool_use_id: null,
            message: {
              content: [
                {
                  type: 'tool_use',
                  name: 'Read',
                  id: 'tool-1',
                  input: { file_path: longPath },
                },
              ],
            },
          },
        ]) as any
      );

      const outputHandler = vi.fn();
      manager.on('output', outputHandler);
      manager.on('idle', vi.fn());

      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      await vi.waitFor(() => {
        expect(outputHandler).toHaveBeenCalledWith(
          'test-id',
          expect.objectContaining({
            text: expect.stringMatching(/\[>\] Read\(.+\.\.\.\)/),
            isSubagent: false,
            toolCallId: expect.any(String),
            toolStatus: 'pending',
          })
        );
      });
    });

    it('formats Task tool with description', async () => {
      vi.mocked(query).mockImplementation(() =>
        createMockQuery([
          {
            type: 'assistant',
            parent_tool_use_id: null,
            message: {
              content: [
                {
                  type: 'tool_use',
                  name: 'Task',
                  id: 'tool-1',
                  input: { description: 'Search for files', subagent_type: 'Explore' },
                },
              ],
            },
          },
        ]) as any
      );

      const outputHandler = vi.fn();
      manager.on('output', outputHandler);
      manager.on('idle', vi.fn());

      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      await vi.waitFor(() => {
        expect(outputHandler).toHaveBeenCalledWith(
          'test-id',
          expect.objectContaining({
            text: '[>] Task(Search for files)',
            isSubagent: false,
            toolCallId: expect.any(String),
            toolStatus: 'pending',
          })
        );
      });
    });
  });

  describe('artifact path detection', () => {
    it('auto-allows Write to artifacts directory', async () => {
      let canUseToolFn: any;
      vi.mocked(query).mockImplementation((opts: any) => {
        canUseToolFn = opts.options.canUseTool;
        return createMockQuery([]) as any;
      });

      manager.on('idle', vi.fn());
      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      await vi.waitFor(() => {
        expect(canUseToolFn).toBeDefined();
      });

      const result = await canUseToolFn(
        'Write',
        { file_path: `${process.env.HOME}/.agent-manager/artifacts/test.md` },
        { signal: new AbortController().signal, toolUseID: 'tool-1' }
      );

      expect(result.behavior).toBe('allow');
    });

    it('auto-allows Bash commands targeting artifacts directory', async () => {
      let canUseToolFn: any;
      vi.mocked(query).mockImplementation((opts: any) => {
        canUseToolFn = opts.options.canUseTool;
        return createMockQuery([]) as any;
      });

      manager.on('idle', vi.fn());
      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      await vi.waitFor(() => {
        expect(canUseToolFn).toBeDefined();
      });

      const result = await canUseToolFn(
        'Bash',
        { command: 'cat ~/.agent-manager/artifacts/test.md' },
        { signal: new AbortController().signal, toolUseID: 'tool-1' }
      );

      expect(result.behavior).toBe('allow');
    });

    it('requires permission for non-artifact paths', async () => {
      let canUseToolFn: any;
      vi.mocked(query).mockImplementation((opts: any) => {
        canUseToolFn = opts.options.canUseTool;
        return createMockQuery([]) as any;
      });

      const permissionRequestHandler = vi.fn((id, request) => {
        request.resolve({ allowed: true });
      });
      manager.on('permissionRequest', permissionRequestHandler);
      manager.on('idle', vi.fn());

      await manager.spawn('test-id', 'test prompt', '/test/dir', 'normal');

      await vi.waitFor(() => {
        expect(canUseToolFn).toBeDefined();
      });

      await canUseToolFn(
        'Write',
        { file_path: '/some/other/path.ts' },
        { signal: new AbortController().signal, toolUseID: 'tool-1' }
      );

      expect(permissionRequestHandler).toHaveBeenCalled();
    });
  });
});
