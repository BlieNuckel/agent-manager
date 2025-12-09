import { EventEmitter } from 'events';
import { query, type Query, type SDKMessage, type SlashCommand, createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import type { AgentType, Question, PermissionMode } from '../types';
import { debug } from '../utils/logger';
import { generateTitle } from '../utils/titleGenerator';
import type { WorktreeContext } from './systemPromptTemplates';
import { buildSystemPrompt, buildWorktreePromptPrefix } from './systemPromptTemplates';

const PERMISSION_REQUIRED_TOOLS = ['Write', 'Edit', 'MultiEdit', 'Bash', 'NotebookEdit', 'KillBash'];
const AUTO_ACCEPT_EDIT_TOOLS = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit'];

interface QueryEntry {
  query: Query;
  abort: AbortController;
  alive: boolean;
  iterating: boolean;
  sessionId?: string;
  workDir: string;
  systemPromptAppend?: string;
  activeSubagents: Map<string, { agentID: string; subagentType: string }>;
}

export class AgentSDKManager extends EventEmitter {
  private queries: Map<string, QueryEntry> = new Map();
  private agentStates: Map<string, { agentType: AgentType; hasTitle: boolean; permissionMode: PermissionMode }> = new Map();
  private thinkingStates: Map<string, boolean> = new Map();
  private static commandsCache: SlashCommand[] | null = null;

  private getPermissionModeForAgentType(agentType: AgentType): PermissionMode {
    switch (agentType) {
      case 'auto-accept':
        return 'acceptEdits';
      case 'normal':
      case 'planning':
      default:
        return 'default';
    }
  }

  private createCanUseTool(id: string) {
    return async (toolName: string, toolInput: Record<string, unknown>, options: { signal: AbortSignal; agentID?: string; toolUseID: string; suggestions?: unknown[] }) => {
      const entry = this.queries.get(id);
      const agentState = this.agentStates.get(id);
      debug('canUseTool called:', { toolName, toolInput, agentID: options.agentID, toolUseID: options.toolUseID });

      const isSubagentTool = options.agentID !== undefined;
      let subagentType: string | undefined;

      if (options.agentID && toolName === 'Task' && entry) {
        if (!entry.activeSubagents.has(options.toolUseID)) {
          const detectedSubagentType = (toolInput as any).subagent_type || 'unknown';
          subagentType = detectedSubagentType;
          entry.activeSubagents.set(options.toolUseID, {
            agentID: options.agentID,
            subagentType: detectedSubagentType
          });
          this.emit('output', id, `[→] Starting subagent: ${detectedSubagentType}`, false);
          debug('Subagent started:', { agentID: options.agentID, subagentType: detectedSubagentType, toolUseID: options.toolUseID });
        }
      }

      if (agentState?.permissionMode === 'acceptEdits' && AUTO_ACCEPT_EDIT_TOOLS.includes(toolName)) {
        debug('Auto-accepting edit permission for tool:', toolName);
        this.emit('output', id, `[+] Auto-allowed: ${toolName}`, isSubagentTool, options.agentID, subagentType);
        return { behavior: 'allow' as const, updatedInput: toolInput };
      }

      debug('Requesting permission for tool:', toolName);
      this.emit('output', id, `[!] Permission required for: ${toolName}`, isSubagentTool, options.agentID, subagentType);

      const result = await new Promise<{ allowed: boolean; alwaysAllowInRepo?: boolean }>((resolvePermission) => {
        this.emit('permissionRequest', id, {
          toolName,
          toolInput,
          suggestions: options.suggestions,
          resolve: resolvePermission
        });
      });

      debug('Permission result:', { toolName, allowed: result.allowed, alwaysAllowInRepo: result.alwaysAllowInRepo });
      this.emit('output', id, result.allowed ? `[+] Allowed: ${toolName}` : `[-] Denied: ${toolName}`, isSubagentTool, options.agentID, subagentType);

      if (result.allowed) {
        const response: { behavior: 'allow'; updatedInput: Record<string, unknown>; updatedPermissions?: unknown[] } = {
          behavior: 'allow' as const,
          updatedInput: toolInput
        };
        if (result.alwaysAllowInRepo && options.suggestions) {
          response.updatedPermissions = options.suggestions;
        }
        return response;
      } else {
        return { behavior: 'deny' as const, message: 'User denied permission' };
      }
    };
  }

  private createQuestionMcpServer(id: string) {
    const questionOptionSchema = z.object({
      label: z.string().describe('The display text for this option (1-5 words)'),
      description: z.string().describe('Explanation of what this option means or what will happen if chosen'),
    });

    const questionSchema = z.object({
      question: z.string().describe('The complete question to ask the user. Should be clear, specific, and end with a question mark.'),
      header: z.string().max(12).describe('Very short label displayed as a chip/tag (max 12 chars). Examples: "Auth method", "Library", "Approach".'),
      options: z.array(questionOptionSchema).min(2).max(4).describe('The available choices for this question. Must have 2-4 options.'),
      multiSelect: z.boolean().describe('Set to true to allow multiple selections instead of just one'),
    });

    const inputSchema = z.object({
      questions: z.array(questionSchema).min(1).max(4).describe('Questions to ask the user (1-4 questions)'),
    });

    return createSdkMcpServer({
      name: 'question-handler',
      version: '1.0.0',
      tools: [
        tool(
          'AskQuestion',
          'Ask the user questions during task execution. Use this when you need user input to make decisions, choose between alternatives, or clarify requirements. The user will see a prompt with the questions and options you provide.',
          inputSchema.shape,
          async (args) => {
            debug('AskQuestion tool called:', { agentId: id, questions: args.questions });

            this.emit('output', id, '[?] Asking user for input...', false);

            const answers = await new Promise<Record<string, string | string[]>>((resolveQuestion) => {
              this.emit('questionRequest', id, {
                questions: args.questions as Question[],
                resolve: resolveQuestion
              });
            });

            debug('Question answers received:', { agentId: id, answers });
            this.emit('output', id, '[+] User provided answers', false);

            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({ answers }, null, 2)
              }]
            };
          }
        )
      ]
    });
  }

  async spawn(id: string, prompt: string, workDir: string, agentType: AgentType, worktreeContext?: WorktreeContext, title?: string): Promise<void> {
    const abortController = new AbortController();
    const permissionMode = this.getPermissionModeForAgentType(agentType);
    this.agentStates.set(id, { agentType, hasTitle: true, permissionMode });

    const systemPromptAppend = buildSystemPrompt(worktreeContext);

    let finalPrompt = prompt;
    if (worktreeContext?.enabled) {
      const worktreePrefix = buildWorktreePromptPrefix(worktreeContext);
      finalPrompt = worktreePrefix + prompt;
      debug('Prepending worktree setup instructions to prompt');
    }

    const queryOptions: any = {
      cwd: workDir,
      abortController,
      permissionMode,
      canUseTool: this.createCanUseTool(id),
      settingSources: ['project'],
      maxThinkingTokens: 16384,
      mcpServers: {
        'question-handler': this.createQuestionMcpServer(id)
      }
    };

    if (systemPromptAppend) {
      queryOptions.systemPrompt = {
        type: 'preset',
        preset: 'claude_code',
        append: systemPromptAppend
      };
      debug('Injecting systemPrompt with worktree instructions');
    }

    const q = query({
      prompt: finalPrompt,
      options: queryOptions,
    });

    this.queries.set(id, {
      query: q,
      abort: abortController,
      alive: true,
      iterating: false,
      workDir,
      systemPromptAppend: systemPromptAppend || undefined,
      activeSubagents: new Map(),
    });

    this.iterateQuery(id, q);
  }

  private async iterateQuery(id: string, q: Query): Promise<void> {
    try {
      debug('Starting query iteration for:', id);
      const entry = this.queries.get(id);
      if (entry) {
        entry.iterating = true;
      }

      for await (const message of q) {
        this.processMessage(id, message);
      }

      const currentEntry = this.queries.get(id);
      if (currentEntry) {
        currentEntry.iterating = false;
      }

      debug('Query iteration completed for:', id);
      this.emit('idle', id);
    } catch (error: any) {
      debug('Query error:', { id, name: error.name, message: error.message, stack: error.stack });

      const currentEntry = this.queries.get(id);
      if (currentEntry) {
        currentEntry.iterating = false;
        currentEntry.alive = false;
      }

      if (error.name === 'AbortError') {
        this.emit('done', id, 0);
      } else {
        this.emit('error', id, error.message);
      }
    }
  }

  private checkForWorktreeSignals(id: string, text: string): void {
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.includes('[WORKTREE_CREATED]')) {
        const branchName = line.split('[WORKTREE_CREATED]')[1]?.trim();
        if (branchName) {
          debug('Worktree created signal detected:', { id, branchName });
          this.emit('worktreeCreated', id, branchName);
        }
      } else if (line.includes('[WORKTREE_MERGE_READY]')) {
        const branchName = line.split('[WORKTREE_MERGE_READY]')[1]?.trim();
        if (branchName) {
          debug('Merge ready signal detected:', { id, branchName });
          this.emit('mergeReady', id, branchName);
        }
      } else if (line.includes('[WORKTREE_MERGE_CONFLICTS]')) {
        const branchName = line.split('[WORKTREE_MERGE_CONFLICTS]')[1]?.trim();
        if (branchName) {
          debug('Merge conflicts signal detected:', { id, branchName });
          this.emit('mergeConflicts', id, branchName);
        }
      } else if (line.includes('[WORKTREE_MERGE_FAILED]')) {
        const parts = line.split('[WORKTREE_MERGE_FAILED]')[1]?.trim().split(' ') || [];
        const branchName = parts[0];
        const error = parts.slice(1).join(' ');
        if (branchName) {
          debug('Merge failed signal detected:', { id, branchName, error });
          this.emit('mergeFailed', id, branchName, error);
        }
      } else if (line.includes('[WORKTREE_MERGED]')) {
        const branchName = line.split('[WORKTREE_MERGED]')[1]?.trim();
        if (branchName) {
          debug('Merge completed signal detected:', { id, branchName });
          this.emit('mergeCompleted', id, branchName);
        }
      }
    }
  }

  private processMessage(id: string, message: SDKMessage): void {
    debug('Received message:', { type: message.type, subtype: (message as any).subtype });

    const entry = this.queries.get(id);

    switch (message.type) {
      case 'system':
        if (message.subtype === 'init' && message.session_id) {
          debug('Session initialized:', message.session_id);
          if (entry) {
            entry.sessionId = message.session_id;
          }
          this.emit('sessionId', id, message.session_id);
        }
        break;

      case 'user':
        if (message.parent_tool_use_id && message.tool_use_result) {
          if (entry && entry.activeSubagents.has(message.parent_tool_use_id)) {
            const subagentInfo = entry.activeSubagents.get(message.parent_tool_use_id)!;
            entry.activeSubagents.delete(message.parent_tool_use_id);
            this.emit('output', id, `[←] Subagent completed: ${subagentInfo.subagentType}`, false);
            debug('Subagent completed:', {
              agentID: subagentInfo.agentID,
              subagentType: subagentInfo.subagentType,
              parent_tool_use_id: message.parent_tool_use_id
            });
          }
        }

        if (message.tool_use_result) {
          let resultStr: string;
          if (typeof message.tool_use_result === 'string') {
            resultStr = message.tool_use_result;
          } else if (typeof message.tool_use_result === 'object' && message.tool_use_result !== null) {
            const result = message.tool_use_result as Record<string, unknown>;
            resultStr = typeof result.stdout === 'string' ? result.stdout : '';
          } else {
            resultStr = '';
          }

          if (resultStr) {
            this.checkForWorktreeSignals(id, resultStr);
          }
        }
        break;

      case 'assistant':
        debug('Assistant message content types:', message.message.content.map((c: any) => c.type));

        const isSubagent = message.parent_tool_use_id !== null;
        let subagentInfo: { subagentId?: string; subagentType?: string } = {};

        if (isSubagent && entry) {
          debug('Message from subagent, parent_tool_use_id:', message.parent_tool_use_id);
          const parentToolUseId = message.parent_tool_use_id;
          subagentInfo.subagentId = parentToolUseId || undefined;

          if (parentToolUseId) {
            const subagent = entry.activeSubagents.get(parentToolUseId);
            if (subagent) {
              subagentInfo.subagentType = subagent.subagentType;
            }
          }
        }

        const wasThinking = this.thinkingStates.get(id) || false;
        let hasThinking = false;
        let hasNonThinking = false;

        for (const content of message.message.content) {
          if (content.type === 'thinking') {
            hasThinking = true;
          } else if (content.type === 'text' || content.type === 'tool_use') {
            hasNonThinking = true;
          }
        }

        if (hasThinking && !wasThinking) {
          this.emit('output', id, '[•] thinking...', isSubagent, subagentInfo.subagentId, subagentInfo.subagentType);
          this.thinkingStates.set(id, true);
        }

        for (const content of message.message.content) {
          if (content.type === 'text') {
            const lines = content.text.split('\n');
            for (const line of lines) {
              if (line.trim()) {
                this.emit('output', id, line, isSubagent, subagentInfo.subagentId, subagentInfo.subagentType);
              }
            }
            this.checkForWorktreeSignals(id, content.text);
          } else if (content.type === 'tool_use') {
            debug('Tool use in assistant message:', { name: content.name, id: content.id, isSubagent });

            if (!isSubagent || (content.name !== 'Task' && PERMISSION_REQUIRED_TOOLS.includes(content.name))) {
              this.emit('output', id, `[>] ${content.name}`, isSubagent, subagentInfo.subagentId, subagentInfo.subagentType);
            }
          }
        }

        if (wasThinking && !hasThinking && hasNonThinking) {
          this.thinkingStates.set(id, false);
        }
        break;

      case 'result':
        debug('Result message:', { subtype: message.subtype, error: (message as any).error });
        const resultParentToolUseId = (message as any).parent_tool_use_id;
        const resultIsSubagent = resultParentToolUseId !== null && resultParentToolUseId !== undefined;
        let resultSubagentInfo: { subagentId?: string; subagentType?: string } = {};

        if (resultIsSubagent && entry) {
          resultSubagentInfo.subagentId = resultParentToolUseId;

          if (resultParentToolUseId) {
            const subagent = entry.activeSubagents.get(resultParentToolUseId);
            if (subagent) {
              resultSubagentInfo.subagentType = subagent.subagentType;
              entry.activeSubagents.delete(resultParentToolUseId);
            }
          }
        }

        if (message.subtype === 'success') {
          this.emit('output', id, '[+] Task completed successfully', resultIsSubagent, resultSubagentInfo.subagentId, resultSubagentInfo.subagentType);
        } else {
          this.emit('output', id, `[x] Error: ${(message as any).error || message.subtype}`, resultIsSubagent, resultSubagentInfo.subagentId, resultSubagentInfo.subagentType);
        }
        break;

      default:
        debug('Unknown message type:', message.type, message);
    }
  }

  kill(id: string): boolean {
    const entry = this.queries.get(id);
    if (entry) {
      entry.alive = false;
      entry.abort.abort();
      this.cleanup(id);
      return true;
    }
    return false;
  }

  private cleanup(id: string): void {
    this.queries.delete(id);
    this.agentStates.delete(id);
    this.thinkingStates.delete(id);
  }

  isRunning(id: string): boolean {
    return this.queries.has(id);
  }

  isAlive(id: string): boolean {
    const entry = this.queries.get(id);
    return entry?.alive ?? false;
  }

  isIterating(id: string): boolean {
    const entry = this.queries.get(id);
    return entry?.iterating ?? false;
  }

  close(id: string): void {
    this.cleanup(id);
  }

  setPermissionMode(id: string, permissionMode: PermissionMode): void {
    const state = this.agentStates.get(id);
    if (state) {
      state.permissionMode = permissionMode;
      this.agentStates.set(id, state);
    }
  }

  resolvePermission(id: string, allowed: boolean): void {
    this.emit('permissionResolved', id, allowed);
  }

  async sendFollowUpMessage(id: string, message: string): Promise<void> {
    const entry = this.queries.get(id);

    if (!entry) {
      throw new Error(`Agent ${id} not found`);
    }

    if (!entry.alive) {
      throw new Error('Cannot send follow-up message: Agent has been terminated');
    }

    if (entry.iterating) {
      throw new Error('Cannot send follow-up message: Agent is still processing');
    }

    if (!entry.sessionId) {
      throw new Error('Cannot send follow-up message: No session ID available');
    }

    const state = this.agentStates.get(id);
    if (!state) {
      throw new Error(`Agent state ${id} not found`);
    }

    this.emit('output', id, '', false);
    this.emit('output', id, `[>] User: ${message}`, false);
    this.emit('output', id, '', false);

    const newAbortController = new AbortController();
    const queryOptions: any = {
      cwd: entry.workDir,
      abortController: newAbortController,
      permissionMode: state.permissionMode,
      resume: entry.sessionId,
      canUseTool: this.createCanUseTool(id),
      settingSources: ['project'],
      maxThinkingTokens: 16384,
      mcpServers: {
        'question-handler': this.createQuestionMcpServer(id)
      }
    };

    if (entry.systemPromptAppend) {
      queryOptions.systemPrompt = {
        type: 'preset',
        preset: 'claude_code',
        append: entry.systemPromptAppend
      };
    }

    try {
      debug('Spawning resumed query for follow-up, session:', entry.sessionId);

      const newQuery = query({
        prompt: message,
        options: queryOptions,
      });

      entry.query = newQuery;
      entry.abort = newAbortController;
      entry.iterating = false;

      this.iterateQuery(id, newQuery);
    } catch (error: any) {
      debug('Error sending follow-up message:', error);
      this.emit('output', id, `[x] Failed to send message: ${error.message}`, false);
      this.emit('error', id, error.message);
      throw error;
    }
  }

  static async getAvailableCommands(cwd?: string): Promise<SlashCommand[]> {
    if (this.commandsCache) {
      return this.commandsCache;
    }

    const abortController = new AbortController();
    const tempQuery = query({
      prompt: '',
      options: {
        cwd: cwd || process.cwd(),
        abortController,
      },
    });

    try {
      this.commandsCache = await tempQuery.supportedCommands();
      abortController.abort();
      return this.commandsCache;
    } catch (error) {
      debug('Error fetching slash commands:', error);
      abortController.abort();
      return [];
    }
  }
}
