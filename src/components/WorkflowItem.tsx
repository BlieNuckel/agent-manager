import React from 'react';
import { Box, Text } from 'ink';
import type { Workflow, WorkflowExecutionState, WorkflowExecutionStatus } from '../types/workflows';
import { formatTime } from '../utils/helpers';

interface WorkflowItemProps {
  workflow: Workflow;
  execution: WorkflowExecutionState;
  expanded: boolean;
  selected: boolean;
}

function getWorkflowStatusIcon(status: WorkflowExecutionStatus): string {
  switch (status) {
    case 'running': return '●';
    case 'awaiting_approval': return '◐';
    case 'completed': return '✓';
    case 'cancelled': return '✗';
    case 'pending':
    default: return '○';
  }
}

function getWorkflowStatusColor(status: WorkflowExecutionStatus): string {
  switch (status) {
    case 'running': return 'magenta';
    case 'awaiting_approval': return 'cyan';
    case 'completed': return 'green';
    case 'cancelled': return 'red';
    case 'pending':
    default: return 'gray';
  }
}

function getLastActivityTime(execution: WorkflowExecutionState): Date {
  const lastStage = [...execution.stageStates]
    .reverse()
    .find(s => s.startedAt || s.completedAt);
  return lastStage?.completedAt || lastStage?.startedAt || new Date();
}

export const WorkflowItem = ({ workflow, execution, expanded, selected }: WorkflowItemProps) => {
  const completedStages = execution.stageStates.filter(s => s.status === 'approved' || s.status === 'skipped').length;
  const totalStages = workflow.stages.length;
  const currentStageNum = Math.min(completedStages + 1, totalStages);
  const statusIcon = getWorkflowStatusIcon(execution.status);
  const statusColor = getWorkflowStatusColor(execution.status);
  const lastActivity = getLastActivityTime(execution);

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color={selected ? 'cyan' : 'white'} bold={selected}>
          {selected ? '> ' : '  '}
        </Text>
        <Text color={statusColor}>{expanded ? '▼' : '▶'}</Text>
        <Text color={statusColor}> {statusIcon} </Text>
        <Text bold={selected} color={selected ? 'cyan' : 'magenta'}>
          [{workflow.name}]
        </Text>
        <Text dimColor> Stage {currentStageNum}/{totalStages}</Text>
        <Text dimColor> ({formatTime(lastActivity)})</Text>
        {execution.status === 'awaiting_approval' && (
          <Text color="cyan"> [!] Approval needed</Text>
        )}
      </Box>
      <Box marginLeft={14}>
        <Text dimColor wrap="truncate">
          {execution.initialPrompt.slice(0, 60)}{execution.initialPrompt.length > 60 ? '...' : ''}
        </Text>
      </Box>
    </Box>
  );
};
