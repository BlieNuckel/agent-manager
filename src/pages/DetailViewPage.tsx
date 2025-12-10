import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import type { Agent, ImageAttachment } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PermissionPrompt } from '../components/PermissionPrompt';
import { QuestionPrompt } from '../components/QuestionPrompt';
import { MergePrompt } from '../components/MergePrompt';
import { MultilineInput } from '../components/MultilineInput';

interface DetailViewPageProps {
  agent: Agent;
  onPermissionResponse: (allowed: boolean) => void;
  onAlwaysAllow: () => void;
  onAlwaysAllowInRepo?: () => void;
  onQuestionResponse: (answers: Record<string, string | string[]>) => void;
  onMergeResponse?: (approved: boolean) => void;
  onSendMessage?: (message: string, images?: ImageAttachment[]) => void;
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
  const [chatImages, setChatImages] = useState<Map<string, ImageAttachment>>(new Map());

  const handleChatImagePasted = (id: string, path: string, base64: string, mediaType: string) => {
    const attachment: ImageAttachment = {
      id,
      path,
      base64,
      mediaType: mediaType as ImageAttachment['mediaType'],
      timestamp: Date.now(),
      size: Buffer.from(base64, 'base64').length
    };

    setChatImages(prev => new Map(prev).set(id, attachment));
  };

  const extractImagesFromMessage = (messageText: string): ImageAttachment[] => {
    const imagePattern = />image:([^>]+)>/g;
    const matches = [...messageText.matchAll(imagePattern)];

    return matches
      .map(m => {
        const filename = m[1];
        const imageId = filename.split('.')[0];
        return chatImages.get(imageId);
      })
      .filter((img): img is ImageAttachment => img !== undefined);
  };

  const termHeight = stdout?.rows || 24;

  const appHeaderHeight = 1;
  const appHelpBarHeight = 3;
  const availableForPage = termHeight - appHeaderHeight - appHelpBarHeight;

  const permissionHeight = agent.pendingPermission ? 16 : 0;
  const questionHeight = agent.pendingQuestion ? Math.min(18, 10 + (agent.pendingQuestion.questions.length * 4)) : 0;
  const mergePromptHeight = agent.pendingMerge ? 10 : 0;
  const chatInputHeight = chatMode ? 4 : 0;
  const agentTitleHeight = 3;
  const promptHeaderHeight = 1;
  const workDirHeight = 1;
  const outputBoxOverhead = 4;

  const promptLines = agent.prompt.split('\n');

  const fixedUIHeight = agentTitleHeight + promptHeaderHeight + workDirHeight + outputBoxOverhead + permissionHeight + questionHeight + mergePromptHeight + chatInputHeight;
  const availableForContent = availableForPage - fixedUIHeight;

  const maxPromptHeight = Math.max(1, Math.min(promptLines.length, Math.floor(Math.max(0, availableForContent) * 0.3)));
  const promptActualHeight = Math.min(promptLines.length, maxPromptHeight);

  const visibleLines = Math.max(1, availableForContent - promptActualHeight);
  const outputBoxHeight = visibleLines + outputBoxOverhead;

  useInput((input, key) => {
    if (chatMode) {
      if (key.escape && onToggleChatMode) {
        setChatInput('');
        onToggleChatMode();
      }
      return;
    }

    if (key.escape || input === 'q') {
      onBack();
      return;
    }

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
    if (input === 'i' && onToggleChatMode && canChat && !agent.pendingPermission && !agent.pendingQuestion) {
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

  const handleChatSubmit = (value: string) => {
    if (value.trim() && onSendMessage) {
      const imageAttachments = extractImagesFromMessage(value);
      const cleanMessage = value.replace(/>image:[^>]+>/g, '').trim();

      onSendMessage(cleanMessage, imageAttachments);
      setChatInput('');
      setChatImages(new Map());
      if (onToggleChatMode) {
        onToggleChatMode();
      }
    }
  };

  useEffect(() => {
    const maxScroll = Math.max(0, agent.output.length - visibleLines);
    const atBottom = scrollOffset >= maxScroll - 2;
    if (atBottom || agent.status === 'working') {
      setScrollOffset(maxScroll);
    } else if (scrollOffset > maxScroll) {
      setScrollOffset(maxScroll);
    }
  }, [agent.output.length, visibleLines, scrollOffset, agent.status]);

  useEffect(() => {
    if (agent.pendingPermission || agent.pendingQuestion) {
      const maxScroll = Math.max(0, agent.output.length - visibleLines);
      setScrollOffset(maxScroll);
    }
  }, [agent.pendingPermission, agent.pendingQuestion, agent.output.length, visibleLines]);

  const displayedLines = agent.output.slice(scrollOffset, scrollOffset + visibleLines);
  const displayedPromptLines = promptLines.slice(promptScrollOffset, promptScrollOffset + maxPromptHeight);
  const isPending = agent.title === 'Pending...';
  const promptNeedsScroll = promptLines.length > maxPromptHeight;

  return (
    <Box flexDirection="column" flexGrow={1} flexShrink={1} minHeight={0} overflow="hidden">
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

      <Box flexDirection="column" flexShrink={1} flexGrow={1} minHeight={0} borderStyle="round" borderColor="gray" paddingX={1} overflow="hidden">
        <Box flexShrink={0} height={1}>
          <Text dimColor wrap="truncate-end">Output ({agent.output.length} lines, scroll: {scrollOffset + 1}-{Math.min(scrollOffset + visibleLines, agent.output.length)} of {agent.output.length})</Text>
        </Box>
        <Box flexDirection="column" flexShrink={1} flexGrow={1} minHeight={0} overflow="hidden">
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
                        line.startsWith('[>]') ? <Text dimColor>{line}</Text> :
                          line.startsWith('[-]') ? <Text color="yellow">{line}</Text> :
                            line.startsWith('[!]') ? <Text color="yellow">{line}</Text> :
                              line}
                  </Text>
                </Box>
              );
            })
          )}
        </Box>
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
          <Text color="cyan" bold>Send message (Ctrl+V to paste image, Esc to cancel):</Text>
          <MultilineInput
            value={chatInput}
            onChange={setChatInput}
            onSubmit={handleChatSubmit}
            onImagePasted={handleChatImagePasted}
            placeholder="Type your message..."
          />
          {chatImages.size > 0 && (
            <Text dimColor>📎 {chatImages.size} image{chatImages.size > 1 ? 's' : ''} attached</Text>
          )}
        </Box>
      )}
    </Box>
  );
};

export const getDetailViewHelp = (promptNeedsScroll: boolean, canChat: boolean, chatMode: boolean, pendingMerge?: any, pendingPermission?: boolean, pendingQuestion?: boolean) => {
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

  if (pendingPermission || pendingQuestion) {
    return (
      <>
        <Text color="cyan">↑↓/jk</Text>{' '}Scroll{'  '}
        <Text color="cyan">g/G</Text>{' '}Top/Bottom{'  '}
        {promptNeedsScroll && <><Text color="cyan">p/P</Text>{' '}Prompt{'  '}</>}
        <Text color="cyan">q/Esc</Text>{' '}Close
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
