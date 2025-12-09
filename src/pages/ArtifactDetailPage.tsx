import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import Markdown from 'ink-markdown';
import fs from 'fs';
import type { ArtifactInfo } from '../types';

interface ArtifactDetailPageProps {
  artifact: ArtifactInfo;
  onBack: () => void;
}

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
  const visibleLines = Math.max(1, availableForPage - artifactHeaderHeight - borderHeight);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const data = await fs.promises.readFile(artifact.path, 'utf-8');
        setContent(data);
      } catch (err) {
        setContent(`Error reading file: ${err}`);
      }
    };
    loadContent();
  }, [artifact.path]);

  const contentLines = content.split('\n');
  const maxScroll = Math.max(0, contentLines.length - visibleLines);

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
  });

  const visibleContent = contentLines.slice(scrollOffset, scrollOffset + visibleLines);

  return (
    <Box flexDirection="column" flexGrow={1} minHeight={0}>
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan">{artifact.name}</Text>
        <Text dimColor>Modified: {artifact.modifiedAt.toLocaleString()}</Text>
        <Text dimColor>Path: {artifact.path}</Text>
      </Box>

      <Box flexDirection="column" borderStyle="round" borderColor="gray" padding={1} flexGrow={1} minHeight={0}>
        {visibleContent.map((line, idx) => (
          <Box key={scrollOffset + idx}>
            <Markdown>{line || ' '}</Markdown>
          </Box>
        ))}
      </Box>

      {maxScroll > 0 && (
        <Box marginTop={1}>
          <Text dimColor>
            Line {scrollOffset + 1}-{Math.min(scrollOffset + visibleLines, contentLines.length)} of {contentLines.length}
            {scrollOffset > 0 && ' (scroll up for more)'}
            {scrollOffset < maxScroll && ' (scroll down for more)'}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export const getArtifactDetailHelp = () => {
  return (
    <>
      <Text color="cyan">↑↓jk</Text> Scroll{' '}
      <Text color="cyan">PgUp/PgDn</Text> Page{' '}
      <Text color="cyan">Esc/q</Text> Back
    </>
  );
};
