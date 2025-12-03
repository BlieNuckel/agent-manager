#!/usr/bin/env node --import tsx
// Agent Manager v2 - Using Claude Agent SDK
// Run: node --import tsx agent-manager.tsx

import React, { useState, useEffect, useReducer } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import Spinner from 'ink-spinner';
import { query, type Query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { execSync } from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ============ Debug Logger ============
const DEBUG_LOG = path.join(os.homedir(), '.agent-manager', 'debug.log');

function debug(...args: unknown[]) {
  const timestamp = new Date().toISOString();
  const message = args.map(a =>
    typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
  ).join(' ');
  fs.appendFileSync(DEBUG_LOG, `[${timestamp}] ${message}\n`);
}

// Clear log on startup
function clearDebugLog() {
  const dir = path.dirname(DEBUG_LOG);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  try {
    fs.writeFileSync(DEBUG_LOG, `=== Agent Manager Debug Log ===\nStarted: ${new Date().toISOString()}\n\n`);
  } catch { }
}

clearDebugLog();

// ============ Types ============
type Status = 'working' | 'waiting' | 'done' | 'error';
type Mode = 'normal' | 'input' | 'detail';
type InputStep = 'title' | 'prompt' | 'worktree' | 'worktreeName';

interface PermissionRequest {
  toolName: string;
  toolInput: unknown;
  resolve: (allowed: boolean) => void;
}

interface Agent {
  id: string;
  title: string;
  status: Status;
  prompt: string;
  output: string[];
  createdAt: Date;
  updatedAt: Date;
  workDir: string;
  worktreeName?: string;
  sessionId?: string;
  pendingPermission?: PermissionRequest;
}

interface HistoryEntry {
  id: string;
  title: string;
  prompt: string;
  date: Date;
  workDir: string;
}

type Action =
  | { type: 'ADD_AGENT'; agent: Agent }
  | { type: 'UPDATE_AGENT'; id: string; updates: Partial<Agent> }
  | { type: 'REMOVE_AGENT'; id: string }
  | { type: 'APPEND_OUTPUT'; id: string; line: string }
  | { type: 'SET_PERMISSION'; id: string; permission: PermissionRequest | undefined }
  | { type: 'REMOVE_HISTORY'; index: number };

interface State {
  agents: Agent[];
  history: HistoryEntry[];
}

// ============ State Management ============
const DATA_DIR = path.join(os.homedir(), '.agent-manager');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadHistory(): HistoryEntry[] {
  ensureDataDir();
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      return data.map((e: any) => ({ ...e, date: new Date(e.date) }));
    }
  } catch { }
  return [];
}

function saveHistory(history: HistoryEntry[]) {
  ensureDataDir();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(0, 20), null, 2));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_AGENT':
      return { ...state, agents: [...state.agents, action.agent] };
    case 'UPDATE_AGENT':
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.id ? { ...a, ...action.updates, updatedAt: new Date() } : a
        ),
      };
    case 'REMOVE_AGENT':
      return { ...state, agents: state.agents.filter(a => a.id !== action.id) };
    case 'APPEND_OUTPUT':
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.id
            ? { ...a, output: [...a.output.slice(-500), action.line], updatedAt: new Date() }
            : a
        ),
      };
    case 'SET_PERMISSION':
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.id
            ? { ...a, pendingPermission: action.permission, status: action.permission ? 'waiting' : 'working' }
            : a
        ),
      };
    case 'REMOVE_HISTORY':
      return { ...state, history: state.history.filter((_, i) => i !== action.index) };
    default:
      return state;
  }
}

// ============ Git Worktree Helpers ============
function getGitRoot(): string | null {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

function getCurrentBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return 'main';
  }
}

