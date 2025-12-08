import React from 'react';
import { Box, Text } from 'ink';
import type { MergeState } from '../types';

interface Props {
  mergeState: MergeState;
  onApprove: () => void;
  onDeny: () => void;
}

export const MergePrompt = ({ mergeState, onApprove, onDeny }: Props) => {
  if (mergeState.status === 'ready') {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1} flexShrink={0}>
        <Text bold color="green">🌿 Merge Ready</Text>
        <Text>Branch: <Text color="cyan">{mergeState.branchName}</Text></Text>
        <Text dimColor>No conflicts detected. The agent will merge and clean up the worktree.</Text>
        <Box marginTop={1}>
          <Text bold>Approve merge? </Text>
          <Text color="green">[y]</Text>
          <Text> Yes  </Text>
          <Text color="red">[n]</Text>
          <Text> No</Text>
        </Box>
      </Box>
    );
  }

  if (mergeState.status === 'conflicts') {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} flexShrink={0}>
        <Text bold color="yellow">⚠️  Merge Conflicts Detected</Text>
        <Text>Branch: <Text color="cyan">{mergeState.branchName}</Text></Text>
        <Text color="yellow">Manual resolution required. Check git status for details.</Text>
        <Box marginTop={1}>
          <Text dimColor>Press any key to continue...</Text>
        </Box>
      </Box>
    );
  }

  if (mergeState.status === 'failed') {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="red" padding={1} flexShrink={0}>
        <Text bold color="red">❌ Merge Test Failed</Text>
        <Text>Branch: <Text color="cyan">{mergeState.branchName}</Text></Text>
        {mergeState.error && <Text color="red">{mergeState.error}</Text>}
        <Box marginTop={1}>
          <Text dimColor>Press any key to continue...</Text>
        </Box>
      </Box>
    );
  }

  return null;
};
