import React from 'react';
import { Box, Text } from 'ink';
import type { Status } from '../types';

interface Props {
  agentTitle: string;
  agentStatus: Status;
  hasPendingMerge?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmationPrompt = ({ agentTitle, agentStatus, hasPendingMerge, onConfirm, onCancel }: Props) => {
  const getStatusDisplay = () => {
    if (hasPendingMerge) {
      return { color: 'magenta', text: 'waiting for merge approval' };
    }
    if (agentStatus === 'working') {
      return { color: 'cyan', text: 'working' };
    }
    if (agentStatus === 'waiting') {
      return { color: 'yellow', text: 'waiting for permission' };
    }
    return { color: 'red', text: 'in error state' };
  };

  const { color: statusColor, text: statusText } = getStatusDisplay();

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} flexShrink={0}>
      <Text bold color="yellow">⚠️  Delete Active Agent?</Text>
      <Text>
        Agent <Text color="cyan">{agentTitle}</Text> is currently <Text color={statusColor}>{statusText}</Text>.
      </Text>
      <Text dimColor>Deleting will terminate the agent and remove it from the list.</Text>
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