function generateWorktreeName(): string {
  const adjectives = ['swift', 'brave', 'calm', 'keen', 'bold', 'wise', 'fair', 'warm'];
  const nouns = ['fox', 'owl', 'bear', 'wolf', 'hawk', 'deer', 'lion', 'dove'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}-${noun}-${num}`;
}

function createWorktree(name: string): { success: boolean; path: string; error?: string } {
  const gitRoot = getGitRoot();
  if (!gitRoot) return { success: false, path: '', error: 'Not in a git repository' };

  const worktreePath = path.join(path.dirname(gitRoot), name);
  const branch = getCurrentBranch();

  try {
    execSync(`git worktree add -b ${name} "${worktreePath}" ${branch}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, path: worktreePath };
  } catch (e: any) {
    return { success: false, path: '', error: e.message };
  }
}

// ============ Agent SDK Manager ============
class AgentSDKManager extends EventEmitter {
  private queries: Map<string, { query: Query; abort: AbortController }> = new Map();

  async spawn(id: string, prompt: string, workDir: string): Promise<void> {
    const abortController = new AbortController();

    // Tools that are safe and don't need permission
    const autoAllowTools = ['Read', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'Task', 'TodoRead', 'TodoWrite'];

    // Tools that need explicit permission
    const permissionRequiredTools = ['Write', 'Edit', 'MultiEdit', 'Bash', 'NotebookEdit', 'KillBash'];

    const q = query({
      prompt,
      options: {
        cwd: workDir,
        abortController,
        permissionMode: 'default',
        canUseTool: async (toolName: string, toolInput: unknown): Promise<{ behavior: 'allow'; updatedInput: unknown } | { behavior: 'deny'; message: string } | undefined> => {
          debug('canUseTool called:', { toolName, toolInput });

          // Auto-allow read-only tools
          if (autoAllowTools.includes(toolName)) {
            debug('Auto-allowing tool:', toolName);
            return { behavior: 'allow', updatedInput: toolInput };
          }

          // For dangerous tools, ask for permission via the UI
          if (permissionRequiredTools.includes(toolName)) {
            debug('Requesting permission for tool:', toolName);
            this.emit('output', id, `⏸ Permission required for: ${toolName}`);

            const result = await new Promise<boolean>((resolvePermission) => {
              this.emit('permissionRequest', id, {
                toolName,
                toolInput,
                resolve: resolvePermission
              });
            });

            debug('Permission result:', { toolName, allowed: result });
            this.emit('output', id, result ? `✅ Allowed: ${toolName}` : `🚫 Denied: ${toolName}`);

            if (result) {
              return { behavior: 'allow', updatedInput: toolInput };
            } else {
              return { behavior: 'deny', message: 'User denied permission' };
            }
          }

          // For any other tools, defer to default behavior
          debug('Deferring to default for tool:', toolName);
          return undefined;
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
        debug('Assistant message content types:', message.message.content.map(c => c.type));
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
            this.emit('output', id, `🔧 Using tool: ${content.name}`);
          } else if (content.type === 'tool_result') {
            debug('Tool result:', { tool_use_id: (content as any).tool_use_id, is_error: (content as any).is_error });
            if ((content as any).is_error) {
              this.emit('output', id, `❌ Tool error: ${(content as any).content || 'Unknown error'}`);
            }
          }
        }
        break;

      case 'result':
        debug('Result message:', { subtype: message.subtype, error: (message as any).error });
        if (message.subtype === 'success') {
          this.emit('output', id, '✅ Task completed successfully');
        } else if (message.subtype === 'error') {
          this.emit('output', id, `❌ Error: ${message.error}`);
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
      return true;
    }
    return false;
  }

  isRunning(id: string): boolean {
    return this.queries.has(id);
  }

  resolvePermission(id: string, allowed: boolean): void {
    this.emit('permissionResolved', id, allowed);
  }
}

const agentManager = new AgentSDKManager();

// ============ Helper Functions ============
function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatTimeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function formatToolInput(input: unknown): string {
  if (typeof input === 'object' && input !== null) {
    const obj = input as Record<string, unknown>;
    if ('file_path' in obj) return String(obj.file_path);
    if ('command' in obj) return String(obj.command).slice(0, 60);
    if ('content' in obj) return `file: ${obj.file_path || 'unknown'}`;
    return JSON.stringify(input).slice(0, 80);
  }
  return String(input).slice(0, 60);
}

// ============ Components ============
const StatusBadge = ({ status }: { status: Status }) => {
  const cfg: Record<Status, { color: string; icon: string; label: string }> = {
    working: { color: 'yellow', icon: '', label: 'Working' },
    waiting: { color: 'cyan', icon: '?', label: 'Waiting' },
    done: { color: 'green', icon: '✓', label: 'Done' },
    error: { color: 'red', icon: '✗', label: 'Error' },
  };
  const { color, icon, label } = cfg[status];

  return (
    <Box width={12}>
      {status === 'working' ? (
        <Text color={color}><Spinner type="dots" /> {label}</Text>
      ) : (
        <Text color={color}>{icon} {label}</Text>
      )}
    </Box>
  );
};

const Tab = ({ label, active, count }: { label: string; active: boolean; count?: number }) => (
  <Box paddingX={2} borderStyle={active ? 'bold' : 'single'} borderColor={active ? 'cyan' : 'gray'}>
    <Text bold={active} color={active ? 'cyan' : 'gray'}>
      {label}{count !== undefined ? ` (${count})` : ''}
    </Text>
  </Box>
);

const AgentItem = ({ agent, selected }: { agent: Agent; selected: boolean }) => (
  <Box flexDirection="column" marginBottom={1}>
    <Box>
      <Text color={selected ? 'cyan' : 'white'} bold={selected}>{selected ? '❯ ' : '  '}</Text>
      <StatusBadge status={agent.status} />
      <Text bold={selected} color={selected ? 'cyan' : 'white'}> {agent.title}</Text>
      <Text dimColor> ({formatTime(agent.updatedAt)})</Text>
      {agent.pendingPermission && <Text color="yellow"> ⚠ Permission needed</Text>}
    </Box>
    <Box marginLeft={14}>
      <Text dimColor wrap="truncate">{agent.prompt.slice(0, 60)}{agent.prompt.length > 60 ? '...' : ''}</Text>
    </Box>
    {agent.worktreeName && (
      <Box marginLeft={14}>
        <Text color="magenta">⎇ {agent.worktreeName}</Text>
      </Box>
    )}
  </Box>
);

const HistoryItem = ({ entry, selected }: { entry: HistoryEntry; selected: boolean }) => (
  <Box>
    <Text color={selected ? 'cyan' : 'white'} bold={selected}>{selected ? '❯ ' : '  '}</Text>
    <Box width={35}><Text bold={selected} color={selected ? 'cyan' : 'white'}>{entry.title}</Text></Box>
    <Box width={12}><Text dimColor>{formatTimeAgo(entry.date)}</Text></Box>
    <Text dimColor wrap="truncate">{entry.prompt.slice(0, 30)}...</Text>
  </Box>
);

// Permission prompt component
const PermissionPrompt = ({ permission, onResponse }: {
  permission: PermissionRequest;
  onResponse: (allowed: boolean) => void;
}) => {
  const [selected, setSelected] = useState(0);

  useInput((input, key) => {
    if (key.leftArrow || input === 'h') setSelected(0);
    if (key.rightArrow || input === 'l') setSelected(1);
    if (input === 'y' || input === 'Y') { onResponse(true); return; }
    if (input === 'n' || input === 'N') { onResponse(false); return; }
    if (key.return) { onResponse(selected === 0); return; }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} marginTop={1}>
      <Text color="yellow" bold>⚠ Permission Request</Text>
      <Box marginTop={1}>
        <Text>Tool: </Text>
        <Text color="cyan" bold>{permission.toolName}</Text>
      </Box>
      <Box>
        <Text dimColor>Input: {formatToolInput(permission.toolInput)}</Text>
      </Box>
      <Box marginTop={1} gap={2}>
        <Box paddingX={2} borderStyle={selected === 0 ? 'bold' : 'single'} borderColor={selected === 0 ? 'green' : 'gray'}>
          <Text color={selected === 0 ? 'green' : 'white'} bold={selected === 0}>[Y]es</Text>
        </Box>
        <Box paddingX={2} borderStyle={selected === 1 ? 'bold' : 'single'} borderColor={selected === 1 ? 'red' : 'gray'}>
          <Text color={selected === 1 ? 'red' : 'white'} bold={selected === 1}>[N]o</Text>
        </Box>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>←/→ to select • y/n or Enter to confirm</Text>
      </Box>
    </Box>
  );
};

// Detail view for watching an agent
const DetailView = ({ agent, onBack, onPermissionResponse }: {
  agent: Agent;
  onBack: () => void;
  onPermissionResponse: (allowed: boolean) => void;
}) => {
  const { stdout } = useApp();
  const [scrollOffset, setScrollOffset] = useState(0);

  const termHeight = stdout?.rows || 24;
  const permissionHeight = agent.pendingPermission ? 10 : 0;
  const visibleLines = termHeight - 12 - permissionHeight;

  useInput((input, key) => {
    // Don't handle navigation if permission prompt is active
    if (agent.pendingPermission) return;

    if (key.escape || input === 'q') { onBack(); return; }
    if (key.upArrow || input === 'k') setScrollOffset(o => Math.max(0, o - 1));
    if (key.downArrow || input === 'j') setScrollOffset(o => Math.min(Math.max(0, agent.output.length - visibleLines), o + 1));
    if (input === 'g') setScrollOffset(0);
    if (input === 'G') setScrollOffset(Math.max(0, agent.output.length - visibleLines));
  });

  // Auto-scroll when new output arrives
  useEffect(() => {
    if (!agent.pendingPermission) {
      const atBottom = scrollOffset >= agent.output.length - visibleLines - 2;
      if (atBottom || agent.status === 'working') {
        setScrollOffset(Math.max(0, agent.output.length - visibleLines));
      }
    }
  }, [agent.output.length, agent.pendingPermission]);

  const displayedLines = agent.output.slice(scrollOffset, scrollOffset + visibleLines);

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="single" borderColor={agent.pendingPermission ? 'yellow' : 'cyan'} paddingX={1} marginBottom={1}>
        <StatusBadge status={agent.status} />
        <Text bold color={agent.pendingPermission ? 'yellow' : 'cyan'}> {agent.title}</Text>
        {agent.worktreeName && <Text color="magenta"> ⎇ {agent.worktreeName}</Text>}
        {agent.sessionId && <Text dimColor> (session: {agent.sessionId.slice(0, 8)}...)</Text>}
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>Prompt: </Text>
        <Text>{agent.prompt}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>Working dir: </Text>
        <Text>{agent.workDir}</Text>
      </Box>

      <Box flexDirection="column" borderStyle="round" borderColor="gray" padding={1} height={visibleLines + 3}>
        <Box marginBottom={1}>
          <Text dimColor>Output ({agent.output.length} lines)</Text>
        </Box>
        {displayedLines.length === 0 ? (
          <Text dimColor>Waiting for output...</Text>
        ) : (
          displayedLines.map((line, i) => (
            <Text key={scrollOffset + i} wrap="truncate">
              {line.startsWith('❌') ? <Text color="red">{line}</Text> :
                line.startsWith('✅') ? <Text color="green">{line}</Text> :
                  line.startsWith('🔧') ? <Text color="blue">{line}</Text> :
                    line.startsWith('🚫') ? <Text color="yellow">{line}</Text> :
                      line}
            </Text>
          ))
        )}
      </Box>

      {agent.pendingPermission && (
        <PermissionPrompt
          permission={agent.pendingPermission}
          onResponse={onPermissionResponse}
        />
      )}

      {!agent.pendingPermission && (
        <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text dimColor>
            <Text color="cyan">↑↓/jk</Text>{' '}Scroll{'  '}
            <Text color="cyan">g/G</Text>{' '}Top/Bottom{'  '}
            <Text color="cyan">q/Esc</Text>{' '}Back
          </Text>
        </Box>
      )}
    </Box>
  );
};

// Prompt input with worktree option
const PromptInput = ({ onSubmit, onCancel }: {
  onSubmit: (p: string, t: string, worktree: { enabled: boolean; name: string }) => void;
  onCancel: () => void;
}) => {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [useWorktree, setUseWorktree] = useState(false);
  const [worktreeName, setWorktreeName] = useState('');
  const [step, setStep] = useState<InputStep>('title');
  const [autoName] = useState(generateWorktreeName);
  const [gitRoot] = useState(() => getGitRoot());

  useInput((input, key) => {
    if (key.escape) { onCancel(); return; }

    if (key.return) {
      if (step === 'title' && title) { setStep('prompt'); return; }
      if (step === 'prompt' && prompt) {
        if (gitRoot) { setStep('worktree'); return; }
        onSubmit(prompt, title, { enabled: false, name: '' });
        return;
      }
      if (step === 'worktree') {
        if (useWorktree) { setStep('worktreeName'); return; }
        onSubmit(prompt, title, { enabled: false, name: '' });
        return;
      }
      if (step === 'worktreeName') {
        const name = worktreeName.trim() || autoName;
        onSubmit(prompt, title, { enabled: true, name });
        return;
      }
    }

    if (step === 'worktree' && (input === 'y' || input === 'Y')) { setUseWorktree(true); return; }
    if (step === 'worktree' && (input === 'n' || input === 'N')) { setUseWorktree(false); return; }

    if (key.backspace || key.delete) {
      if (step === 'title') setTitle(t => t.slice(0, -1));
      else if (step === 'prompt') setPrompt(p => p.slice(0, -1));
      else if (step === 'worktreeName') setWorktreeName(n => n.slice(0, -1));
      return;
    }

    if (input && !key.ctrl && !key.meta && step !== 'worktree') {
      if (step === 'title') setTitle(t => t + input);
      else if (step === 'prompt') setPrompt(p => p + input);
      else if (step === 'worktreeName') setWorktreeName(n => n + input);
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
      <Text bold color="cyan">New Agent</Text>

      <Box marginTop={1}>
        <Text color={step === 'title' ? 'cyan' : 'green'}>
          {step === 'title' ? '▸' : '✓'} Title:{' '}
        </Text>
        <Text>{title}<Text color="cyan">{step === 'title' ? '▋' : ''}</Text></Text>
      </Box>

      <Box marginTop={1}>
        <Text color={step === 'prompt' ? 'cyan' : step === 'title' ? 'gray' : 'green'}>
          {step === 'title' ? '○' : step === 'prompt' ? '▸' : '✓'} Prompt:{' '}
        </Text>
        <Text dimColor={step === 'title'}>{prompt}<Text color="cyan">{step === 'prompt' ? '▋' : ''}</Text></Text>
      </Box>

      {gitRoot && (
        <>
          <Box marginTop={1}>
            <Text color={step === 'worktree' ? 'cyan' : step === 'worktreeName' ? 'green' : 'gray'}>
              {step === 'worktreeName' ? '✓' : step === 'worktree' ? '▸' : '○'} Create worktree?{' '}
            </Text>
            {step === 'worktree' ? (
              <Text>[<Text color={useWorktree ? 'green' : 'white'} bold={useWorktree}>Y</Text>/<Text color={!useWorktree ? 'red' : 'white'} bold={!useWorktree}>N</Text>]</Text>
            ) : (
              <Text dimColor={step === 'title' || step === 'prompt'}>{useWorktree ? 'Yes' : 'No'}</Text>
            )}
          </Box>

          {(step === 'worktreeName' || (useWorktree && step !== 'title' && step !== 'prompt')) && (
            <Box marginTop={1}>
              <Text color={step === 'worktreeName' ? 'cyan' : 'gray'}>
                {step === 'worktreeName' ? '▸' : '○'} Worktree name:{' '}
              </Text>
              <Text>
                {worktreeName || ''}
                <Text color="cyan">{step === 'worktreeName' ? '▋' : ''}</Text>
                {step === 'worktreeName' && !worktreeName && (
                  <Text dimColor> (empty for auto: {autoName})</Text>
                )}
              </Text>
            </Box>
          )}
        </>
      )}

      <Box marginTop={1}>
        <Text dimColor>Enter to continue • Esc to cancel</Text>
      </Box>
    </Box>
  );
};

const HelpBar = ({ tab, mode }: { tab: 'inbox' | 'history'; mode: Mode }) => {
  if (mode !== 'normal') return null;
  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} marginTop={1}>
      <Text dimColor>
        <Text color="cyan">Tab</Text>{' '}Switch{'  '}
        <Text color="cyan">↑↓jk</Text>{' '}Nav{'  '}
        <Text color="cyan">Enter</Text>{' '}{tab === 'inbox' ? 'Open' : 'Resume'}{'  '}
        <Text color="cyan">n</Text>{' '}New{'  '}
        {tab === 'inbox' && <><Text color="cyan">x</Text>{' '}Kill{'  '}</>}
        <Text color="cyan">d</Text>{' '}{tab === 'inbox' ? 'Remove' : 'Delete'}{'  '}
        <Text color="cyan">q</Text>{' '}Quit
      </Text>
    </Box>
  );
};

// ============ Main App ============
const App = () => {
  const { exit } = useApp();
  const [state, dispatch] = useReducer(reducer, { agents: [], history: loadHistory() });
  const [tab, setTab] = useState<'inbox' | 'history'>('inbox');
  const [inboxIdx, setInboxIdx] = useState(0);
  const [histIdx, setHistIdx] = useState(0);
  const [mode, setMode] = useState<Mode>('normal');
  const [detailAgentId, setDetailAgentId] = useState<string | null>(null);

  useEffect(() => {
    const onOutput = (id: string, line: string) => dispatch({ type: 'APPEND_OUTPUT', id, line });
    const onDone = (id: string, code: number) => {
      dispatch({ type: 'SET_PERMISSION', id, permission: undefined });
      dispatch({ type: 'UPDATE_AGENT', id, updates: { status: code === 0 ? 'done' : 'error' } });
    };
    const onError = (id: string, msg: string) => {
      dispatch({ type: 'APPEND_OUTPUT', id, line: `❌ Error: ${msg}` });
      dispatch({ type: 'UPDATE_AGENT', id, updates: { status: 'error' } });
    };
    const onSessionId = (id: string, sessionId: string) => {
      dispatch({ type: 'UPDATE_AGENT', id, updates: { sessionId } });
    };
    const onPermissionRequest = (id: string, permission: PermissionRequest) => {
      debug('Permission request received in UI:', { id, toolName: permission.toolName });
      dispatch({ type: 'SET_PERMISSION', id, permission });
    };

    agentManager.on('output', onOutput);
    agentManager.on('done', onDone);
    agentManager.on('error', onError);
    agentManager.on('sessionId', onSessionId);
    agentManager.on('permissionRequest', onPermissionRequest);

    return () => {
      agentManager.off('output', onOutput);
      agentManager.off('done', onDone);
      agentManager.off('error', onError);
      agentManager.off('sessionId', onSessionId);
      agentManager.off('permissionRequest', onPermissionRequest);
    };
  }, []);

  const createAgent = (prompt: string, title: string, worktree: { enabled: boolean; name: string }) => {
    let workDir = process.cwd();
    let worktreeName: string | undefined;

    if (worktree.enabled) {
      const result = createWorktree(worktree.name);
      if (result.success) {
        workDir = result.path;
        worktreeName = worktree.name;
      }
    }

    const id = genId();
    const agent: Agent = {
      id, title, prompt, status: 'working', output: [], workDir, worktreeName,
      createdAt: new Date(), updatedAt: new Date(),
    };
    dispatch({ type: 'ADD_AGENT', agent });

    // Spawn the agent asynchronously
    agentManager.spawn(id, prompt, workDir);

    const entry: HistoryEntry = { id, title, prompt, date: new Date(), workDir };
    const newHistory = [entry, ...state.history.filter(h => h.prompt !== prompt)].slice(0, 5);
    saveHistory(newHistory);
  };

  const handlePermissionResponse = (allowed: boolean) => {
    debug('handlePermissionResponse called:', { detailAgentId, allowed });
    if (detailAgentId) {
      const agent = state.agents.find(a => a.id === detailAgentId);
      debug('Found agent:', { id: agent?.id, hasPendingPermission: !!agent?.pendingPermission });
      if (agent?.pendingPermission) {
        debug('Resolving permission with:', allowed);
        // Call the resolve function to unblock the SDK
        agent.pendingPermission.resolve(allowed);
        // Update UI state
        dispatch({ type: 'SET_PERMISSION', id: detailAgentId, permission: undefined });
      }
    }
  };

  useInput((input, key) => {
    if (mode === 'input' || mode === 'detail') return;

    if (key.tab) { setTab(t => t === 'inbox' ? 'history' : 'inbox'); return; }
    if (input === 'q') { exit(); return; }
    if (input === 'n') { setMode('input'); return; }

    const list = tab === 'inbox' ? state.agents : state.history;
    const idx = tab === 'inbox' ? inboxIdx : histIdx;
    const setIdx = tab === 'inbox' ? setInboxIdx : setHistIdx;

    if ((key.upArrow || input === 'k') && idx > 0) setIdx(idx - 1);
    if ((key.downArrow || input === 'j') && idx < list.length - 1) setIdx(idx + 1);

    if (key.return && list[idx]) {
      if (tab === 'inbox') {
        setDetailAgentId(state.agents[idx].id);
        setMode('detail');
      } else {
        const entry = state.history[idx] as HistoryEntry;
        createAgent(entry.prompt, entry.title, { enabled: false, name: '' });
        setTab('inbox');
      }
    }

    if (tab === 'inbox' && state.agents[idx]) {
      if (input === 'x') {
        agentManager.kill(state.agents[idx].id);
        dispatch({ type: 'UPDATE_AGENT', id: state.agents[idx].id, updates: { status: 'done' } });
      }
      if (input === 'd') {
        agentManager.kill(state.agents[idx].id);
        dispatch({ type: 'REMOVE_AGENT', id: state.agents[idx].id });
        setInboxIdx(Math.max(0, inboxIdx - 1));
      }
    }

    if (tab === 'history' && state.history[idx]) {
      if (input === 'd') {
        dispatch({ type: 'REMOVE_HISTORY', index: idx });
        const newHistory = state.history.filter((_, i) => i !== idx);
        saveHistory(newHistory);
        setHistIdx(Math.max(0, histIdx - 1));
      }
    }
  });

  const detailAgent = state.agents.find(a => a.id === detailAgentId);

  if (mode === 'detail' && detailAgent) {
    return (
      <DetailView
        agent={detailAgent}
        onBack={() => setMode('normal')}
        onPermissionResponse={handlePermissionResponse}
      />
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">🤖 Agent Manager</Text>
        <Text dimColor> v2 (SDK)</Text>
        <Text dimColor> • {state.agents.filter(a => a.status === 'working').length} active</Text>
        {state.agents.some(a => a.status === 'waiting') && (
          <Text color="yellow"> • {state.agents.filter(a => a.status === 'waiting').length} waiting</Text>
        )}
      </Box>

      <Box>
        <Tab label="Inbox" active={tab === 'inbox'} count={state.agents.length} />
        <Tab label="History" active={tab === 'history'} />
      </Box>

      <Box flexDirection="column" minHeight={15} marginTop={1}>
        {mode === 'input' ? (
          <PromptInput
            onSubmit={(p, t, wt) => { createAgent(p, t, wt); setMode('normal'); setTab('inbox'); }}
            onCancel={() => setMode('normal')}
          />
        ) : tab === 'inbox' ? (
          state.agents.length === 0 ? (
            <Text dimColor>No active agents. Press 'n' to create one.</Text>
          ) : (
            state.agents.map((a, i) => (
              <AgentItem key={a.id} agent={a} selected={i === inboxIdx} />
            ))
          )
        ) : state.history.length === 0 ? (
          <Text dimColor>No history yet.</Text>
        ) : (
          state.history.slice(0, 5).map((h, i) => (
            <HistoryItem key={h.id} entry={h} selected={i === histIdx} />
          ))
        )}
      </Box>

      <HelpBar tab={tab} mode={mode} />
    </Box>
  );
};

render(<App />);
