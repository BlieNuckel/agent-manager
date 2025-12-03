export type Status = 'working' | 'waiting' | 'done' | 'error';
export type Mode = 'normal' | 'input' | 'detail';
export type InputStep = 'prompt' | 'agentType' | 'worktree' | 'worktreeName';
export type AgentType = 'normal' | 'planning' | 'auto-accept';

export interface PermissionRequest {
  toolName: string;
  toolInput: unknown;
  resolve: (allowed: boolean) => void;
}

export interface MergeConfirmation {
  worktreeName: string;
  gitRoot: string;
  resolve: (confirmed: boolean) => void;
}

export interface Agent {
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
  pendingMergeConfirmation?: MergeConfirmation;
  agentType: AgentType;
  autoAcceptPermissions: boolean;
  mergeStatus?: 'pending' | 'awaiting_confirmation' | 'merged' | 'conflict' | 'failed';
  mergeError?: string;
}

export interface HistoryEntry {
  id: string;
  title: string;
  prompt: string;
  date: Date;
  workDir: string;
}

export type Action =
  | { type: 'ADD_AGENT'; agent: Agent }
  | { type: 'UPDATE_AGENT'; id: string; updates: Partial<Agent> }
  | { type: 'UPDATE_AGENT_TITLE'; id: string; title: string }
  | { type: 'REMOVE_AGENT'; id: string }
  | { type: 'APPEND_OUTPUT'; id: string; line: string }
  | { type: 'SET_PERMISSION'; id: string; permission: PermissionRequest | undefined }
  | { type: 'SET_MERGE_CONFIRMATION'; id: string; confirmation: MergeConfirmation | undefined }
  | { type: 'REMOVE_HISTORY'; index: number }
  | { type: 'UPDATE_HISTORY_TITLE'; id: string; title: string };

export interface State {
  agents: Agent[];
  history: HistoryEntry[];
}
