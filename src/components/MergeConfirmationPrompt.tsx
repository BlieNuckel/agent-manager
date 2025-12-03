import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { MergeConfirmation } from '../types';

export const MergeConfirmationPrompt = ({ confirmation, onResponse }: {
  confirmation: MergeConfirmation;
  onResponse: (confirmed: boolean) => void;
}) => {
  useInput((input) => {
    if (input === 'y' || input === 'Y') {
      onResponse(true);
    } else if (input === 'n' || input === 'N') {
      onResponse(false);
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="yellow"
      padding={1}
      marginTop={1}
    >
      <Text bold color="yellow">⚠️  Merge Confirmation Required</Text>
      <Box marginTop={1}>
        <Text>
          The worktree branch <Text bold color="cyan">{confirmation.worktreeName}</Text> is ready to be merged.
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          This will:
        </Text>
      </Box>
      <Box marginLeft={2}>
        <Text dimColor>• Merge the branch into the main branch</Text>
      </Box>
      <Box marginLeft={2}>
        <Text dimColor>• Remove the worktree directory</Text>
      </Box>
      <Box marginLeft={2}>
        <Text dimColor>• Delete the feature branch</Text>
      </Box>
      <Box marginTop={1}>
        <Text>
          Do you want to proceed? {' '}
          <Text bold color="green">[Y]</Text>
          <Text>/</Text>
          <Text bold color="red">[N]</Text>
        </Text>
      </Box>
    </Box>
  );
};
