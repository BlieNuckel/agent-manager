import React from 'react';
import { Box, Text } from 'ink';
import type { Status } from '../types';

interface Props {
  agentTitle: string;
  agentStatus: Status;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmationPrompt = ({ agentTitle, agentStatus, onConfirm, onCancel }: Props) => {
  const statusColor = agentStatus === 'working' ? 'cyan' : agentStatus === 'waiting' ? 'yellow' : 'red';
  const statusText = agentStatus === 'working' ? 'working' : agentStatus === 'waiting' ? 'waiting for permission' : 'in error state';

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
