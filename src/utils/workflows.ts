import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import type {
  Workflow,
  WorkflowStage,
  WorkflowSettings,
  WorkflowExecutionState,
  StageExecutionState
} from '../types/workflows';
import type { CustomAgentType } from '../types/agentTypes';
import type { Template } from '../types/templates';
import type { ImageAttachment } from '../types/index.js';
import { parseFrontmatter } from './frontmatter';
import { genId } from './helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getSystemWorkflowsDir(): string {
  return path.resolve(__dirname, '../../assets/workflows');
}

export function getUserWorkflowsDir(): string {
  return path.join(os.homedir(), '.agent-manager', 'workflows');
}

export async function ensureUserWorkflowsDir(): Promise<void> {
  const dir = getUserWorkflowsDir();
  try {
    await fs.promises.mkdir(dir, { recursive: true });
  } catch {
    // Directory may already exist
  }
}

async function loadWorkflowsFromDir(dir: string, source: 'system' | 'user'): Promise<Workflow[]> {
  const workflows: Workflow[] = [];

  try {
    const files = await fs.promises.readdir(dir);

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const fullPath = path.join(dir, file);
      const content = await fs.promises.readFile(fullPath, 'utf-8');
      const parsed = parseFrontmatter(content);

      const data = parsed.data as Record<string, unknown>;
      if (!data.id || !data.name || !data.description || !data.stages) continue;

      const stages = data.stages as WorkflowStage[];
      if (!Array.isArray(stages) || stages.length === 0) continue;

      workflows.push({
        id: data.id as string,
        name: data.name as string,
        description: data.description as string,
        version: data.version as number | undefined,
        source,
        path: fullPath,
        stages,
        settings: data.settings as WorkflowSettings | undefined,
        body: parsed.content.trim()
      });
    }
  } catch {
    // Directory may not exist
  }

  return workflows;
}

export async function listWorkflows(): Promise<Workflow[]> {
  const systemDir = getSystemWorkflowsDir();
  const userDir = getUserWorkflowsDir();

  const [systemWorkflows, userWorkflows] = await Promise.all([
    loadWorkflowsFromDir(systemDir, 'system'),
    loadWorkflowsFromDir(userDir, 'user')
  ]);

  const workflowMap = new Map<string, Workflow>();

  for (const workflow of systemWorkflows) {
    workflowMap.set(workflow.id, workflow);
  }

  for (const workflow of userWorkflows) {
    workflowMap.set(workflow.id, workflow);
  }

  return Array.from(workflowMap.values());
}

export async function getWorkflow(id: string): Promise<Workflow | undefined> {
  const workflows = await listWorkflows();
  return workflows.find(w => w.id === id);
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateWorkflow(
  workflow: Workflow,
  agentTypes: CustomAgentType[],
  templates: Template[]
): WorkflowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const agentTypeMap = new Map(agentTypes.map(a => [a.id, a]));
  const templateMap = new Map(templates.map(t => [t.id, t]));

  for (const stage of workflow.stages) {
    const agentType = agentTypeMap.get(stage.agentType);
    if (!agentType) {
      errors.push(`Stage "${stage.id}" references unknown agent type "${stage.agentType}"`);
      continue;
    }

    if (stage.artifactTemplate) {
      if (!templateMap.has(stage.artifactTemplate)) {
        errors.push(`Stage "${stage.id}" references unknown artifact template "${stage.artifactTemplate}"`);
      }
    }
  }

  if (workflow.settings?.allowSkip) {
    for (const stageId of workflow.settings.allowSkip) {
      if (!workflow.stages.find(s => s.id === stageId)) {
        warnings.push(`allowSkip references unknown stage "${stageId}"`);
      }
    }
  }

  if (workflow.settings?.autoApprove) {
    for (const stageId of workflow.settings.autoApprove) {
      if (!workflow.stages.find(s => s.id === stageId)) {
        warnings.push(`autoApprove references unknown stage "${stageId}"`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function getStageArtifactTemplate(
  stage: WorkflowStage,
  agentTypes: CustomAgentType[]
): string | undefined {
  if (stage.artifactTemplate) {
    return stage.artifactTemplate;
  }

  const agentType = agentTypes.find(a => a.id === stage.agentType);
  return agentType?.artifacts?.produces;
}

export function createWorkflowExecution(
  workflow: Workflow,
  initialPrompt: string,
  images?: ImageAttachment[]
): WorkflowExecutionState {
  const stageStates: StageExecutionState[] = workflow.stages.map(stage => ({
    stageId: stage.id,
    status: 'pending'
  }));

  return {
    executionId: genId(),
    workflowId: workflow.id,
    currentStageIndex: 0,
    status: 'pending',
    stageStates,
    initialPrompt,
    images
  };
}

export function getNextStage(
  workflow: Workflow,
  execution: WorkflowExecutionState
): WorkflowStage | undefined {
  for (let i = execution.currentStageIndex; i < workflow.stages.length; i++) {
    const stageState = execution.stageStates[i];
    if (stageState && stageState.status !== 'skipped' && stageState.status !== 'approved') {
      return workflow.stages[i];
    }
  }
  return undefined;
}

export function canSkipStage(workflow: Workflow, stageId: string): boolean {
  return workflow.settings?.allowSkip?.includes(stageId) ?? false;
}

export function shouldAutoApprove(workflow: Workflow, stageId: string): boolean {
  return workflow.settings?.autoApprove?.includes(stageId) ?? false;
}

export function getLastArtifactPath(execution: WorkflowExecutionState, currentStageIndex?: number): string | undefined {
  const stageIndex = currentStageIndex ?? execution.currentStageIndex;
  for (let i = stageIndex - 1; i >= 0; i--) {
    const stageState = execution.stageStates[i];
    if (stageState?.artifactPath) {
      return stageState.artifactPath;
    }
  }
  return undefined;
}

export function formatStageSummary(workflow: Workflow): string {
  return workflow.stages.map(s => s.id).join(' → ');
}
