import { EventEmitter } from 'events';
import { query, type Query, type SDKMessage, type SlashCommand } from '@anthropic-ai/claude-agent-sdk';
import type { AgentType } from '../types';
import { debug } from '../utils/logger';
import { generateTitle } from '../utils/titleGenerator';
import type { WorktreeContext } from './systemPromptTemplates';
import { buildSystemPrompt, buildWorktreePromptPrefix } from './systemPromptTemplates';

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

const AUTO_ALLOW_TOOLS = ['Read', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'Task', 'TodoRead', 'TodoWrite'];
const PERMISSION_REQUIRED_TOOLS = ['Write', 'Edit', 'MultiEdit', 'Bash', 'NotebookEdit', 'KillBash'];

export class AgentSDKManager extends EventEmitter {
  private queries: Map<string, QueryEntry> = new Map();
  private agentStates: Map<string, { agentType: AgentType; autoAcceptPermissions: boolean; hasTitle: boolean }> = new Map();
  private static commandsCache: SlashCommand[] | null = null;

  private createCanUseTool(id: string) {
    return async (toolName: string, toolInput: Record<string, unknown>, options: { signal: AbortSignal; agentID?: string; toolUseID: string }) => {
      const currentState = this.agentStates.get(id);
      const entry = this.queries.get(id);
      debug('canUseTool called:', { toolName, toolInput, currentState, agentID: options.agentID, toolUseID: options.toolUseID });

      if (options.agentID && toolName === 'Task' && entry) {
        if (!entry.activeSubagents.has(options.toolUseID)) {
          const subagentType = (toolInput as any).subagent_type || 'unknown';
          entry.activeSubagents.set(options.toolUseID, {
            agentID: options.agentID,
            subagentType
          });
          this.emit('output', id, `[→] Starting subagent: ${subagentType}`);
          debug('Subagent started:', { agentID: options.agentID, subagentType, toolUseID: options.toolUseID });
        }
      }

      if (AUTO_ALLOW_TOOLS.includes(toolName)) {
        debug('Auto-allowing tool:', toolName);
        return { behavior: 'allow' as const, updatedInput: toolInput as Record<string, unknown> };
      }

      if (PERMISSION_REQUIRED_TOOLS.includes(toolName)) {
        if (currentState?.agentType === 'auto-accept' || currentState?.autoAcceptPermissions) {
          debug('Auto-accepting permission for tool:', toolName);
          this.emit('output', id, `✅ Auto-allowed: ${toolName}`);
          return { behavior: 'allow' as const, updatedInput: toolInput as Record<string, unknown> };
        }

        debug('Requesting permission for tool:', toolName);
        this.emit('output', id, `[!] Permission required for: ${toolName}`);

        const result = await new Promise<boolean>((resolvePermission) => {
          this.emit('permissionRequest', id, {
            toolName,
            toolInput,
            resolve: resolvePermission
          });
        });

        debug('Permission result:', { toolName, allowed: result });
        this.emit('output', id, result ? `[+] Allowed: ${toolName}` : `[-] Denied: ${toolName}`);

        if (result) {
          return { behavior: 'allow' as const, updatedInput: toolInput as Record<string, unknown> };
        } else {
          return { behavior: 'deny' as const, message: 'User denied permission' };
        }
      }

      debug('Allowing other tool by default:', toolName);
      return { behavior: 'allow' as const, updatedInput: toolInput };
    };
  }

  async spawn(id: string, prompt: string, workDir: string, agentType: AgentType, autoAcceptPermissions: boolean, worktreeContext?: WorktreeContext, title?: string): Promise<void> {
    const abortController = new AbortController();
    this.agentStates.set(id, { agentType, autoAcceptPermissions, hasTitle: true });

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
      permissionMode: 'default',
      canUseTool: this.createCanUseTool(id),
      settingSources: ['project'],
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

    switch (message.type) {
      case 'system':
        if (message.subtype === 'init' && message.session_id) {
          debug('Session initialized:', message.session_id);
          const entry = this.queries.get(id);
          if (entry) {
            entry.sessionId = message.session_id;
          }
          this.emit('sessionId', id, message.session_id);
        }
        break;

      case 'user':
        if (message.parent_tool_use_id && message.tool_use_result) {
          const entry = this.queries.get(id);
          if (entry && entry.activeSubagents.has(message.parent_tool_use_id)) {
            const subagentInfo = entry.activeSubagents.get(message.parent_tool_use_id)!;
            entry.activeSubagents.delete(message.parent_tool_use_id);
            this.emit('output', id, `[←] Subagent completed: ${subagentInfo.subagentType}`);
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
        if (isSubagent) {
          debug('Message from subagent, parent_tool_use_id:', message.parent_tool_use_id);
        }

        for (const content of message.message.content) {
          if (content.type === 'text') {
            const lines = content.text.split('\n');
            for (const line of lines) {
              if (line.trim()) {
                this.emit('output', id, line);
              }
            }
            this.checkForWorktreeSignals(id, content.text);
          } else if (content.type === 'tool_use') {
            debug('Tool use in assistant message:', { name: content.name, id: content.id, isSubagent });

            if (!isSubagent || (content.name !== 'Task' && PERMISSION_REQUIRED_TOOLS.includes(content.name))) {
              this.emit('output', id, `[>] Using tool: ${content.name}`);
            }
          }
        }
        break;

      case 'result':
        debug('Result message:', { subtype: message.subtype, error: (message as any).error });
        if (message.subtype === 'success') {
          this.emit('output', id, '[+] Task completed successfully');
        } else {
          this.emit('output', id, `[x] Error: ${(message as any).error || message.subtype}`);
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

  setAutoAccept(id: string, autoAccept: boolean): void {
    const state = this.agentStates.get(id);
    if (state) {
      state.autoAcceptPermissions = autoAccept;
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

    this.emit('output', id, '');
    this.emit('output', id, `[>] User: ${message}`);
    this.emit('output', id, '');

    const newAbortController = new AbortController();
    const queryOptions: any = {
      cwd: entry.workDir,
      abortController: newAbortController,
      permissionMode: 'default',
      resume: entry.sessionId,
      canUseTool: this.createCanUseTool(id),
      settingSources: ['project'],
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
      this.emit('output', id, `[x] Failed to send message: ${error.message}`);
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
