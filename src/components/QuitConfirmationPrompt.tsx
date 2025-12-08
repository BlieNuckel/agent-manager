import React from 'react';
import { Box, Text } from 'ink';

interface Props {
  activeCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const QuitConfirmationPrompt = ({ activeCount, onConfirm, onCancel }: Props) => {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} flexShrink={0}>
      <Text bold color="yellow">⚠️  Active Agents Running</Text>
      <Text>
        You have <Text color="cyan">{activeCount}</Text> active {activeCount === 1 ? 'agent' : 'agents'} running.
      </Text>
      <Text dimColor>Quitting will terminate all running agents.</Text>
      <Box marginTop={1}>
        <Text bold>Are you sure you want to quit? </Text>
        <Text color="green">[y]</Text>
        <Text> Yes  </Text>
        <Text color="red">[n]</Text>
        <Text> No</Text>
      </Box>
    </Box>
  );
};
