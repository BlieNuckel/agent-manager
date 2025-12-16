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
}

export const ToolGroupBlock = ({
  count,
  errorCount,
  lines,
  collapsed,
  blockNumber,
  skipLines = 0,
  maxLines,
}: ToolGroupBlockProps) => {
  const arrow = collapsed ? '▸' : '▾';
  const countText = `${count} tool call${count !== 1 ? 's' : ''}`;

  if (collapsed) {
    if (skipLines > 0) return null;
    return (
      <Box>
        <Text dimColor>
          <Text color="cyan">[{blockNumber}]</Text> {arrow} {countText}
          {errorCount > 0 && <Text color="red"> ({errorCount} error{errorCount !== 1 ? 's' : ''})</Text>}
        </Text>
      </Box>
    );
  }

  const showHeader = skipLines === 0;
  const contentSkipLines = showHeader ? Math.max(0, skipLines) : Math.max(0, skipLines - 1);
  const endLine = maxLines !== undefined ? contentSkipLines + (maxLines - (showHeader ? 1 : 0)) : lines.length;
  const visibleLines = lines.slice(contentSkipLines, endLine);

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
          <Box key={contentSkipLines + i} paddingLeft={4}>
            <Text dimColor={!isError} color={isError ? 'red' : undefined}>{line}</Text>
          </Box>
        );
      })}
    </Box>
  );
};
