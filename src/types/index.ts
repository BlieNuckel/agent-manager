import type {
  PermissionUpdate,
  PermissionRuleValue,
  PermissionBehavior,
} from '@anthropic-ai/claude-agent-sdk';
import type { Template, TemplateFrontmatter } from './templates';
import type { CustomAgentType, AgentToolConfig, AgentArtifactConfig } from './agentTypes';
import type { Workflow, WorkflowExecutionState, StageExecutionState } from './workflows';

export type { CustomAgentType, AgentToolConfig, AgentArtifactConfig };
export type { Workflow, WorkflowExecutionState, StageExecutionState };
export type Status = 'working' | 'waiting' | 'idle' | 'done' | 'error';
export type Mode = 'normal' | 'input' | 'detail' | 'detail-chat' | 'command-result' | 'new-artifact' | 'workflow-select' | 'workflow-detail';
export type InputStep = 'title' | 'prompt' | 'agentType' | 'artifact' | 'worktree' | 'worktreeName';

export type { Template, TemplateFrontmatter };
export type AgentType = 'normal' | 'planning' | 'auto-accept';

export type PermissionDestination =
  | 'userSettings'
  | 'projectSettings'
  | 'localSettings'
  | 'session'
  | 'cliArg';

export type PermissionSuggestion = PermissionUpdate;

export type { PermissionRuleValue, PermissionBehavior };

export interface PermissionRequest {
  toolName: string;
  toolInput: unknown;
  suggestions?: unknown[];
  resolve: (result: { allowed: boolean; suggestions?: PermissionSuggestion[] }) => void;
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
  status: 'ready' | 'conflicts' | 'failed' | 'resolving' | 'drafting-pr' | 'pr-created';
  error?: string;
  prUrl?: string;
}

export interface OutputLine {
  text: string;
  isSubagent: boolean;
  subagentId?: string;
  subagentType?: string;
  timestamp?: number;
  toolCallId?: string;
  toolStatus?: 'pending' | 'success' | 'error';
  toolError?: string;
}

export interface SubagentStats {
  subagentId: string;
  subagentType: string;
  startTime: number;
  endTime?: number;
  inputTokens: number;
  outputTokens: number;
  toolCallCount: number;
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

export interface TokenTracking {
  cumulativeInputTokens: number;
  cumulativeOutputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  contextWindow: number;
  lastUpdated: Date;
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
  tokenUsage?: TokenTracking;
  customAgentTypeId?: string;
  subagentStats?: Record<string, SubagentStats>;
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

export interface ToolStatusUpdate {
  toolCallId: string;
  status: 'success' | 'error';
  prefix: '[✓]' | '[×]';
  error?: string;
}

export type Action =
  | { type: 'ADD_AGENT'; agent: Agent }
  | { type: 'UPDATE_AGENT'; id: string; updates: Partial<Agent> }
  | { type: 'UPDATE_AGENT_TITLE'; id: string; title: string }
  | { type: 'REMOVE_AGENT'; id: string }
  | { type: 'APPEND_OUTPUT'; id: string; line: OutputLine; timestamp?: number }
  | { type: 'UPDATE_TOOL_STATUS'; id: string; update: ToolStatusUpdate }
  | { type: 'SET_PERMISSION'; id: string; permission: PermissionRequest | undefined }
  | { type: 'QUEUE_PERMISSION'; id: string; permission: PermissionRequest }
  | { type: 'DEQUEUE_PERMISSION'; id: string }
  | { type: 'SET_QUESTION'; id: string; question: QuestionRequest | undefined }
  | { type: 'SET_MERGE_STATE'; id: string; mergeState: MergeState | undefined }
  | { type: 'REMOVE_HISTORY'; index: number }
  | { type: 'UPDATE_HISTORY_TITLE'; id: string; title: string }
  | { type: 'SET_ARTIFACTS'; artifacts: ArtifactInfo[] }
  | { type: 'SET_TEMPLATES'; templates: Template[] }
  | { type: 'SET_AGENT_TYPES'; agentTypes: CustomAgentType[] }
  | { type: 'UPDATE_TOKEN_USAGE'; id: string; tokenUsage: TokenTracking }
  | { type: 'SET_WORKFLOWS'; workflows: Workflow[] }
  | { type: 'START_WORKFLOW'; execution: WorkflowExecutionState }
  | { type: 'UPDATE_WORKFLOW_EXECUTION'; executionId: string; updates: Partial<WorkflowExecutionState> }
  | { type: 'UPDATE_STAGE_STATE'; executionId: string; stageIndex: number; updates: Partial<StageExecutionState> }
  | { type: 'CANCEL_WORKFLOW'; executionId: string }
  | { type: 'REMOVE_WORKFLOW'; executionId: string; agentIds: string[] }
  | { type: 'SET_SUBAGENT_STATS'; id: string; subagentId: string; stats: SubagentStats };

export interface ArtifactInfo {
  name: string;
  path: string;
  modifiedAt: Date;
  frontmatter?: TemplateFrontmatter;
  templateId?: string;
  templateValid?: boolean;
}

export interface State {
  agents: Agent[];
  history: HistoryEntry[];
  artifacts: ArtifactInfo[];
  templates: Template[];
  agentTypes: CustomAgentType[];
  workflows: Workflow[];
  workflowExecutions: WorkflowExecutionState[];
}

export type InboxItem =
  | { type: 'agent'; agent: Agent; isWorkflowChild?: boolean }
  | { type: 'workflow'; workflow: Workflow; execution: WorkflowExecutionState };
