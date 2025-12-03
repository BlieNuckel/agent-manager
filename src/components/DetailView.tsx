import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { Agent } from '../types';
import { StatusBadge } from './StatusBadge';
import { PermissionPrompt } from './PermissionPrompt';
import { MergeConfirmationPrompt } from './MergeConfirmationPrompt';

export const DetailView = ({ agent, onBack, onPermissionResponse, onAlwaysAllow, onMergeConfirmationResponse }: {
  agent: Agent;
  onBack: () => void;
  onPermissionResponse: (allowed: boolean) => void;
  onAlwaysAllow: () => void;
  onMergeConfirmationResponse: (confirmed: boolean) => void;
}) => {
  const app = useApp();
  const [scrollOffset, setScrollOffset] = useState(0);

  const termHeight = (app as any).stdout?.rows || 24;
  const permissionHeight = agent.pendingPermission ? 10 : 0;
  const mergeConfirmationHeight = agent.pendingMergeConfirmation ? 12 : 0;
  const visibleLines = termHeight - 8 - permissionHeight - mergeConfirmationHeight;

  useInput((input, key) => {
    if (agent.pendingPermission || agent.pendingMergeConfirmation) return;

    if (key.escape || input === 'q') { onBack(); return; }
    if (key.upArrow || input === 'k') setScrollOffset(o => Math.max(0, o - 1));
    if (key.downArrow || input === 'j') setScrollOffset(o => Math.min(Math.max(0, agent.output.length - visibleLines), o + 1));
    if (input === 'g') setScrollOffset(0);
    if (input === 'G') setScrollOffset(Math.max(0, agent.output.length - visibleLines));
  });

  useEffect(() => {
    if (!agent.pendingPermission && !agent.pendingMergeConfirmation) {
      const atBottom = scrollOffset >= agent.output.length - visibleLines - 2;
      if (atBottom || agent.status === 'working') {
        setScrollOffset(Math.max(0, agent.output.length - visibleLines));
      }
    }
  }, [agent.output.length, agent.pendingPermission, agent.pendingMergeConfirmation]);

  const displayedLines = agent.output.slice(scrollOffset, scrollOffset + visibleLines);
  const isPending = agent.title === 'Pending...';

  return (
    <Box flexDirection="column" height="100%">
      <Box borderStyle="single" borderColor={agent.pendingPermission || agent.pendingMergeConfirmation ? 'yellow' : 'cyan'} paddingX={1}>
        <StatusBadge status={agent.status} />
        <Text bold color={agent.pendingPermission || agent.pendingMergeConfirmation ? 'yellow' : 'cyan'} dimColor={isPending} italic={isPending}> {agent.title}</Text>
        {agent.worktreeName && <Text color="magenta"> * {agent.worktreeName}</Text>}
        {agent.mergeStatus === 'merged' && <Text color="green"> [merged]</Text>}
        {agent.mergeStatus === 'conflict' && <Text color="yellow"> [needs manual merge]</Text>}
        {agent.mergeStatus === 'failed' && <Text color="red"> [merge failed]</Text>}
        {agent.mergeStatus === 'pending' && <Text color="cyan"> [checking merge...]</Text>}
        {agent.mergeStatus === 'awaiting_confirmation' && <Text color="yellow"> [awaiting confirmation]</Text>}
        {agent.sessionId && <Text dimColor> (session: {agent.sessionId.slice(0, 8)}...)</Text>}
      </Box>

      <Box>
        <Text dimColor>Prompt: </Text>
        <Text>{agent.prompt}</Text>
      </Box>

      <Box>
        <Text dimColor>Working dir: </Text>
        <Text>{agent.workDir}</Text>
      </Box>

      <Box flexDirection="column" borderStyle="round" borderColor="gray" padding={1} height={visibleLines + 3}>
        <Box>
          <Text dimColor>Output ({agent.output.length} lines)</Text>
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

      {agent.pendingMergeConfirmation && (
        <MergeConfirmationPrompt
          confirmation={agent.pendingMergeConfirmation}
          onResponse={onMergeConfirmationResponse}
        />
      )}

      {!agent.pendingPermission && !agent.pendingMergeConfirmation && (
        <Box borderStyle="single" borderColor="gray" paddingX={1}>
          <Text dimColor>
            <Text color="cyan">↑↓/jk</Text>{' '}Scroll{'  '}
            <Text color="cyan">g/G</Text>{' '}Top/Bottom{'  '}
            <Text color="cyan">q/Esc</Text>{' '}Back
          </Text>
        </Box>
      )}
    </Box>
  );
};
