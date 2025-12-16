import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import type { OutputLine, SubagentStats } from '../../types';

interface SubagentBlockProps {
  id: string;
  subagentType: string;
  status: 'running' | 'completed';
  output: OutputLine[];
  stats?: SubagentStats;
  collapsed: boolean;
  blockNumber: number;
  width: number;
  skipLines?: number;
  maxLines?: number;
  showHeader?: boolean;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m${remainingSeconds}s`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return String(tokens);
}

export const SubagentBlock = ({
  subagentType,
  status,
  output,
  stats,
  collapsed,
  blockNumber,
  skipLines = 0,
  maxLines,
  showHeader = true,
}: SubagentBlockProps) => {
  const [elapsed, setElapsed] = useState(0);
  const arrow = collapsed ? '▸' : '▾';
  const isRunning = status === 'running';

  useEffect(() => {
    if (!isRunning || stats?.startTime === undefined) return;

    const updateElapsed = () => {
      setElapsed(Date.now() - stats.startTime);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [isRunning, stats?.startTime]);

  const duration = stats?.endTime && stats?.startTime
    ? stats.endTime - stats.startTime
    : isRunning && stats?.startTime
      ? elapsed
      : 0;

  const totalTokens = (stats?.inputTokens || 0) + (stats?.outputTokens || 0);
  const toolCalls = stats?.toolCallCount || output.filter(l => l.text.startsWith('[>')).length;

  const statusIcon = isRunning ? '⟳' : '✓';
  const statusColor = isRunning ? 'yellow' : 'green';

  const headerParts: string[] = [];
  if (duration > 0) headerParts.push(`⏱ ${formatDuration(duration)}`);
  if (totalTokens > 0) headerParts.push(`↗ ${formatTokens(totalTokens)} tok`);
  if (toolCalls > 0) headerParts.push(`🔧 ${toolCalls}`);

  const header = (
    <Box>
      <Text color="cyan">[{blockNumber}]</Text>
      <Text> {arrow} </Text>
      <Text color={statusColor}>{statusIcon}</Text>
      <Text color="magenta"> [{subagentType}]</Text>
      {headerParts.length > 0 && (
        <Text dimColor> {headerParts.join('  ')}</Text>
      )}
      {isRunning && !stats?.startTime && <Text dimColor> working...</Text>}
    </Box>
  );

  if (collapsed) {
    if (!showHeader) return null;
    return header;
  }

  const endLine = maxLines !== undefined ? skipLines + maxLines : output.length;
  const visibleOutput = output.slice(skipLines, endLine);

  return (
    <Box flexDirection="column">
      {showHeader && header}
      {visibleOutput.map((line, i) => (
        <Box key={skipLines + i} paddingLeft={2}>
          <Text dimColor>│ </Text>
          <Text wrap="wrap">
            {line.text.startsWith('[x]') ? <Text color="red">{line.text}</Text> :
              line.text.startsWith('[+]') ? <Text color="green">{line.text}</Text> :
                line.text.startsWith('[>]') ? <Text dimColor>{line.text}</Text> :
                  line.text.startsWith('[-]') || line.text.startsWith('[!]') ? <Text color="yellow">{line.text}</Text> :
                    line.text}
          </Text>
        </Box>
      ))}
    </Box>
  );
};
