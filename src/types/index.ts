export type Status = 'working' | 'waiting' | 'idle' | 'done' | 'error';
export type Mode = 'normal' | 'input' | 'detail' | 'detail-chat' | 'command' | 'command-result';
export type InputStep = 'title' | 'prompt' | 'agentType' | 'artifact' | 'worktree' | 'worktreeName';
export type AgentType = 'normal' | 'planning' | 'auto-accept';

export interface PermissionRequest {
  toolName: string;
  toolInput: unknown;
  resolve: (allowed: boolean) => void;
}

export interface QuestionOption {
  label: string;
  description: string;
}

export interface Question {
  question: string;
  header: string;
  options: QuestionOption[];
  multiSelect: boolean;
}

export interface QuestionRequest {
  questions: Question[];
  resolve: (answers: Record<string, string | string[]>) => void;
}

export interface MergeState {
  branchName: string;
  status: 'ready' | 'conflicts' | 'failed';
  error?: string;
}

export interface OutputLine {
  text: string;
  isSubagent: boolean;
  subagentId?: string;
  subagentType?: string;
}

export type PermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions';

export interface Agent {
  id: string;
  title: string;
  status: Status;
  prompt: string;
  output: OutputLine[];
  createdAt: Date;
  updatedAt: Date;
  workDir: string;
  worktreeName?: string;
  sessionId?: string;
  pendingPermission?: PermissionRequest;
  pendingQuestion?: QuestionRequest;
  pendingMerge?: MergeState;
  agentType: AgentType;
  autoAcceptPermissions: boolean;
  permissionMode: PermissionMode;
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
  | { type: 'APPEND_OUTPUT'; id: string; line: OutputLine }
  | { type: 'SET_PERMISSION'; id: string; permission: PermissionRequest | undefined }
  | { type: 'SET_QUESTION'; id: string; question: QuestionRequest | undefined }
  | { type: 'SET_MERGE_STATE'; id: string; mergeState: MergeState | undefined }
  | { type: 'REMOVE_HISTORY'; index: number }
  | { type: 'UPDATE_HISTORY_TITLE'; id: string; title: string }
  | { type: 'SET_ARTIFACTS'; artifacts: ArtifactInfo[] };

export interface ArtifactInfo {
  name: string;
  path: string;
  modifiedAt: Date;
}

export interface State {
  agents: Agent[];
  history: HistoryEntry[];
  artifacts: ArtifactInfo[];
}
