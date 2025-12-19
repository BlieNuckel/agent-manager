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
  const visibleLines = height || Math.max(1, termHeight - 10);

  useEffect(() => {
    setScrollOffset(0);
  }, [content]);

  const renderedLines = useRenderedMarkdown(content);
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
    <Box flexDirection="column" minHeight={0} flexGrow={1}>
      <Box flexDirection="column" borderStyle="round" borderColor="gray" padding={1} minHeight={0} flexGrow={1}>
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

      {maxScroll > 0 && (
        <Box marginTop={1} height={1}>
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