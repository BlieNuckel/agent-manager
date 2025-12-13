import React from 'react';
import { Box, Text } from 'ink';

interface Props {
  workflowName: string;
  activeAgentCount: number;
  totalAgentCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const WorkflowDeleteConfirmationPrompt = ({ workflowName, activeAgentCount, totalAgentCount, onConfirm, onCancel }: Props) => {
  const isOngoing = activeAgentCount > 0;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={isOngoing ? 'yellow' : 'gray'} padding={1} flexShrink={0}>
      <Text bold color={isOngoing ? 'yellow' : 'white'}>
        {isOngoing ? '⚠️  Delete Active Workflow?' : 'Delete Workflow?'}
      </Text>
      <Text>
        Workflow <Text color="cyan">{workflowName}</Text>
        {isOngoing && (
          <Text> has <Text color="yellow">{activeAgentCount} active agent{activeAgentCount > 1 ? 's' : ''}</Text></Text>
        )}
      </Text>
      {totalAgentCount > 0 && (
        <Text dimColor>
          This will delete the workflow and {totalAgentCount} associated agent{totalAgentCount > 1 ? 's' : ''}.
        </Text>
      )}
      {totalAgentCount === 0 && (
        <Text dimColor>This will delete the workflow execution.</Text>
      )}
      <Box marginTop={1}>
        <Text bold>Are you sure you want to delete? </Text>
        <Text color="green">[y]</Text>
        <Text> Yes  </Text>
        <Text color="red">[n]</Text>
        <Text> No</Text>
      </Box>
    </Box>
  );
};
