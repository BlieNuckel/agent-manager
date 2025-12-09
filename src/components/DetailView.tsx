import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import Markdown from 'ink-markdown';
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
  const headerHeight = 4;
  const helpBarHeight = 3;
  const promptHeaderHeight = 1;
  const workDirHeight = 1;
  const outputHeaderHeight = 1;
  const outputBorderHeight = 2;

  const promptLines = agent.prompt.split('\n');
  const fixedHeight = headerHeight + promptHeaderHeight + workDirHeight + outputHeaderHeight + outputBorderHeight + helpBarHeight + permissionHeight;
  const availableHeight = Math.max(10, termHeight - fixedHeight);
  const maxPromptHeight = Math.min(promptLines.length, Math.floor(availableHeight * 0.3));
  const actualPromptHeight = Math.min(promptLines.length, maxPromptHeight);

  const visibleLines = availableHeight - actualPromptHeight;

  useInput((input, key) => {
    if (key.escape || input === 'q' || input === 'h') { onBack(); return; }

    if (agent.pendingPermission) return;

    if (key.upArrow || input === 'k') setScrollOffset(o => Math.max(0, o - 1));
    if (key.downArrow || input === 'j') setScrollOffset(o => Math.min(Math.max(0, agent.output.length - visibleLines), o + 1));
    if (input === 'g') setScrollOffset(0);
    if (input === 'G') setScrollOffset(Math.max(0, agent.output.length - visibleLines));
    if (input === 'p') setPromptScrollOffset(o => Math.max(0, o - 1));
    if (input === 'P') setPromptScrollOffset(o => Math.min(Math.max(0, promptLines.length - maxPromptHeight), o + 1));
  });

  useEffect(() => {
    const atBottom = scrollOffset >= agent.output.length - visibleLines - 2;
    if (atBottom || agent.status === 'working') {
      setScrollOffset(Math.max(0, agent.output.length - visibleLines));
    }
  }, [agent.output.length, visibleLines, scrollOffset, agent.status]);

  useEffect(() => {
    if (agent.pendingPermission) {
      setScrollOffset(Math.max(0, agent.output.length - visibleLines));
    }
  }, [agent.pendingPermission]);

  useEffect(() => {
    setScrollOffset(prev => Math.min(prev, Math.max(0, agent.output.length - visibleLines)));
  }, [visibleLines, agent.output.length]);

  const displayedLines = agent.output.slice(scrollOffset, scrollOffset + visibleLines);
  const displayedPromptLines = promptLines.slice(promptScrollOffset, promptScrollOffset + maxPromptHeight);
  const isPending = agent.title === 'Pending...';
  const promptNeedsScroll = promptLines.length > maxPromptHeight;

  const renderLine = (outputLine: typeof agent.output[number], index: number) => {
    const line = outputLine.text;
    const prefix = outputLine.isSubagent ? '  → ' : '';
    const subagentLabel = outputLine.isSubagent && outputLine.subagentType ? `[${outputLine.subagentType}] ` : '';

    // Check for special prefixes
    let statusPrefix = '';
    let statusColor = '';
    let content = line;

    if (line.startsWith('[x]')) {
      statusPrefix = '[x] ';
      statusColor = 'red';
      content = line.slice(4);
    } else if (line.startsWith('[+]')) {
      statusPrefix = '[+] ';
      statusColor = 'green';
      content = line.slice(4);
    } else if (line.startsWith('[>]')) {
      statusPrefix = '[>] ';
      statusColor = 'blue';
      content = line.slice(4);
    } else if (line.startsWith('[-]')) {
      statusPrefix = '[-] ';
      statusColor = 'yellow';
      content = line.slice(4);
    } else if (line.startsWith('[!]')) {
      statusPrefix = '[!] ';
      statusColor = 'yellow';
      content = line.slice(4);
    }

    return (
      <Box key={scrollOffset + index} flexDirection="row">
        {outputLine.isSubagent && <Text dimColor>{prefix}</Text>}
        {subagentLabel && <Text color="magenta" dimColor>{subagentLabel}</Text>}
        {statusPrefix && <Text color={statusColor}>{statusPrefix}</Text>}
        <Markdown>{content}</Markdown>
      </Box>
    );
  };

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

      <Box flexDirection="column" height={visibleLines + 2} flexShrink={0} borderStyle="round" borderColor="gray" padding={1} overflow="hidden">
        <Box flexShrink={0}>
          <Text dimColor>Output ({agent.output.length} lines, scroll: {scrollOffset + 1}-{Math.min(scrollOffset + visibleLines, agent.output.length)} of {agent.output.length})</Text>
        </Box>
        <Box flexDirection="column" overflow="hidden">
          {displayedLines.length === 0 ? (
            <Text dimColor>Waiting for output...</Text>
          ) : (
            displayedLines.map((line, i) => renderLine(line, i))
          )}
        </Box>
      </Box>

      {agent.pendingPermission && (
        <PermissionPrompt
          permission={agent.pendingPermission}
          onResponse={onPermissionResponse}
          onAlwaysAllow={onAlwaysAllow}
        />
      )}

      <Box flexShrink={0} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>
          <Text color="cyan">↑↓/jk</Text>{' '}Scroll{'  '}
          <Text color="cyan">g/G</Text>{' '}Top/Bottom{'  '}
          {promptNeedsScroll && <><Text color="cyan">p/P</Text>{' '}Prompt{'  '}</>}
          <Text color="cyan">q/h/Esc</Text>{' '}Back
        </Text>
      </Box>
    </Box>
  );
};
