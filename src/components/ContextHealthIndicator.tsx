import React from 'react';
import { Box, Text } from 'ink';
import type { Agent } from '../types';
import { getContextHealth, formatTokenCount } from '../utils/contextEstimation';

interface ContextHealthIndicatorProps {
  agent: Agent;
  compact?: boolean;
}

export const ContextHealthIndicator = ({ agent, compact = false }: ContextHealthIndicatorProps) => {
  const health = getContextHealth(agent);

  const barLength = compact ? 5 : 10;
  const filledBlocks = Math.floor((health.percentUsed / 100) * barLength);
  const bar = '█'.repeat(filledBlocks) + '░'.repeat(barLength - filledBlocks);

  const color = health.status === 'critical' ? 'red'
              : health.status === 'warning' ? 'yellow'
              : 'green';

  const percentDisplay = Math.round(health.percentUsed);
  const prefix = health.isEstimate ? '~' : '';

  if (compact) {
    return (
      <Text color={color}>
        {bar} {prefix}{percentDisplay}%
      </Text>
    );
  }

  const tokenDisplay = health.actualTokens
    ? `${formatTokenCount(health.actualTokens)}/${formatTokenCount(health.contextWindow)}`
    : `~${formatTokenCount(health.estimatedTokens)}/${formatTokenCount(health.contextWindow)}`;

  return (
    <Box>
      <Text dimColor>Context: </Text>
      <Text color={color}>{bar} {percentDisplay}%</Text>
      <Text dimColor> ({tokenDisplay} tokens)</Text>
    </Box>
  );
};
