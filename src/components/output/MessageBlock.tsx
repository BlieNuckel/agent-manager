import React from 'react';
import { Box } from 'ink';
import { Markdown } from '../Markdown';
import { renderMarkdown } from '../../utils/markdownTerminalRenderer';
import { AnsiText } from '../../utils/ansiToInk';

interface MessageBlockProps {
  lines: string[];
  width: number;
  skipLines?: number;
  maxLines?: number;
}

export const MessageBlock = ({ lines, skipLines = 0, maxLines }: MessageBlockProps) => {
  const text = lines.join('\n');

  if (skipLines === 0 && maxLines === undefined) {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Markdown>{text}</Markdown>
      </Box>
    );
  }

  // Parse markdown on the complete text first, before any slicing
  let renderedText: string;
  try {
    renderedText = renderMarkdown(text);
  } catch {
    // Fallback to original text if markdown parsing fails
    renderedText = text;
  }

  // Now slice the already-rendered output
  const renderedLines = renderedText.split('\n');
  const endLine = maxLines !== undefined ? skipLines + maxLines : renderedLines.length;
  const visibleLines = renderedLines.slice(skipLines, endLine);
  const visibleText = visibleLines.join('\n');

  return (
    <Box flexDirection="column" marginTop={skipLines === 0 ? 1 : 0}>
      <AnsiText wrap="wrap">{visibleText}</AnsiText>
    </Box>
  );
};
