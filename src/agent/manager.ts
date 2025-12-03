import { EventEmitter } from 'events';
import { query, type Query, type SDKMessage, type SlashCommand } from '@anthropic-ai/claude-agent-sdk';
import type { AgentType } from '../types';
import { debug } from '../utils/logger';

export class AgentSDKManager extends EventEmitter {
  private queries: Map<string, { query: Query; abort: AbortController }> = new Map();
  private agentStates: Map<string, { agentType: AgentType; autoAcceptPermissions: boolean; hasTitle: boolean }> = new Map();
  private static commandsCache: SlashCommand[] | null = null;

  async spawn(id: string, prompt: string, workDir: string, agentType: AgentType, autoAcceptPermissions: boolean): Promise<void> {
    const abortController = new AbortController();
    this.agentStates.set(id, { agentType, autoAcceptPermissions, hasTitle: false });

    const autoAllowTools = ['Read', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'Task', 'TodoRead', 'TodoWrite'];
    const permissionRequiredTools = ['Write', 'Edit', 'MultiEdit', 'Bash', 'NotebookEdit', 'KillBash'];

    const q = query({
      prompt,
      options: {
        cwd: workDir,
        abortController,
        permissionMode: 'default',
        canUseTool: async (toolName: string, toolInput: Record<string, unknown>, options: { signal: AbortSignal }) => {
          const currentState = this.agentStates.get(id);
          debug('canUseTool called:', { toolName, toolInput, currentState });

          if (autoAllowTools.includes(toolName)) {
            debug('Auto-allowing tool:', toolName);
            return { behavior: 'allow', updatedInput: toolInput as Record<string, unknown> };
          }

          if (permissionRequiredTools.includes(toolName)) {
            if (currentState?.agentType === 'auto-accept' || currentState?.autoAcceptPermissions) {
              debug('Auto-accepting permission for tool:', toolName);
              this.emit('output', id, `✅ Auto-allowed: ${toolName}`);
              return { behavior: 'allow', updatedInput: toolInput as Record<string, unknown> };
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
              return { behavior: 'allow', updatedInput: toolInput as Record<string, unknown> };
            } else {
              return { behavior: 'deny', message: 'User denied permission' };
            }
          }

          debug('Allowing other tool by default:', toolName);
          return { behavior: 'allow', updatedInput: toolInput };
        },
        settingSources: ['project'],
      },
    });

    this.queries.set(id, { query: q, abort: abortController });

    try {
      debug('Starting query iteration for:', id);
      for await (const message of q) {
        this.processMessage(id, message);
      }
      debug('Query completed normally for:', id);
      this.emit('done', id, 0);
    } catch (error: any) {
      debug('Query error:', { id, name: error.name, message: error.message, stack: error.stack });
      if (error.name === 'AbortError') {
        this.emit('done', id, 0);
      } else {
        this.emit('error', id, error.message);
      }
    } finally {
      this.queries.delete(id);
      this.agentStates.delete(id);
    }
  }

  private processMessage(id: string, message: SDKMessage): void {
    debug('Received message:', { type: message.type, subtype: (message as any).subtype });

    switch (message.type) {
      case 'system':
        if (message.subtype === 'init' && message.session_id) {
          debug('Session initialized:', message.session_id);
          this.emit('sessionId', id, message.session_id);
        }
        break;

      case 'assistant':
        debug('Assistant message content types:', message.message.content.map((c: any) => c.type));

        const state = this.agentStates.get(id);
        if (state && !state.hasTitle) {
          for (const content of message.message.content) {
            if (content.type === 'text' && content.text.trim()) {
              const text = content.text.trim();
              const firstLine = text.split('\n')[0];
              const title = firstLine.length > 60 ? firstLine.slice(0, 57) + '...' : firstLine;

              if (title.length > 0) {
                debug('Extracted title from first assistant response:', title);
                this.emit('titleUpdate', id, title);
                state.hasTitle = true;
                this.agentStates.set(id, state);
                break;
              }
            }
          }
        }

        for (const content of message.message.content) {
          if (content.type === 'text') {
            const lines = content.text.split('\n');
            for (const line of lines) {
              if (line.trim()) {
                this.emit('output', id, line);
              }
            }
          } else if (content.type === 'tool_use') {
            debug('Tool use in assistant message:', { name: content.name, id: content.id });
            this.emit('output', id, `[>] Using tool: ${content.name}`);
          } else if (content.type === 'tool_result') {
            debug('Tool result:', { tool_use_id: (content as any).tool_use_id, is_error: (content as any).is_error });
            if ((content as any).is_error) {
              this.emit('output', id, `[x] Tool error: ${(content as any).content || 'Unknown error'}`);
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
      entry.abort.abort();
      this.queries.delete(id);
      this.agentStates.delete(id);
      return true;
    }
    return false;
  }

  isRunning(id: string): boolean {
    return this.queries.has(id);
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
