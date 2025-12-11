import React from 'react';
import { Box, Text } from 'ink';
import type { MergeState } from '../types';

interface Props {
  mergeState: MergeState;
  onApprove: () => void;
  onDeny: () => void;
  onDraftPR?: () => void;
}

export const MergePrompt = ({ mergeState, onApprove, onDeny, onDraftPR }: Props) => {
  if (mergeState.status === 'ready') {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1} flexShrink={0}>
        <Text bold color="green">🌿 Merge Ready</Text>
        <Text>Branch: <Text color="cyan">{mergeState.branchName}</Text></Text>
        <Text dimColor>No conflicts detected.</Text>
        <Box marginTop={1}>
          <Text bold>Choose action: </Text>
          <Text color="green">[y]</Text>
          <Text> Merge  </Text>
          <Text color="cyan">[p]</Text>
          <Text> Draft PR  </Text>
          <Text color="red">[n]</Text>
          <Text> Cancel</Text>
        </Box>
      </Box>
    );
  }

  if (mergeState.status === 'drafting-pr') {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="blue" padding={1} flexShrink={0}>
        <Text bold color="blue">📝 Drafting Pull Request...</Text>
        <Text>Branch: <Text color="cyan">{mergeState.branchName}</Text></Text>
        <Text dimColor>Agent is creating the PR using gh pr create</Text>
      </Box>
    );
  }

  if (mergeState.status === 'conflicts') {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} flexShrink={0}>
        <Text bold color="yellow">⚠️  Merge Conflicts Detected</Text>
        <Text>Branch: <Text color="cyan">{mergeState.branchName}</Text></Text>
        {mergeState.error && <Text color="yellow">{mergeState.error}</Text>}
        <Box marginTop={1}>
          <Text bold>Have the agent resolve conflicts? </Text>
          <Text color="cyan">[r]</Text>
          <Text> Resolve</Text>
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
          <Text bold>Have the agent resolve this? </Text>
          <Text color="cyan">[r]</Text>
          <Text> Resolve</Text>
        </Box>
      </Box>
    );
  }

  if (mergeState.status === 'resolving') {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="blue" padding={1} flexShrink={0}>
        <Text bold color="blue">🔧 Resolving Merge Conflicts...</Text>
        <Text>Branch: <Text color="cyan">{mergeState.branchName}</Text></Text>
        <Text dimColor>Agent is working on resolving merge conflicts</Text>
      </Box>
    );
  }

  if (mergeState.status === 'pr-created') {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1} flexShrink={0}>
        <Text bold color="green">✅ Pull Request Created</Text>
        <Text>Branch: <Text color="cyan">{mergeState.branchName}</Text></Text>
        {mergeState.prUrl && <Text>PR: <Text color="cyan">{mergeState.prUrl}</Text></Text>}
        <Text dimColor>Ready to cleanup worktree</Text>
        <Box marginTop={1}>
          <Text bold>Cleanup worktree? </Text>
          <Text color="green">[y]</Text>
          <Text> Yes  </Text>
          <Text color="red">[n]</Text>
          <Text> Keep</Text>
        </Box>
      </Box>
    );
  }

  return null;
};
