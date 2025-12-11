import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import chalk from 'chalk';
import { AnsiText } from '../utils/ansiToInk';
import fs from 'fs';
import type { ArtifactInfo } from '../types';

interface ArtifactDetailPageProps {
  artifact: ArtifactInfo;
  onBack: () => void;
}

chalk.level = 3;

const renderer = new TerminalRenderer({
  code: chalk.yellow,
  codespan: chalk.yellow,
  tableOptions: {
    style: {
      head: ['cyan'],
      border: ['gray']
    }
  }
});

marked.setOptions({ renderer });

const useRenderedMarkdown = (content: string): string[] => {
  return useMemo(() => {
    if (!content) return [];
    try {
      const rendered = marked.parse(content);
      const output = typeof rendered === 'string' ? rendered : '';
      const lines = output.split('\n');
      while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
        lines.pop();
      }
      return lines;
    } catch {
      return content.split('\n');
    }
  }, [content]);
};

export const ArtifactDetailPage = ({ artifact, onBack }: ArtifactDetailPageProps) => {
  const { stdout } = useStdout();
  const [content, setContent] = useState<string>('');
  const [scrollOffset, setScrollOffset] = useState(0);

  const termHeight = stdout?.rows || 24;
  const appHeaderHeight = 1;
  const appHelpBarHeight = 3;
  const availableForPage = termHeight - appHeaderHeight - appHelpBarHeight;
  const artifactHeaderHeight = 3;
  const borderHeight = 2;
  const paddingHeight = 2;
  const scrollIndicatorHeight = 1;
  const visibleLines = Math.max(1, availableForPage - artifactHeaderHeight - borderHeight - paddingHeight - scrollIndicatorHeight);

  useEffect(() => {
    const loadContent = async () => {
      setScrollOffset(0);
      try {
        const data = await fs.promises.readFile(artifact.path, 'utf-8');
        setContent(data);
      } catch (err) {
        setContent(`Error reading file: ${err}`);
      }
    };
    loadContent();
  }, [artifact.path]);

  const renderedLines = useRenderedMarkdown(content);
  const maxScroll = Math.max(0, renderedLines.length - visibleLines);

  useEffect(() => {
    if (scrollOffset > maxScroll) {
      setScrollOffset(maxScroll);
    }
  }, [renderedLines.length, visibleLines, scrollOffset, maxScroll]);

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onBack();
      return;
    }

    if ((key.upArrow || input === 'k') && scrollOffset > 0) {
      setScrollOffset(scrollOffset - 1);
    }
    if ((key.downArrow || input === 'j') && scrollOffset < maxScroll) {
      setScrollOffset(scrollOffset + 1);
    }
    if (key.pageUp && scrollOffset > 0) {
      setScrollOffset(Math.max(0, scrollOffset - visibleLines));
    }
    if (key.pageDown && scrollOffset < maxScroll) {
      setScrollOffset(Math.min(maxScroll, scrollOffset + visibleLines));
    }

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
  });

  const visibleContent = renderedLines.slice(scrollOffset, scrollOffset + visibleLines);

  return (
    <Box flexDirection="column" flexGrow={1} minHeight={0}>
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan">{artifact.name}</Text>
        <Text dimColor>Modified: {artifact.modifiedAt.toLocaleString()}</Text>
        <Text dimColor>Path: {artifact.path}</Text>
      </Box>

      <Box flexDirection="column" borderStyle="round" borderColor="gray" padding={1} minHeight={0} flexGrow={1}>
        {visibleContent.length === 0 ? (
          <Text dimColor>Empty file</Text>
        ) : (
          visibleContent.map((line, idx) => (
            <Box key={scrollOffset + idx} height={1} flexShrink={0}>
              <AnsiText wrap="truncate-end">{line || ' '}</AnsiText>
            </Box>
          ))
        )}
      </Box>

      <Box marginTop={1} height={1}>
        {maxScroll > 0 ? (
          <Text dimColor>
            Line {scrollOffset + 1}-{Math.min(scrollOffset + visibleLines, renderedLines.length)} of {renderedLines.length}
            {scrollOffset > 0 && ' ↑'}
            {scrollOffset < maxScroll && ' ↓'}
          </Text>
        ) : (
          <Text dimColor> </Text>
        )}
      </Box>
    </Box>
  );
};

export const getArtifactDetailHelp = () => {
  return (
    <>
      <Text color="cyan">↑↓jk</Text> Scroll{' '}
      <Text color="cyan">^D/^U</Text> Half-page{' '}
      <Text color="cyan">g/G</Text> Top/Bottom{' '}
      <Text color="cyan">Esc/q</Text> Back
    </>
  );
};
