import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { renderMarkdown } from '../utils/markdownTerminalRenderer';
import { AnsiText } from '../utils/ansiToInk';

interface ScrollableMarkdownProps {
  content: string;
  height?: number;
  keybindings?: 'vi' | 'basic';
  onScroll?: (offset: number) => void;
  onBack?: () => void;
}

const useRenderedMarkdown = (content: string): string[] => {
  return useMemo(() => {
    if (!content) return [];
    try {
      const rendered = renderMarkdown(content);
      const lines = rendered.split('\n');
      while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
        lines.pop();
      }
      return lines;
    } catch (error) {
      console.error('Error in useRenderedMarkdown:', error);
      return content.split('\n');
    }
  }, [content]);
};

export const ScrollableMarkdown = ({
  content,
  height,
  keybindings = 'vi',
  onScroll,
  onBack
}: ScrollableMarkdownProps) => {
  const { stdout } = useStdout();
  const [scrollOffset, setScrollOffset] = useState(0);

  const termHeight = stdout?.rows || 24;
  const totalAvailableHeight = height || Math.max(1, termHeight - 10);

  useEffect(() => {
    setScrollOffset(0);
  }, [content]);

  const renderedLines = useRenderedMarkdown(content);

  // Calculate space needed for UI elements
  const borderSpace = 2; // borderStyle="round" takes 1 line top + 1 line bottom
  const paddingSpace = 2; // padding={1} takes 1 line top + 1 line bottom
  const contentAreaSpace = borderSpace + paddingSpace; // Total: 4 lines

  // Check if we need scroll indicator based on total content vs available space
  const contentLinesAvailable = Math.max(1, totalAvailableHeight - contentAreaSpace);
  const needsScrollIndicator = renderedLines.length > contentLinesAvailable;
  const scrollIndicatorSpace = needsScrollIndicator ? 2 : 0; // indicator + margin

  // Actual content lines that can be displayed after accounting for all UI elements
  const visibleLines = Math.max(1, totalAvailableHeight - contentAreaSpace - scrollIndicatorSpace);

  // Allow scrolling to show all lines, including the very last ones
  const maxScroll = Math.max(0, renderedLines.length - visibleLines);

  useEffect(() => {
    if (scrollOffset > maxScroll) {
      setScrollOffset(maxScroll);
    }
  }, [renderedLines.length, visibleLines, scrollOffset, maxScroll]);

  useEffect(() => {
    if (onScroll) {
      onScroll(scrollOffset);
    }
  }, [scrollOffset, onScroll]);

  useInput((input, key) => {
    if (onBack && (key.escape || input === 'q')) {
      onBack();
      return;
    }

    if ((key.upArrow || (keybindings === 'vi' && input === 'k')) && scrollOffset > 0) {
      setScrollOffset(scrollOffset - 1);
    }
    if ((key.downArrow || (keybindings === 'vi' && input === 'j')) && scrollOffset < maxScroll) {
      setScrollOffset(scrollOffset + 1);
    }
    if (key.pageUp && scrollOffset > 0) {
      setScrollOffset(Math.max(0, scrollOffset - visibleLines));
    }
    if (key.pageDown && scrollOffset < maxScroll) {
      setScrollOffset(Math.min(maxScroll, scrollOffset + visibleLines));
    }

    if (keybindings === 'vi') {
      if (input === 'g') {
        setScrollOffset(0);
      }
      if (input === 'G') {
        setScrollOffset(maxScroll);
      }
      if (key.ctrl && input === 'd' && scrollOffset < maxScroll) {
        const halfPage = Math.floor(visibleLines / 2);
        setScrollOffset(Math.min(maxScroll, scrollOffset + halfPage));
      }
      if (key.ctrl && input === 'u' && scrollOffset > 0) {
        const halfPage = Math.floor(visibleLines / 2);
        setScrollOffset(Math.max(0, scrollOffset - halfPage));
      }
    }
  });

  const visibleContent = renderedLines.slice(scrollOffset, scrollOffset + visibleLines);

  return (
    <Box flexDirection="column" height={totalAvailableHeight} overflow="hidden">
      <Box flexDirection="column" borderStyle="round" borderColor="gray" padding={1} flexGrow={1} minHeight={0} overflow="hidden">
        {visibleContent.length === 0 ? (
          <Text dimColor>Empty content</Text>
        ) : (
          visibleContent.map((line, idx) => (
            <Box key={scrollOffset + idx} height={1} flexShrink={0}>
              <AnsiText wrap="truncate-end">{line || ' '}</AnsiText>
            </Box>
          ))
        )}
      </Box>

      {needsScrollIndicator && (
        <Box marginTop={1} height={1} flexShrink={0}>
          <Text dimColor>
            Line {scrollOffset + 1}-{Math.min(scrollOffset + visibleLines, renderedLines.length)} of {renderedLines.length}
            {scrollOffset > 0 && ' ↑'}
            {scrollOffset < maxScroll && ' ↓'}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default ScrollableMarkdown;