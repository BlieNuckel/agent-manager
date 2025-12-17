import React, { useState, useEffect } from 'react';
import { Box, Text, useStdout } from 'ink';
import fs from 'fs';
import type { ArtifactInfo } from '../types';
import ScrollableMarkdown from '../components/ScrollableMarkdown';

interface ArtifactDetailPageProps {
  artifact: ArtifactInfo;
  onBack: () => void;
}

export const ArtifactDetailPage = ({ artifact, onBack }: ArtifactDetailPageProps) => {
  const { stdout } = useStdout();
  const [content, setContent] = useState<string>('');

  const termHeight = stdout?.rows || 24;
  const appHeaderHeight = 1;
  const appHelpBarHeight = 3;
  const availableForPage = termHeight - appHeaderHeight - appHelpBarHeight;
  const artifactHeaderHeight = 3;
  const scrollIndicatorHeight = 1;
  const visibleLines = Math.max(1, availableForPage - artifactHeaderHeight - scrollIndicatorHeight);

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


  return (
    <Box flexDirection="column" flexGrow={1} minHeight={0}>
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text bold color="cyan">{artifact.name}</Text>
          {artifact.templateId && (
            <Text> </Text>
          )}
          {artifact.templateId && (
            <Text color="magenta" bold>[{artifact.templateId}]</Text>
          )}
          {artifact.templateValid === false && (
            <Text color="yellow"> (incomplete)</Text>
          )}
        </Box>
        <Text dimColor>Modified: {artifact.modifiedAt.toLocaleString()}</Text>
        {artifact.frontmatter?.title && (
          <Text dimColor>Title: {String(artifact.frontmatter.title)}</Text>
        )}
      </Box>

      <ScrollableMarkdown
        content={content}
        height={visibleLines}
        keybindings="vi"
        onBack={onBack}
      />
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
