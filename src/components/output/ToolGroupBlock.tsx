import React from 'react';
import { Box, Text } from 'ink';

interface ToolGroupBlockProps {
  count: number;
  errorCount: number;
  lines: string[];
  collapsed: boolean;
  blockNumber: number;
  skipLines?: number;
  maxLines?: number;
  showHeader?: boolean;
}

export const ToolGroupBlock = ({
  count,
  errorCount,
  lines,
  collapsed,
  blockNumber,
  skipLines = 0,
  maxLines,
  showHeader = true,
}: ToolGroupBlockProps) => {
  const arrow = collapsed ? '▸' : '▾';
  const countText = `${count} tool call${count !== 1 ? 's' : ''}`;

  if (collapsed) {
    if (!showHeader) return null;
    return (
      <Box>
        <Text dimColor>
          <Text color="cyan">[{blockNumber}]</Text> {arrow} {countText}
          {errorCount > 0 && <Text color="red"> ({errorCount} error{errorCount !== 1 ? 's' : ''})</Text>}
        </Text>
      </Box>
    );
  }

  const endLine = maxLines !== undefined ? skipLines + maxLines : lines.length;
  const visibleLines = lines.slice(skipLines, endLine);

  return (
    <Box flexDirection="column">
      {showHeader && (
        <Box>
          <Text dimColor>
            <Text color="cyan">[{blockNumber}]</Text> {arrow} {countText}
            {errorCount > 0 && <Text color="red"> ({errorCount} error{errorCount !== 1 ? 's' : ''})</Text>}
          </Text>
        </Box>
      )}
      {visibleLines.map((line, i) => {
        const isError = line.trim().startsWith('Error:');
        return (
          <Box key={skipLines + i} paddingLeft={4}>
            <Text dimColor={!isError} color={isError ? 'red' : undefined}>{line}</Text>
          </Box>
        );
      })}
    </Box>
  );
};
