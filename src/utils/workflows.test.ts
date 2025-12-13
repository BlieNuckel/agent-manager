import { describe, it, expect } from 'vitest';
import {
  validateWorkflow,
  createWorkflowExecution,
  getNextStage,
  canSkipStage,
  shouldAutoApprove,
  getLastArtifactPath,
  formatStageSummary,
  getStageArtifactTemplate
} from './workflows';
import type { Workflow, WorkflowExecutionState } from '../types/workflows';
import type { CustomAgentType } from '../types/agentTypes';
import type { Template } from '../types/templates';

const mockWorkflow: Workflow = {
  id: 'test-workflow',
  name: 'Test Workflow',
  description: 'A test workflow',
  version: 1,
  source: 'system',
  path: '/test/workflow.md',
  stages: [
    { id: 'research', agentType: 'research', name: 'Research Phase' },
    { id: 'plan', agentType: 'plan', name: 'Planning Phase', artifactTemplate: 'plan' },
    { id: 'implement', agentType: 'implement', name: 'Implementation Phase' }
  ],
  settings: {
    allowSkip: ['research'],
    autoApprove: ['research']
  },
  body: '# Test Workflow'
};

const mockAgentTypes: CustomAgentType[] = [
  { id: 'research', name: 'Research', description: 'Research agent', source: 'system', path: '', systemPrompt: '', artifacts: { produces: 'research' } },
  { id: 'plan', name: 'Plan', description: 'Plan agent', source: 'system', path: '', systemPrompt: '', artifacts: { produces: 'plan' } },
  { id: 'implement', name: 'Implement', description: 'Implement agent', source: 'system', path: '', systemPrompt: '' }
];

const mockTemplates: Template[] = [
  { id: 'research', name: 'Research', description: 'Research template', source: 'system', path: '', content: '' },
  { id: 'plan', name: 'Plan', description: 'Plan template', source: 'system', path: '', content: '' }
];

