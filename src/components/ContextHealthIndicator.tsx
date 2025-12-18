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

  // Hide if healthy (below critical amount)
  if (health.status === 'healthy') {
    return null;
  }

  const color = health.status === 'critical' ? 'red' : 'yellow';
  const percentDisplay = Math.round(health.percentUsed);
  const prefix = health.isEstimate ? '~' : '';

  // Show only percentage number (no bar) when warning or critical
  if (compact) {
    return (
      <Text color={color}>
        {prefix}{percentDisplay}%
      </Text>
    );
  }

  const tokenDisplay = health.actualTokens
    ? `${formatTokenCount(health.actualTokens)}/${formatTokenCount(health.contextWindow)}`
    : `~${formatTokenCount(health.estimatedTokens)}/${formatTokenCount(health.contextWindow)}`;

  return (
    <Box>
      <Text dimColor>Context: </Text>
      <Text color={color}>{percentDisplay}%</Text>
      <Text dimColor> ({tokenDisplay} tokens)</Text>
    </Box>
  );
};
