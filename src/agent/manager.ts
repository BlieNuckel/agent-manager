import { EventEmitter } from 'events';
import path from 'path';
import { query, type Query, type SDKMessage, type SlashCommand, createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { homedir } from 'os';
import { resolve, normalize } from 'path';
import type { AgentType, Question, PermissionMode, ImageAttachment, TokenTracking, CustomAgentType, AgentToolConfig, TodoItem } from '../types';
import { debug } from '../utils/logger';
import { generateTitle } from '../utils/titleGenerator';
import type { WorktreeContext, WorkflowContext } from './systemPromptTemplates';
import { buildSystemPrompt } from './systemPromptTemplates';
import { isToolAllowed, buildAgentSystemPrompt } from '../utils/agentTypes';
import { createArtifactMcpServer } from '../mcp/artifactServer';

const PERMISSION_REQUIRED_TOOLS = ['Write', 'Edit', 'MultiEdit', 'Bash', 'NotebookEdit', 'KillBash'];
export const AUTO_ACCEPT_EDIT_TOOLS = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit'];

function convertModelToSdkFormat(model: 'opus' | 'sonnet' | 'haiku'): string {
  const modelMap = {
    'opus': 'claude-opus-4-20250514',
    'sonnet': 'claude-sonnet-4-5-20250929',
    'haiku': 'claude-haiku-4-20250514'
  };
  return modelMap[model];
}

interface AgentDefinition {
  description: string;
  tools?: string[];
  disallowedTools?: string[];
  prompt: string;
  model?: 'sonnet' | 'opus' | 'haiku' | 'inherit';
}

function convertToSdkAgentDefinitions(
  agentTypes: CustomAgentType[]
): Record<string, AgentDefinition> {
  const definitions: Record<string, AgentDefinition> = {};

  for (const agent of agentTypes) {
    definitions[agent.id] = {
      description: agent.description,
      prompt: agent.systemPrompt,
      model: agent.model || 'inherit',
      tools: agent.tools?.allow,
      disallowedTools: agent.tools?.deny
    };
  }

  return definitions;
}


interface ActiveSubagentData {
  agentID: string;
  subagentType: string;
  startTime: number;
  inputTokens: number;
  outputTokens: number;
  toolCallCount: number;
}

interface QueryEntry {
  query: Query;
  abort: AbortController;
  alive: boolean;
  iterating: boolean;
  sessionId?: string;
  workDir: string;
  systemPromptAppend?: string;
  activeSubagents: Map<string, ActiveSubagentData>;
}

export interface ToolStatusUpdate {
  toolCallId: string;
  status: 'success' | 'error';
  prefix: '[✓]' | '[×]';
  error?: string;
}

export class AgentSDKManager extends EventEmitter {
  private queries: Map<string, QueryEntry> = new Map();
  private agentStates: Map<string, { agentType: AgentType; hasTitle: boolean; permissionMode: PermissionMode; toolConfig?: AgentToolConfig }> = new Map();
  private thinkingStates: Map<string, boolean> = new Map();
  private tokenTracking: Map<string, TokenTracking> = new Map();
  private pendingTools: Map<string, { agentId: string; timestamp: number }> = new Map();
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

  private formatToolInput(toolName: string, input: Record<string, unknown>): string {
    const maxLength = 60;

    const truncate = (str: string) => {
      if (str.length > maxLength) {
        return str.substring(0, maxLength) + '...';
      }
      return str;
    };

    switch (toolName) {
      case 'Bash':
        return truncate(String(input.command || ''));
      case 'Read':
        return truncate(String(input.file_path || ''));
      case 'Write':
      case 'Edit':
      case 'MultiEdit':
        return truncate(String(input.file_path || ''));
      case 'Glob':
        return truncate(String(input.pattern || ''));
      case 'Grep':
        return truncate(String(input.pattern || ''));
      case 'WebFetch':
        return truncate(String(input.url || ''));
      case 'WebSearch':
        return truncate(String(input.query || ''));
      case 'Task':
        return truncate(String(input.description || input.prompt || ''));
      default: {
        const firstKey = Object.keys(input)[0];
        if (firstKey) {
          const value = input[firstKey];
          if (typeof value === 'string') {
            return truncate(value);
          }
        }
        return '';
      }
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
            subagentType: detectedSubagentType,
            startTime: Date.now(),
            inputTokens: 0,
            outputTokens: 0,
            toolCallCount: 0,
          });
          this.emit('output', id, `[→] Starting subagent: ${detectedSubagentType}`, false, options.toolUseID, detectedSubagentType, Date.now());
          debug('Subagent started:', { agentID: options.agentID, subagentType: detectedSubagentType, toolUseID: options.toolUseID });
        }
      }

      if (isSubagentTool && entry) {
        for (const [toolUseId, subagentData] of entry.activeSubagents) {
          if (subagentData.agentID === options.agentID) {
            subagentData.toolCallCount++;
            break;
          }
        }
      }

      if (toolName === 'TodoWrite') {
        debug('Intercepting TodoWrite tool:', { agentId: id, todos: toolInput.todos });
        const todos = toolInput.todos as any[];
        if (todos && Array.isArray(todos)) {
          this.emit('todosUpdate', id, todos);
        }
        this.emit('output', id, `[+] Auto-allowed: ${toolName}`, isSubagentTool, options.agentID, subagentType, Date.now());
        return { behavior: 'allow' as const, updatedInput: toolInput };
      }

      if (agentState?.permissionMode === 'acceptEdits' && AUTO_ACCEPT_EDIT_TOOLS.includes(toolName)) {
        debug('Auto-accepting edit permission for tool:', toolName);
        this.emit('output', id, `[+] Auto-allowed: ${toolName}`, isSubagentTool, options.agentID, subagentType, Date.now());
        return { behavior: 'allow' as const, updatedInput: toolInput };
      }

      if (agentState?.toolConfig) {
        const bashCommand = toolName === 'Bash' ? String(toolInput.command || '') : undefined;
        if (!isToolAllowed(toolName, agentState.toolConfig, bashCommand)) {
          debug('Tool denied by agent type config:', { toolName, bashCommand });
          this.emit('output', id, `[-] Denied by agent type: ${toolName}`, isSubagentTool, options.agentID, subagentType, Date.now());
          return { behavior: 'deny' as const, message: 'Tool not allowed for this agent type' };
        }
      }

      debug('Requesting permission for tool:', toolName);
      this.emit('output', id, `[!] Permission required for: ${toolName}`, isSubagentTool, options.agentID, subagentType, Date.now());

      const result = await new Promise<{ allowed: boolean; suggestions?: unknown[] }>((resolvePermission) => {
        this.emit('permissionRequest', id, {
          toolName,
          toolInput,
          suggestions: options.suggestions,
          resolve: resolvePermission
        });
      });

      debug('Permission result:', { toolName, allowed: result.allowed, hasSuggestions: !!result.suggestions });
      this.emit('output', id, result.allowed ? `[+] Allowed: ${toolName}` : `[-] Denied: ${toolName}`, isSubagentTool, options.agentID, subagentType, Date.now());

      if (result.allowed) {
        const response: { behavior: 'allow'; updatedInput: Record<string, unknown>; updatedPermissions?: unknown[] } = {
          behavior: 'allow' as const,
          updatedInput: toolInput
        };
        if (result.suggestions && result.suggestions.length > 0) {
          response.updatedPermissions = result.suggestions;
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

            this.emit('output', id, '[?] Asking user for input...', false, undefined, undefined, Date.now());

            const answers = await new Promise<Record<string, string | string[]>>((resolveQuestion) => {
              this.emit('questionRequest', id, {
                questions: args.questions as Question[],
                resolve: resolveQuestion
              });
            });

            debug('Question answers received:', { agentId: id, answers });
            this.emit('output', id, '[+] User provided answers', false, undefined, undefined, Date.now());

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

  async spawn(id: string, prompt: string, workDir: string, agentType: AgentType, worktreeContext?: WorktreeContext, title?: string, images?: ImageAttachment[], customAgentType?: CustomAgentType, workflowContext?: WorkflowContext, allAgentTypes?: CustomAgentType[]): Promise<void> {
    const abortController = new AbortController();
    const permissionMode = this.getPermissionModeForAgentType(agentType);

    let toolConfig = customAgentType?.tools;
    if (toolConfig) {
      const alwaysAllowedTools = [
        'mcp__artifacts__Read',
        'mcp__artifacts__Write',
        'mcp__question-handler__AskQuestion',
        'EnterPlanMode'
      ];

      const modifiedConfig = { ...toolConfig };

      if (modifiedConfig.allow) {
        modifiedConfig.allow = [
          ...modifiedConfig.allow,
          ...alwaysAllowedTools
        ];
      }

      if (modifiedConfig.deny) {
        modifiedConfig.deny = modifiedConfig.deny.filter(
          t => !alwaysAllowedTools.includes(t)
        );
      }

      toolConfig = modifiedConfig;
    }

    this.agentStates.set(id, { agentType, hasTitle: true, permissionMode, toolConfig });

    let systemPromptAppend = buildSystemPrompt(worktreeContext, workflowContext);

    if (customAgentType) {
      const customSystemPrompt = buildAgentSystemPrompt(customAgentType, {
        workingDirectory: worktreeContext?.worktreePath || workDir,
        agentName: title
      });
      systemPromptAppend = systemPromptAppend
        ? `${systemPromptAppend}\n\n# Agent Type Instructions\n\n${customSystemPrompt}`
        : `# Agent Type Instructions\n\n${customSystemPrompt}`;
    }

    const effectiveCwd = worktreeContext?.worktreePath || workDir;

    let promptContent: string | AsyncIterable<any>;
    if (images && images.length > 0) {
      const contentBlocks: any[] = [
        { type: 'text', text: prompt }
      ];

      for (const img of images) {
        contentBlocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: img.mediaType,
            data: img.base64
          }
        });
      }

      async function* messageGenerator() {
        yield {
          type: 'user',
          session_id: '',
          message: {
            role: 'user',
            content: contentBlocks
          },
          parent_tool_use_id: null
        };
      }

      promptContent = messageGenerator();
      debug('Including', images.length, 'image(s) in prompt as message stream');
    } else {
      promptContent = prompt;
    }

    const queryOptions: any = {
      cwd: effectiveCwd,
      abortController,
      permissionMode,
      canUseTool: this.createCanUseTool(id),
      settingSources: ['user', 'project', 'local'],
      maxThinkingTokens: 16384,
      mcpServers: {
        'question-handler': this.createQuestionMcpServer(id),
        'artifacts': createArtifactMcpServer()
      },
      allowedTools: ['mcp__artifacts__Read', 'mcp__artifacts__Write', 'mcp__question-handler__AskQuestion']
    };

    if (worktreeContext?.enabled && worktreeContext.worktreePath) {
      queryOptions.additionalDirectories = [
        worktreeContext.gitRoot,
        path.dirname(worktreeContext.worktreePath)
      ];
      debug('Adding worktree directories to trusted paths:', queryOptions.additionalDirectories);
    }

    if (systemPromptAppend) {
      queryOptions.systemPrompt = {
        type: 'preset',
        preset: 'claude_code',
        append: systemPromptAppend
      };
      debug('Injecting systemPrompt with instructions');
    }

    if (customAgentType?.model) {
      queryOptions.model = convertModelToSdkFormat(customAgentType.model);
      debug('Setting model for agent:', queryOptions.model);
    }

    if (allAgentTypes) {
      const subagents = allAgentTypes.filter(at => at.isSubagent);
      if (subagents.length > 0) {
        queryOptions.agents = convertToSdkAgentDefinitions(subagents);
        debug('Registered subagents:', Object.keys(queryOptions.agents));
      }
    }

    const q = query({
      prompt: promptContent,
      options: queryOptions,
    });

    this.queries.set(id, {
      query: q,
      abort: abortController,
      alive: true,
      iterating: false,
      workDir: effectiveCwd,
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
            const subagentData = entry.activeSubagents.get(message.parent_tool_use_id)!;
            const endTime = Date.now();
            entry.activeSubagents.delete(message.parent_tool_use_id);

            this.emit('subagentStats', id, {
              subagentId: message.parent_tool_use_id,
              subagentType: subagentData.subagentType,
              startTime: subagentData.startTime,
              endTime,
              inputTokens: subagentData.inputTokens,
              outputTokens: subagentData.outputTokens,
              toolCallCount: subagentData.toolCallCount,
            });

            this.emit('output', id, `[←] Subagent completed: ${subagentData.subagentType}`, false, message.parent_tool_use_id, subagentData.subagentType, Date.now());
            debug('Subagent completed:', {
              agentID: subagentData.agentID,
              subagentType: subagentData.subagentType,
              parent_tool_use_id: message.parent_tool_use_id,
              duration: endTime - subagentData.startTime,
              toolCallCount: subagentData.toolCallCount,
            });
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

        for (const [toolCallId, toolInfo] of Array.from(this.pendingTools.entries())) {
          if (toolInfo.agentId === id) {
            this.emit('updateToolStatus', id, {
              toolCallId,
              status: 'success',
              prefix: '[✓]',
            });
            this.pendingTools.delete(toolCallId);
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
          this.thinkingStates.set(id, true);
        }

        for (const content of message.message.content) {
          if (content.type === 'text') {
            const lines = content.text.split('\n');
            for (const line of lines) {
              if (line.trim()) {
                this.emit('output', id, line, isSubagent, subagentInfo.subagentId, subagentInfo.subagentType, Date.now());
              }
            }
          } else if (content.type === 'tool_use') {
            debug('Tool use in assistant message:', { name: content.name, id: content.id, isSubagent });

            if (!isSubagent || (content.name !== 'Task' && PERMISSION_REQUIRED_TOOLS.includes(content.name))) {
              const inputSummary = this.formatToolInput(content.name, content.input as Record<string, unknown>);
              const toolCallId = content.id;
              const outputLine = {
                text: `[>] ${content.name}(${inputSummary})`,
                toolCallId: toolCallId,
                toolStatus: 'pending' as const,
                isSubagent,
                subagentId: isSubagent ? subagentInfo.subagentId : undefined,
                subagentType: isSubagent ? subagentInfo.subagentType : undefined,
                timestamp: Date.now(),
              };

              this.emit('output', id, outputLine);

              this.pendingTools.set(toolCallId, {
                agentId: id,
                timestamp: Date.now()
              });
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
          this.emit('output', id, '[+] Task completed successfully', resultIsSubagent, resultSubagentInfo.subagentId, resultSubagentInfo.subagentType, Date.now());

          if (!resultIsSubagent && message.modelUsage) {
            const modelUsageValues = Object.values(message.modelUsage);
            if (modelUsageValues.length > 0) {
              const modelUsage = modelUsageValues[0];

              const tracking = this.tokenTracking.get(id) || {
                cumulativeInputTokens: 0,
                cumulativeOutputTokens: 0,
                cacheReadInputTokens: 0,
                cacheCreationInputTokens: 0,
                contextWindow: 200000,
                lastUpdated: new Date()
              };

              tracking.cumulativeInputTokens += modelUsage.inputTokens;
              tracking.cumulativeOutputTokens += modelUsage.outputTokens;
              tracking.cacheReadInputTokens += modelUsage.cacheReadInputTokens;
              tracking.cacheCreationInputTokens += modelUsage.cacheCreationInputTokens;
              tracking.contextWindow = modelUsage.contextWindow;
              tracking.lastUpdated = new Date();

              this.tokenTracking.set(id, tracking);
              this.emit('tokenUsage', id, tracking);

              debug('Token usage updated:', {
                id,
                inputTokens: tracking.cumulativeInputTokens,
                outputTokens: tracking.cumulativeOutputTokens,
                contextWindow: tracking.contextWindow
              });
            }
          }
        } else {
          this.emit('output', id, `[x] Error: ${(message as any).error || message.subtype}`, resultIsSubagent, resultSubagentInfo.subagentId, resultSubagentInfo.subagentType, Date.now());
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
    this.tokenTracking.delete(id);
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

  async sendFollowUpMessage(id: string, message: string, images?: ImageAttachment[]): Promise<void> {
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

    this.emit('output', id, '', false, undefined, undefined, Date.now());
    this.emit('output', id, `[>] User: ${message}`, false, undefined, undefined, Date.now());

    if (images && images.length > 0) {
      for (const img of images) {
        this.emit('output', id, `     <image:${img.id}.${img.mediaType.split('/')[1]}>`, false, undefined, undefined, Date.now());
      }
    }

    this.emit('output', id, '', false, undefined, undefined, Date.now());

    let messageContent: string | AsyncIterable<any>;
    if (images && images.length > 0) {
      const contentBlocks: any[] = [{ type: 'text', text: message }];

      for (const img of images) {
        contentBlocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: img.mediaType,
            data: img.base64
          }
        });
      }

      async function* messageGenerator() {
        yield {
          type: 'user',
          session_id: '',
          message: {
            role: 'user',
            content: contentBlocks
          },
          parent_tool_use_id: null
        };
      }

      messageContent = messageGenerator();
      debug('Including', images.length, 'image(s) in follow-up message as stream');
    } else {
      messageContent = message;
    }

    const newAbortController = new AbortController();
    const queryOptions: any = {
      cwd: entry.workDir,
      abortController: newAbortController,
      permissionMode: state.permissionMode,
      resume: entry.sessionId,
      canUseTool: this.createCanUseTool(id),
      settingSources: ['user', 'project', 'local'],
      maxThinkingTokens: 16384,
      mcpServers: {
        'question-handler': this.createQuestionMcpServer(id),
        'artifacts': createArtifactMcpServer()
      },
      allowedTools: ['mcp__artifacts__Read', 'mcp__artifacts__Write', 'mcp__question-handler__AskQuestion']
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
        prompt: messageContent,
        options: queryOptions,
      });

      entry.query = newQuery;
      entry.abort = newAbortController;
      entry.iterating = false;

      this.iterateQuery(id, newQuery);
    } catch (error: any) {
      debug('Error sending follow-up message:', error);
      this.emit('output', id, `[x] Failed to send message: ${error.message}`, false, undefined, undefined, Date.now());
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