describe('validateWorkflow', () => {
  it('validates a workflow with valid agent types', () => {
    const result = validateWorkflow(mockWorkflow, mockAgentTypes, mockTemplates);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('reports error for unknown agent type', () => {
    const workflow: Workflow = {
      ...mockWorkflow,
      stages: [{ id: 'test', agentType: 'unknown', name: 'Test' }]
    };
    const result = validateWorkflow(workflow, mockAgentTypes, mockTemplates);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Stage "test" references unknown agent type "unknown"');
  });

  it('reports error for unknown artifact template', () => {
    const workflow: Workflow = {
      ...mockWorkflow,
      stages: [{ id: 'test', agentType: 'research', name: 'Test', artifactTemplate: 'unknown' }]
    };
    const result = validateWorkflow(workflow, mockAgentTypes, mockTemplates);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Stage "test" references unknown artifact template "unknown"');
  });

  it('reports warning for unknown allowSkip stage', () => {
    const workflow: Workflow = {
      ...mockWorkflow,
      settings: { allowSkip: ['unknown-stage'] }
    };
    const result = validateWorkflow(workflow, mockAgentTypes, mockTemplates);
    expect(result.warnings).toContain('allowSkip references unknown stage "unknown-stage"');
  });
});

describe('createWorkflowExecution', () => {
  it('creates execution state with pending stages', () => {
    const execution = createWorkflowExecution(mockWorkflow, 'Test prompt');
    expect(execution.workflowId).toBe('test-workflow');
    expect(execution.currentStageIndex).toBe(0);
    expect(execution.status).toBe('pending');
    expect(execution.initialPrompt).toBe('Test prompt');
    expect(execution.stageStates).toHaveLength(3);
    expect(execution.stageStates[0].status).toBe('pending');
  });

  it('generates a unique executionId', () => {
    const execution1 = createWorkflowExecution(mockWorkflow, 'Test 1');
    const execution2 = createWorkflowExecution(mockWorkflow, 'Test 2');
    expect(execution1.executionId).toBeDefined();
    expect(execution2.executionId).toBeDefined();
    expect(execution1.executionId).not.toBe(execution2.executionId);
  });
});

describe('getNextStage', () => {
  it('returns the first pending stage', () => {
    const execution = createWorkflowExecution(mockWorkflow, 'Test');
    const stage = getNextStage(mockWorkflow, execution);
    expect(stage?.id).toBe('research');
  });

  it('skips approved stages', () => {
    const execution: WorkflowExecutionState = {
      ...createWorkflowExecution(mockWorkflow, 'Test'),
      currentStageIndex: 1,
      stageStates: [
        { stageId: 'research', status: 'approved' },
        { stageId: 'plan', status: 'pending' },
        { stageId: 'implement', status: 'pending' }
      ]
    };
    const stage = getNextStage(mockWorkflow, execution);
    expect(stage?.id).toBe('plan');
  });

  it('returns undefined when all stages complete', () => {
    const execution: WorkflowExecutionState = {
      ...createWorkflowExecution(mockWorkflow, 'Test'),
      currentStageIndex: 3,
      stageStates: [
        { stageId: 'research', status: 'approved' },
        { stageId: 'plan', status: 'approved' },
        { stageId: 'implement', status: 'approved' }
      ]
    };
    const stage = getNextStage(mockWorkflow, execution);
    expect(stage).toBeUndefined();
  });
});

describe('canSkipStage', () => {
  it('returns true for stages in allowSkip', () => {
    expect(canSkipStage(mockWorkflow, 'research')).toBe(true);
  });

  it('returns false for stages not in allowSkip', () => {
    expect(canSkipStage(mockWorkflow, 'plan')).toBe(false);
  });

  it('returns false when no allowSkip setting', () => {
    const workflow: Workflow = { ...mockWorkflow, settings: undefined };
    expect(canSkipStage(workflow, 'research')).toBe(false);
  });
});

describe('shouldAutoApprove', () => {
  it('returns true for stages in autoApprove', () => {
    expect(shouldAutoApprove(mockWorkflow, 'research')).toBe(true);
  });

  it('returns false for stages not in autoApprove', () => {
    expect(shouldAutoApprove(mockWorkflow, 'plan')).toBe(false);
  });
});

describe('getLastArtifactPath', () => {
  it('returns the last artifact path', () => {
    const execution: WorkflowExecutionState = {
      ...createWorkflowExecution(mockWorkflow, 'Test'),
      currentStageIndex: 2,
      stageStates: [
        { stageId: 'research', status: 'approved', artifactPath: '/artifacts/research.md' },
        { stageId: 'plan', status: 'approved', artifactPath: '/artifacts/plan.md' },
        { stageId: 'implement', status: 'pending' }
      ]
    };
    expect(getLastArtifactPath(execution)).toBe('/artifacts/plan.md');
  });

  it('returns undefined when no previous artifacts', () => {
    const execution = createWorkflowExecution(mockWorkflow, 'Test');
    expect(getLastArtifactPath(execution)).toBeUndefined();
  });

  it('skips stages without artifacts', () => {
    const execution: WorkflowExecutionState = {
      ...createWorkflowExecution(mockWorkflow, 'Test'),
      currentStageIndex: 2,
      stageStates: [
        { stageId: 'research', status: 'approved', artifactPath: '/artifacts/research.md' },
        { stageId: 'plan', status: 'skipped' },
        { stageId: 'implement', status: 'pending' }
      ]
    };
    expect(getLastArtifactPath(execution)).toBe('/artifacts/research.md');
  });
});

describe('formatStageSummary', () => {
  it('formats stages with arrows', () => {
    expect(formatStageSummary(mockWorkflow)).toBe('research → plan → implement');
  });

  it('handles single stage', () => {
    const workflow: Workflow = {
      ...mockWorkflow,
      stages: [{ id: 'only', agentType: 'research', name: 'Only Stage' }]
    };
    expect(formatStageSummary(workflow)).toBe('only');
  });
});

describe('getStageArtifactTemplate', () => {
  it('returns stage override when specified', () => {
    const stage = mockWorkflow.stages[1];
    expect(getStageArtifactTemplate(stage, mockAgentTypes)).toBe('plan');
  });

  it('returns agent type produces when no override', () => {
    const stage = mockWorkflow.stages[0];
    expect(getStageArtifactTemplate(stage, mockAgentTypes)).toBe('research');
  });

  it('returns undefined when agent has no produces', () => {
    const stage = mockWorkflow.stages[2];
    expect(getStageArtifactTemplate(stage, mockAgentTypes)).toBeUndefined();
  });
});
