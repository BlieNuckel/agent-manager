import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { WorkflowItem } from './WorkflowItem';
import type { Workflow, WorkflowExecutionState, Agent } from '../types';

const createTestWorkflow = (): Workflow => ({
  id: 'test-workflow',
  name: 'Test Workflow',
  description: 'A test workflow',
  source: 'system',
  path: '/test/workflow.md',
  stages: [
    { id: 'stage1', agentType: 'normal', name: 'Stage 1' },
    { id: 'stage2', agentType: 'normal', name: 'Stage 2' }
  ],
  body: 'Test workflow body'
});

const createTestExecution = (overrides?: Partial<WorkflowExecutionState>): WorkflowExecutionState => ({
  executionId: 'exec-123',
  workflowId: 'test-workflow',
  currentStageIndex: 0,
  status: 'running',
  stageStates: [
    {
      stageId: 'stage1',
      status: 'running',
      startedAt: new Date()
    },
    {
      stageId: 'stage2',
      status: 'pending'
    }
  ],
  initialPrompt: 'Test initial prompt',
  ...overrides
});

describe('WorkflowItem', () => {
  let workflow: Workflow;
  let execution: WorkflowExecutionState;
  let agents: Agent[];

  beforeEach(() => {
    workflow = createTestWorkflow();
    execution = createTestExecution();
    agents = [];
  });

  it('displays workflow name', () => {
    const { lastFrame } = render(
      <WorkflowItem
        workflow={workflow}
        execution={execution}
        agents={agents}
        expanded={false}
        selected={false}
      />
    );
    expect(lastFrame()).toContain('[Test Workflow]');
  });

  it('displays repository name when available', () => {
    const executionWithRepo = createTestExecution({
      repository: { name: 'my-project', path: '/Users/test/my-project' }
    });

    const { lastFrame } = render(
      <WorkflowItem
        workflow={workflow}
        execution={executionWithRepo}
        agents={agents}
        expanded={false}
        selected={false}
      />
    );

    expect(lastFrame()).toContain('(my-project)');
  });

  it('does not display repository name when not available', () => {
    const { lastFrame } = render(
      <WorkflowItem
        workflow={workflow}
        execution={execution}
        agents={agents}
        expanded={false}
        selected={false}
      />
    );

    expect(lastFrame()).not.toContain('(my-project)');
  });

  it('displays stage progress', () => {
    const { lastFrame } = render(
      <WorkflowItem
        workflow={workflow}
        execution={execution}
        agents={agents}
        expanded={false}
        selected={false}
      />
    );

    expect(lastFrame()).toContain('Stage 1/2');
  });

  it('shows correct status icon', () => {
    const { lastFrame } = render(
      <WorkflowItem
        workflow={workflow}
        execution={execution}
        agents={agents}
        expanded={false}
        selected={false}
      />
    );

    expect(lastFrame()).toContain('●'); // running icon
  });

  it('highlights when selected', () => {
    const { lastFrame } = render(
      <WorkflowItem
        workflow={workflow}
        execution={execution}
        agents={agents}
        expanded={false}
        selected={true}
      />
    );

    expect(lastFrame()).toContain('> ');
  });

  it('shows expanded arrow when expanded', () => {
    const { lastFrame } = render(
      <WorkflowItem
        workflow={workflow}
        execution={execution}
        agents={agents}
        expanded={true}
        selected={false}
      />
    );

    expect(lastFrame()).toContain('▼');
  });

  it('shows collapsed arrow when not expanded', () => {
    const { lastFrame } = render(
      <WorkflowItem
        workflow={workflow}
        execution={execution}
        agents={agents}
        expanded={false}
        selected={false}
      />
    );

    expect(lastFrame()).toContain('▶');
  });

  it('truncates long initial prompts', () => {
    const longPrompt = 'This is a very long initial prompt that should be truncated when displayed in the workflow item component';
    const executionWithLongPrompt = createTestExecution({
      initialPrompt: longPrompt
    });

    const { lastFrame } = render(
      <WorkflowItem
        workflow={workflow}
        execution={executionWithLongPrompt}
        agents={agents}
        expanded={false}
        selected={false}
      />
    );

    const frame = lastFrame();
    expect(frame).toContain('This is a very long initial prompt that should be truncated');
    expect(frame).toContain('...');
  });

  it('displays approval needed badge for awaiting_approval status', () => {
    const executionAwaitingApproval = createTestExecution({
      status: 'awaiting_approval'
    });

    const { lastFrame } = render(
      <WorkflowItem
        workflow={workflow}
        execution={executionAwaitingApproval}
        agents={agents}
        expanded={false}
        selected={false}
      />
    );

    expect(lastFrame()).toContain('[!] Approval needed');
  });
});