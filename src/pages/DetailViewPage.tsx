import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import type { Agent } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PermissionPrompt } from '../components/PermissionPrompt';

interface DetailViewPageProps {
  agent: Agent;
  onPermissionResponse: (allowed: boolean) => void;
  onAlwaysAllow: () => void;
  onSendMessage?: (message: string) => void;
  onBack: () => void;
  chatMode?: boolean;
  onToggleChatMode?: () => void;
}

export const DetailViewPage = ({
  agent,
  onPermissionResponse,
  onAlwaysAllow,
  onSendMessage,
  onBack,
  chatMode = false,
  onToggleChatMode
}: DetailViewPageProps) => {
  const { stdout } = useStdout();
  const [scrollOffset, setScrollOffset] = useState(0);
  const [promptScrollOffset, setPromptScrollOffset] = useState(0);
  const [chatInput, setChatInput] = useState('');

  const termHeight = stdout?.rows || 24;

  const appHeaderHeight = 1;
  const appHelpBarHeight = 3;
  const availableForPage = termHeight - appHeaderHeight - appHelpBarHeight;

  const permissionHeight = agent.pendingPermission ? 10 : 0;
  const chatInputHeight = chatMode ? 3 : 0;
  const agentTitleHeight = 3;
  const promptHeaderHeight = 1;
  const workDirHeight = 1;
  const outputHeaderHeight = 1;
  const outputBorderHeight = 2;

  const promptLines = agent.prompt.split('\n');

  const fixedHeight = agentTitleHeight + promptHeaderHeight + workDirHeight + outputHeaderHeight + outputBorderHeight + permissionHeight + chatInputHeight;
  const availableHeight = Math.max(10, availableForPage - fixedHeight);

  const maxPromptHeight = Math.min(promptLines.length, Math.floor(availableHeight * 0.3));
  const promptActualHeight = Math.min(promptLines.length, maxPromptHeight);

  const visibleLines = Math.max(1, availableHeight - promptActualHeight);

  useInput((input, key) => {
    if (agent.pendingPermission) return;

    if (chatMode && key.escape && onToggleChatMode) {
      setChatInput('');
      onToggleChatMode();
      return;
    }

    if (chatMode) return;

    if (key.escape || input === 'q') {
      onBack();
      return;
    }

    const canChat = agent.status === 'working' || agent.status === 'idle';
    if (input === 'i' && onToggleChatMode && canChat) {
      onToggleChatMode();
      return;
    }

    if (key.upArrow || input === 'k') setScrollOffset(o => Math.max(0, o - 1));
    if (key.downArrow || input === 'j') setScrollOffset(o => Math.min(Math.max(0, agent.output.length - visibleLines), o + 1));
    if (input === 'g') setScrollOffset(0);
    if (input === 'G') setScrollOffset(Math.max(0, agent.output.length - visibleLines));
    if (input === 'p') setPromptScrollOffset(o => Math.max(0, o - 1));
    if (input === 'P') setPromptScrollOffset(o => Math.min(Math.max(0, promptLines.length - maxPromptHeight), o + 1));
  });

  const handleChatSubmit = () => {
    if (chatInput.trim() && onSendMessage) {
      onSendMessage(chatInput);
      setChatInput('');
      if (onToggleChatMode) {
        onToggleChatMode();
      }
    }
  };

  useEffect(() => {
    if (!agent.pendingPermission) {
      const atBottom = scrollOffset >= agent.output.length - visibleLines - 2;
      if (atBottom || agent.status === 'working') {
        setScrollOffset(Math.max(0, agent.output.length - visibleLines));
      }
    }
  }, [agent.output.length, agent.pendingPermission, visibleLines]);

  const displayedLines = agent.output.slice(scrollOffset, scrollOffset + visibleLines);
  const displayedPromptLines = promptLines.slice(promptScrollOffset, promptScrollOffset + maxPromptHeight);
  const isPending = agent.title === 'Pending...';
  const promptNeedsScroll = promptLines.length > maxPromptHeight;

  return (
    <>
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

      {chatMode && (
        <Box flexDirection="column" flexShrink={0} borderStyle="single" borderColor="cyan" paddingX={1}>
          <Text color="cyan" bold>Send message (Esc to cancel):</Text>
          <TextInput
            value={chatInput}
            onChange={setChatInput}
            onSubmit={handleChatSubmit}
          />
        </Box>
      )}
    </>
  );
};

export const getDetailViewHelp = (promptNeedsScroll: boolean, canChat: boolean, chatMode: boolean) => {
  if (chatMode) {
    return (
      <>
        <Text color="cyan">Enter</Text>{' '}Send{'  '}
        <Text color="cyan">Esc</Text>{' '}Cancel
      </>
    );
  }

  return (
    <>
      <Text color="cyan">↑↓/jk</Text>{' '}Scroll{'  '}
      <Text color="cyan">g/G</Text>{' '}Top/Bottom{'  '}
      {promptNeedsScroll && <><Text color="cyan">p/P</Text>{' '}Prompt{'  '}</>}
      {canChat && <><Text color="cyan">i</Text>{' '}Chat{'  '}</>}
      <Text color="cyan">q/Esc</Text>{' '}Back
    </>
  );
};
