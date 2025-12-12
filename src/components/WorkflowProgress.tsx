import React from 'react';
import { Box, Text } from 'ink';
import type { Workflow } from '../types/workflows';
import type { StageExecutionState } from '../types/workflows';

interface WorkflowProgressProps {
  workflow: Workflow;
  stageStates: StageExecutionState[];
  currentStageIndex: number;
}

function getStageIcon(status: StageExecutionState['status']): string {
  switch (status) {
    case 'approved':
      return '✓';
    case 'skipped':
      return '○';
    case 'running':
    case 'awaiting_approval':
      return '●';
    case 'rejected':
      return '✗';
    case 'pending':
    default:
      return '○';
  }
}

function getStageColor(status: StageExecutionState['status']): string {
  switch (status) {
    case 'approved':
      return 'green';
    case 'skipped':
      return 'gray';
    case 'running':
      return 'yellow';
    case 'awaiting_approval':
      return 'cyan';
    case 'rejected':
      return 'red';
    case 'pending':
    default:
      return 'gray';
  }
}

export const WorkflowProgress = ({ workflow, stageStates, currentStageIndex }: WorkflowProgressProps) => {
  return (
    <Box flexDirection="row" flexWrap="wrap">
      {workflow.stages.map((stage, i) => {
        const state = stageStates[i];
        const icon = getStageIcon(state?.status ?? 'pending');
        const color = getStageColor(state?.status ?? 'pending');
        const isLast = i === workflow.stages.length - 1;

        return (
          <Box key={stage.id}>
            <Text color={color}>
              [{icon}] {stage.id}
            </Text>
            {!isLast && <Text dimColor> → </Text>}
          </Box>
        );
      })}
    </Box>
  );
};
