import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { Agent } from '../types';
import { StatusBadge } from './StatusBadge';
import { PermissionPrompt } from './PermissionPrompt';

export const DetailView = ({ agent, onBack, onPermissionResponse, onAlwaysAllow }: {
  agent: Agent;
  onBack: () => void;
  onPermissionResponse: (allowed: boolean) => void;
  onAlwaysAllow: () => void;
}) => {
  const app = useApp();
  const [scrollOffset, setScrollOffset] = useState(0);
  const [promptScrollOffset, setPromptScrollOffset] = useState(0);

  const termHeight = (app as any).stdout?.rows || 24;
  const permissionHeight = agent.pendingPermission ? 10 : 0;
  const headerHeight = 3;
  const helpBarHeight = 3;

  const promptLines = agent.prompt.split('\n');
  const maxPromptHeight = 10;
  const actualPromptHeight = Math.min(promptLines.length, maxPromptHeight);
  const promptHeaderHeight = 1;
  const workDirHeight = 1;

  const totalHeaderHeight = headerHeight + promptHeaderHeight + actualPromptHeight + workDirHeight;
  const visibleLines = termHeight - totalHeaderHeight - helpBarHeight - permissionHeight;

  useInput((input, key) => {
    if (agent.pendingPermission) return;

    if (key.escape || input === 'q') { onBack(); return; }
    if (key.upArrow || input === 'k') setScrollOffset(o => Math.max(0, o - 1));
    if (key.downArrow || input === 'j') setScrollOffset(o => Math.min(Math.max(0, agent.output.length - visibleLines), o + 1));
    if (input === 'g') setScrollOffset(0);
    if (input === 'G') setScrollOffset(Math.max(0, agent.output.length - visibleLines));
    if (input === 'p') setPromptScrollOffset(o => Math.max(0, o - 1));
    if (input === 'P') setPromptScrollOffset(o => Math.min(Math.max(0, promptLines.length - maxPromptHeight), o + 1));
  });

  useEffect(() => {
    if (!agent.pendingPermission) {
      const atBottom = scrollOffset >= agent.output.length - visibleLines - 2;
      if (atBottom || agent.status === 'working') {
        setScrollOffset(Math.max(0, agent.output.length - visibleLines));
      }
    }
  }, [agent.output.length, agent.pendingPermission]);

  const displayedLines = agent.output.slice(scrollOffset, scrollOffset + visibleLines);
  const displayedPromptLines = promptLines.slice(promptScrollOffset, promptScrollOffset + maxPromptHeight);
  const isPending = agent.title === 'Pending...';
  const promptNeedsScroll = promptLines.length > maxPromptHeight;

  return (
    <Box flexDirection="column" height={termHeight}>
      <Box flexDirection="column" flexShrink={0}>
        <Box borderStyle="single" borderColor={agent.pendingPermission ? 'yellow' : 'cyan'} paddingX={1}>
          <StatusBadge status={agent.status} />
          <Text bold color={agent.pendingPermission ? 'yellow' : 'cyan'} dimColor={isPending} italic={isPending}> {agent.title}</Text>
          {agent.worktreeName && <Text color="magenta"> * {agent.worktreeName}</Text>}
          {agent.sessionId && <Text dimColor> (session: {agent.sessionId.slice(0, 8)}...)</Text>}
        </Box>

        <Box flexDirection="column">
          <Box>
            <Text dimColor>Prompt {promptNeedsScroll && `(${promptScrollOffset + 1}-${promptScrollOffset + displayedPromptLines.length} of ${promptLines.length} lines)`}: </Text>
          </Box>
          {displayedPromptLines.map((line, i) => (
            <Text key={promptScrollOffset + i}>{line}</Text>
          ))}
        </Box>

        <Box>
          <Text dimColor>Working dir: </Text>
          <Text>{agent.workDir}</Text>
        </Box>
      </Box>

      <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor="gray" padding={1}>
        <Box flexShrink={0}>
          <Text dimColor>Output ({agent.output.length} lines, scroll: {scrollOffset + 1}-{Math.min(scrollOffset + visibleLines, agent.output.length)} of {agent.output.length})</Text>
        </Box>
        {displayedLines.length === 0 ? (
          <Text dimColor>Waiting for output...</Text>
        ) : (
          displayedLines.map((line, i) => (
            <Text key={scrollOffset + i} wrap="truncate">
              {line.startsWith('[x]') ? <Text color="red">{line}</Text> :
                line.startsWith('[+]') ? <Text color="green">{line}</Text> :
                  line.startsWith('[>]') ? <Text color="blue">{line}</Text> :
                    line.startsWith('[-]') ? <Text color="yellow">{line}</Text> :
                      line.startsWith('[!]') ? <Text color="yellow">{line}</Text> :
                        line}
            </Text>
          ))
        )}
      </Box>

      {agent.pendingPermission && (
        <PermissionPrompt
          permission={agent.pendingPermission}
          onResponse={onPermissionResponse}
          onAlwaysAllow={onAlwaysAllow}
        />
      )}

      {!agent.pendingPermission && (
        <Box flexShrink={0} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text dimColor>
            <Text color="cyan">↑↓/jk</Text>{' '}Scroll{'  '}
            <Text color="cyan">g/G</Text>{' '}Top/Bottom{'  '}
            {promptNeedsScroll && <><Text color="cyan">p/P</Text>{' '}Prompt{'  '}</>}
            <Text color="cyan">q/Esc</Text>{' '}Back
          </Text>
        </Box>
      )}
    </Box>
  );
};
