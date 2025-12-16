import { ImageAttachment, Repository } from './index.js';

export interface WorkflowStage {
  id: string;
  agentType: string;
  name: string;
  description?: string;
  artifactTemplate?: string;
  promptAdditions?: string;
  mediaAccess?: ('image' | 'pdf' | 'video')[];
}

export interface WorkflowSettings {
  allowSkip?: string[];
  autoApprove?: string[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  version?: number;
  source: 'system' | 'user';
  path: string;

  stages: WorkflowStage[];
  settings?: WorkflowSettings;

  body: string;
}

export interface WorkflowFrontmatter {
  id: string;
  name: string;
  description: string;
  version?: number;
  stages: WorkflowStage[];
  settings?: WorkflowSettings;
}

export type WorkflowStageStatus = 'pending' | 'skipped' | 'running' | 'awaiting_approval' | 'approved' | 'rejected';

export interface StageExecutionState {
  stageId: string;
  status: WorkflowStageStatus;
  agentId?: string;
  artifactPath?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export type WorkflowExecutionStatus = 'pending' | 'running' | 'awaiting_approval' | 'completed' | 'cancelled';

export interface WorkflowExecutionState {
  executionId: string;
  workflowId: string;
  currentStageIndex: number;
  status: WorkflowExecutionStatus;
  stageStates: StageExecutionState[];
  initialPrompt: string;
  images?: ImageAttachment[];
  worktreePath?: string;
  worktreeBranchName?: string;
  worktreeGitRoot?: string;
  worktreeCurrentBranch?: string;
  repository?: {
    name: string;
    path: string;
  };
}
