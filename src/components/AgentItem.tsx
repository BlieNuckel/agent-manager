import React from 'react';
import { Box, Text } from 'ink';
import type { Agent } from '../types';
import { StatusBadge } from './StatusBadge';
import { formatTime } from '../utils/helpers';

export const AgentItem = ({ agent, selected }: { agent: Agent; selected: boolean }) => {
  const isPending = agent.title === 'Pending...';
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color={selected ? 'cyan' : 'white'} bold={selected}>{selected ? '> ' : '  '}</Text>
        <StatusBadge status={agent.status} />
        <Text bold={selected} color={selected ? 'cyan' : 'white'} dimColor={isPending} italic={isPending}> {agent.title}</Text>
        <Text dimColor> ({formatTime(agent.updatedAt)})</Text>
        {agent.pendingPermission && <Text color="yellow"> [!] Permission needed</Text>}
        {agent.pendingMergeConfirmation && <Text color="yellow"> [!] Merge confirmation needed</Text>}
        {agent.mergeStatus === 'conflict' && <Text color="yellow"> [!] Needs manual merge</Text>}
        {agent.mergeStatus === 'failed' && <Text color="red"> [x] Merge failed</Text>}
      </Box>
      <Box marginLeft={14}>
        <Text dimColor wrap="truncate">{agent.prompt.slice(0, 60)}{agent.prompt.length > 60 ? '...' : ''}</Text>
      </Box>
      {agent.worktreeName && (
        <Box marginLeft={14}>
          <Text color="magenta">* {agent.worktreeName}</Text>
          {agent.mergeStatus === 'merged' && <Text color="green"> (merged)</Text>}
          {agent.mergeStatus === 'pending' && <Text color="cyan"> (checking merge...)</Text>}
          {agent.mergeStatus === 'awaiting_confirmation' && <Text color="yellow"> (needs confirmation)</Text>}
        </Box>
      )}
    </Box>
  );
};
