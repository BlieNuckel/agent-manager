import React from 'react';
import { Box, Text } from 'ink';
import type { Agent } from '../types';
import { StatusBadge } from './StatusBadge';
import { ContextHealthIndicator } from './ContextHealthIndicator';
import { formatTime } from '../utils/helpers';

const getAgentTypeLabel = (agent: Agent): string | null => {
  if (agent.customAgentTypeId) {
    return agent.customAgentTypeId;
  }
  if (agent.agentType !== 'normal') {
    return agent.agentType;
  }
  return null;
};

interface AgentItemProps {
  agent: Agent;
  selected: boolean;
  isWorkflowChild?: boolean;
}

export const AgentItem = React.memo(({ agent, selected, isWorkflowChild = false }: AgentItemProps) => {
  const isPending = agent.title === 'Pending...';
  const typeLabel = getAgentTypeLabel(agent);
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        {isWorkflowChild && <Text dimColor>  </Text>}
        <Text color={selected ? 'cyan' : 'white'} bold={selected}>{selected ? '> ' : '  '}</Text>
        {isWorkflowChild && <Text dimColor>└─ </Text>}
        <StatusBadge status={agent.status} />
        <Text bold={selected} color={selected ? 'cyan' : 'white'} dimColor={isPending} italic={isPending}> {agent.title}</Text>
        <Text dimColor> ({formatTime(agent.updatedAt)})</Text>
        {typeLabel && <Text color="blue"> [{typeLabel}]</Text>}
        {agent.pendingPermission && <Text color="yellow"> [!] Permission needed</Text>}
        {agent.pendingQuestion && (
          <Text color="magenta"> [?] {agent.pendingQuestion.questions.map(q => q.header).join(', ')}</Text>
        )}
        {agent.pendingMerge && agent.pendingMerge.status === 'ready' && <Text color="green"> [✓] Merge Ready</Text>}
        {agent.pendingMerge && agent.pendingMerge.status === 'conflicts' && <Text color="yellow"> [!] Merge Conflicts</Text>}
        {agent.pendingMerge && agent.pendingMerge.status === 'failed' && <Text color="red"> [x] Merge Failed</Text>}
        {agent.pendingMerge && agent.pendingMerge.status === 'resolving' && <Text color="blue"> [~] Resolving Conflicts</Text>}
        <Box marginLeft={1}>
          <ContextHealthIndicator agent={agent} compact />
        </Box>
      </Box>
      <Box marginLeft={14}>
        <Text dimColor wrap="truncate">{agent.prompt.replace(/\n/g, ' ').slice(0, 60)}{agent.prompt.length > 60 ? '...' : ''}</Text>
      </Box>
      {agent.worktreeName && (
        <Box marginLeft={14}>
          <Text color="magenta">* {agent.worktreeName}</Text>
        </Box>
      )}
      {agent.repository && (
        <Box marginLeft={14}>
          <Text dimColor>📁 {agent.repository.name}</Text>
        </Box>
      )}
    </Box>
  );
});
