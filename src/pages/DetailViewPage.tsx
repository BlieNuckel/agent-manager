import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import type { Agent } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PermissionPrompt } from '../components/PermissionPrompt';
import { QuestionPrompt } from '../components/QuestionPrompt';
import { MergePrompt } from '../components/MergePrompt';

interface DetailViewPageProps {
  agent: Agent;
  onPermissionResponse: (allowed: boolean) => void;
  onAlwaysAllow: () => void;
  onAlwaysAllowInRepo?: () => void;
  onQuestionResponse: (answers: Record<string, string | string[]>) => void;
  onMergeResponse?: (approved: boolean) => void;
  onSendMessage?: (message: string) => void;
  onBack: () => void;
  chatMode?: boolean;
  onToggleChatMode?: () => void;
}

export const DetailViewPage = ({
  agent,
  onPermissionResponse,
  onAlwaysAllow,
  onAlwaysAllowInRepo,
  onQuestionResponse,
  onMergeResponse,
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
  const questionHeight = agent.pendingQuestion ? Math.min(15, 8 + (agent.pendingQuestion.questions.length * 3)) : 0;
  const mergePromptHeight = agent.pendingMerge ? 8 : 0;
  const chatInputHeight = chatMode ? 3 : 0;
  const agentTitleHeight = 3;
  const promptHeaderHeight = 1;
  const workDirHeight = 1;
  const outputHeaderHeight = 1;
  const outputBorderHeight = 2;

  const promptLines = agent.prompt.split('\n');

  const fixedHeight = agentTitleHeight + promptHeaderHeight + workDirHeight + outputHeaderHeight + outputBorderHeight + permissionHeight + questionHeight + mergePromptHeight + chatInputHeight;
  const availableHeight = Math.max(10, availableForPage - fixedHeight);

  const maxPromptHeight = Math.min(promptLines.length, Math.floor(availableHeight * 0.3));
  const promptActualHeight = Math.min(promptLines.length, maxPromptHeight);

  const visibleLines = Math.max(1, availableHeight - promptActualHeight);

  useInput((input, key) => {
    if (chatMode && key.escape && onToggleChatMode) {
      setChatInput('');
      onToggleChatMode();
      return;
    }

    if (key.escape || input === 'q') {
      onBack();
      return;
    }

    if (chatMode) return;

    if (agent.pendingPermission) return;
    if (agent.pendingQuestion) return;

    if (agent.pendingMerge) {
      if (agent.pendingMerge.status === 'ready' && onMergeResponse) {
        if (input === 'y') {
          onMergeResponse(true);
        } else if (input === 'n') {
          onMergeResponse(false);
        }
      } else if (agent.pendingMerge.status === 'conflicts' || agent.pendingMerge.status === 'failed') {
        if (onMergeResponse) {
          onMergeResponse(false);
        }
      }
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
    if (!agent.pendingPermission && !agent.pendingQuestion) {
      const atBottom = scrollOffset >= agent.output.length - visibleLines - 2;
      if (atBottom || agent.status === 'working') {
        setScrollOffset(Math.max(0, agent.output.length - visibleLines));
      }
    }
  }, [agent.output.length, agent.pendingPermission, agent.pendingQuestion, visibleLines]);

  const displayedLines = agent.output.slice(scrollOffset, scrollOffset + visibleLines);
  const displayedPromptLines = promptLines.slice(promptScrollOffset, promptScrollOffset + maxPromptHeight);
  const isPending = agent.title === 'Pending...';
  const promptNeedsScroll = promptLines.length > maxPromptHeight;

  return (
    <>
      <Box flexDirection="column" flexShrink={0}>
        <Box borderStyle="single" borderColor={agent.pendingPermission ? 'yellow' : agent.pendingQuestion ? 'magenta' : 'cyan'} paddingX={1}>
          <StatusBadge status={agent.status} />
          <Text bold color={agent.pendingPermission ? 'yellow' : agent.pendingQuestion ? 'magenta' : 'cyan'} dimColor={isPending} italic={isPending}> {agent.title}</Text>
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
          displayedLines.map((outputLine, i) => {
            const line = outputLine.text;
            const prefix = outputLine.isSubagent ? '  → ' : '';
            const subagentLabel = outputLine.isSubagent && outputLine.subagentType ? `[${outputLine.subagentType}] ` : '';

            return (
              <Box key={scrollOffset + i} height={1} flexShrink={0}>
                <Text wrap="truncate-end">
                  {outputLine.isSubagent && <Text dimColor>{prefix}</Text>}
                  {subagentLabel && <Text color="magenta" dimColor>{subagentLabel}</Text>}
                  {line.startsWith('[x]') ? <Text color="red">{line}</Text> :
                    line.startsWith('[+]') ? <Text color="green">{line}</Text> :
                      line.startsWith('[>]') ? <Text color="blue">{line}</Text> :
                        line.startsWith('[-]') ? <Text color="yellow">{line}</Text> :
                          line.startsWith('[!]') ? <Text color="yellow">{line}</Text> :
                            line}
                </Text>
              </Box>
            );
          })
        )}
      </Box>

      {agent.pendingPermission && (
        <PermissionPrompt
          permission={agent.pendingPermission}
          onResponse={onPermissionResponse}
          onAlwaysAllow={onAlwaysAllow}
          onAlwaysAllowInRepo={onAlwaysAllowInRepo}
          queueCount={agent.permissionQueue.length}
        />
      )}

      {agent.pendingQuestion && (
        <QuestionPrompt
          questionRequest={agent.pendingQuestion}
          onResponse={onQuestionResponse}
        />
      )}

      {agent.pendingMerge && onMergeResponse && (
        <MergePrompt
          mergeState={agent.pendingMerge}
          onApprove={() => onMergeResponse(true)}
          onDeny={() => onMergeResponse(false)}
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

export const getDetailViewHelp = (promptNeedsScroll: boolean, canChat: boolean, chatMode: boolean, pendingMerge?: any) => {
  if (chatMode) {
    return (
      <>
        <Text color="cyan">Enter</Text>{' '}Send{'  '}
        <Text color="cyan">Esc</Text>{' '}Cancel
      </>
    );
  }

  if (pendingMerge?.status === 'ready') {
    return (
      <>
        <Text color="green">y</Text>{' '}Approve{'  '}
        <Text color="red">n</Text>{' '}Deny
      </>
    );
  }

  if (pendingMerge?.status === 'conflicts' || pendingMerge?.status === 'failed') {
    return (
      <>
        <Text dimColor>Press any key to continue...</Text>
      </>
    );
  }

  return (
    <>
      <Text color="cyan">↑↓/jk</Text>{' '}Scroll{'  '}
      <Text color="cyan">g/G</Text>{' '}Top/Bottom{'  '}
      {promptNeedsScroll && <><Text color="cyan">p/P</Text>{' '}Prompt{'  '}</>}
      {canChat && <><Text color="cyan">i</Text>{' '}Chat{'  '}</>}
      <Text color="cyan">q/Esc</Text>{' '}Close
    </>
  );
};
