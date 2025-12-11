export type Status = 'working' | 'waiting' | 'idle' | 'done' | 'error';
export type Mode = 'normal' | 'input' | 'detail' | 'detail-chat' | 'command' | 'command-result';
export type InputStep = 'title' | 'prompt' | 'agentType' | 'artifact' | 'worktree' | 'worktreeName';
export type AgentType = 'normal' | 'planning' | 'auto-accept';

export interface PermissionSuggestion {
  type: 'addRules';
  rules: Array<{ toolName: string; toolInput?: Record<string, unknown> }>;
  behavior: 'allow' | 'deny';
  destination: 'localSettings' | 'globalSettings';
}

export interface PermissionRequest {
  toolName: string;
  toolInput: unknown;
  suggestions?: PermissionSuggestion[];
  resolve: (result: { allowed: boolean; alwaysAllowInRepo?: boolean }) => void;
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
  status: 'ready' | 'conflicts' | 'failed' | 'resolving';
  error?: string;
}

export interface OutputLine {
  text: string;
  isSubagent: boolean;
  subagentId?: string;
  subagentType?: string;
}

export type PermissionMode = 'default' | 'acceptEdits';

export interface ImageAttachment {
  id: string;
  path: string;
  base64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  timestamp: number;
  size?: number;
}

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
  worktreePath?: string;
  sessionId?: string;
  pendingPermission?: PermissionRequest;
  permissionQueue: PermissionRequest[];
  pendingQuestion?: QuestionRequest;
  pendingMerge?: MergeState;
  agentType: AgentType;
  permissionMode: PermissionMode;
  images?: ImageAttachment[];
}

export interface HistoryEntry {
  id: string;
  title: string;
  prompt: string;
  date: Date;
  workDir: string;
  images?: Array<{
    id: string;
    mediaType: string;
    size: number;
  }>;
}

export type Action =
  | { type: 'ADD_AGENT'; agent: Agent }
  | { type: 'UPDATE_AGENT'; id: string; updates: Partial<Agent> }
  | { type: 'UPDATE_AGENT_TITLE'; id: string; title: string }
  | { type: 'REMOVE_AGENT'; id: string }
  | { type: 'APPEND_OUTPUT'; id: string; line: OutputLine }
  | { type: 'SET_PERMISSION'; id: string; permission: PermissionRequest | undefined }
  | { type: 'QUEUE_PERMISSION'; id: string; permission: PermissionRequest }
  | { type: 'DEQUEUE_PERMISSION'; id: string }
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
