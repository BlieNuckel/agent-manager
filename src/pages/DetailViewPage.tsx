import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import type { Agent, ImageAttachment } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ContextHealthIndicator } from '../components/ContextHealthIndicator';
import { PermissionPrompt } from '../components/PermissionPrompt';
import { QuestionPrompt } from '../components/QuestionPrompt';
import { MergePrompt } from '../components/MergePrompt';
import { MultilineInput } from '../components/MultilineInput';
import { AgentOutputViewport } from '../components/AgentOutputViewport';

interface DetailViewPageProps {
  agent: Agent;
  onQuestionResponse: (answers: Record<string, string | string[]>) => void;
  onMergeResponse?: (approved: boolean) => void;
  onResolveConflicts?: () => void;
  onDraftPR?: () => void;
  onSendMessage?: (message: string, images?: ImageAttachment[]) => void;
  onBack: () => void;
  chatMode?: boolean;
  onToggleChatMode?: () => void;
}

export const DetailViewPage = ({
  agent,
  onQuestionResponse,
  onMergeResponse,
  onResolveConflicts,
  onDraftPR,
  onSendMessage,
  onBack,
  chatMode = false,
  onToggleChatMode
}: DetailViewPageProps) => {
  const { stdout } = useStdout();
  const [promptScrollOffset, setPromptScrollOffset] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [chatImages, setChatImages] = useState<Map<string, ImageAttachment>>(new Map());
  const [thinkingIndicator, setThinkingIndicator] = useState<{ show: boolean; duration: number } | null>(null);

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
    const imagePattern = /<image:([^>]+)>/g;
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
  const termWidth = stdout?.columns || 80;

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
  const outputBoxOverhead = 3;
  const thinkingHeight = thinkingIndicator?.show ? 1 : 0;

  const promptLines = agent.prompt.split('\n');

  const fixedUIHeight = agentTitleHeight + promptHeaderHeight + workDirHeight + outputBoxOverhead + permissionHeight + questionHeight + mergePromptHeight + chatInputHeight + thinkingHeight;
  const availableForContent = availableForPage - fixedUIHeight;

  const maxPromptHeight = Math.max(1, Math.min(promptLines.length, Math.floor(Math.max(0, availableForContent) * 0.3)));
  const promptActualHeight = Math.min(promptLines.length, maxPromptHeight);

  const visibleLines = Math.max(1, availableForContent - promptActualHeight);

  const isViewportActive = !chatMode;

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
        } else if (input === 'p' && onDraftPR) {
          onDraftPR();
        }
      } else if (agent.pendingMerge.status === 'pr-created' && onMergeResponse) {
        if (input === 'y') {
          onMergeResponse(true);
        } else if (input === 'n') {
          onMergeResponse(false);
        }
      } else if (agent.pendingMerge.status === 'conflicts' || agent.pendingMerge.status === 'failed') {
        if (input === 'r' && onResolveConflicts) {
          onResolveConflicts();
        }
      }
      return;
    }

    const canChat = agent.status === 'working' || agent.status === 'idle';
    if (input === 'i' && onToggleChatMode && canChat && !agent.pendingPermission && !agent.pendingQuestion) {
      onToggleChatMode();
      return;
    }

    if (input === 'p') setPromptScrollOffset(o => Math.max(0, o - 1));
    if (input === 'P') setPromptScrollOffset(o => Math.min(Math.max(0, promptLines.length - maxPromptHeight), o + 1));
  });

  const handleChatSubmit = (value: string) => {
    if (value.trim() && onSendMessage) {
      const imageAttachments = extractImagesFromMessage(value);
      const cleanMessage = value.replace(/<image:[^>]+>/g, '').trim();

      onSendMessage(cleanMessage, imageAttachments);
      setChatInput('');
      setChatImages(new Map());
      if (onToggleChatMode) {
        onToggleChatMode();
      }
    }
  };

  useEffect(() => {
    if (agent.status !== 'working') {
      setThinkingIndicator(null);
      return;
    }

    if (agent.pendingPermission || agent.pendingQuestion) {
      setThinkingIndicator(null);
      return;
    }

    const lastOutput = agent.output[agent.output.length - 1];
    if (!lastOutput || !lastOutput.timestamp) {
      return;
    }

    const isToolOutput = (text: string) => {
      return text.startsWith('[>]') || text.startsWith('[!]');
    };

    if (isToolOutput(lastOutput.text)) {
      setThinkingIndicator(null);
      return;
    }

    const checkGap = () => {
      const gap = Date.now() - (lastOutput.timestamp || Date.now());
      const gapSeconds = Math.floor(gap / 1000);

      if (gap > 1000) {
        setThinkingIndicator({
          show: true,
          duration: gapSeconds,
        });
      } else {
        setThinkingIndicator(null);
      }
    };

    checkGap();

    const interval = setInterval(checkGap, 1000);

    return () => clearInterval(interval);
  }, [
    agent.status,
    agent.pendingPermission,
    agent.pendingQuestion,
    agent.output,
    agent.output.length,
  ]);

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
          <Text> │ </Text>
          <ContextHealthIndicator agent={agent} />
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
          <Text dimColor wrap="truncate-end">
            Output ({agent.output.length} lines)
          </Text>
        </Box>
        <AgentOutputViewport
          output={agent.output}
          height={visibleLines}
          width={termWidth - 4}
          isActive={isViewportActive}
          autoScroll={agent.status === 'working'}
          subagentStats={agent.subagentStats}
        />
      </Box>

      {thinkingIndicator?.show && (
        <Box flexShrink={0} paddingLeft={2} paddingTop={0}>
          <Text color="yellow">
            ⏱ Thinking... ({thinkingIndicator.duration}s)
          </Text>
        </Box>
      )}

      {agent.pendingPermission && (
        <PermissionPrompt
          permission={agent.pendingPermission}
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
          onDraftPR={onDraftPR}
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
        <Text color="green">y</Text>{' '}Merge{'  '}
        <Text color="cyan">p</Text>{' '}Draft PR{'  '}
        <Text color="red">n</Text>{' '}Cancel
      </>
    );
  }

  if (pendingMerge?.status === 'pr-created') {
    return (
      <>
        <Text color="green">y</Text>{' '}Cleanup{'  '}
        <Text color="red">n</Text>{' '}Keep
      </>
    );
  }

  if (pendingMerge?.status === 'drafting-pr') {
    return (
      <>
        <Text dimColor>Agent is drafting PR...</Text>
      </>
    );
  }

  if (pendingMerge?.status === 'conflicts' || pendingMerge?.status === 'failed') {
    return (
      <>
        <Text color="cyan">r</Text>{' '}Have agent resolve
      </>
    );
  }

  if (pendingMerge?.status === 'resolving') {
    return (
      <>
        <Text dimColor>Agent is resolving conflicts...</Text>
      </>
    );
  }

  if (pendingPermission || pendingQuestion) {
    return (
      <>
        <Text color="cyan">↑↓/jk</Text>{' '}Scroll{'  '}
        <Text color="cyan">g/G</Text>{' '}Top/Bottom{'  '}
        <Text color="cyan">1-9</Text>{' '}Toggle{'  '}
        {promptNeedsScroll && <><Text color="cyan">p/P</Text>{' '}Prompt{'  '}</>}
        <Text color="cyan">q/Esc</Text>{' '}Close
      </>
    );
  }

  return (
    <>
      <Text color="cyan">↑↓/jk</Text>{' '}Scroll{'  '}
      <Text color="cyan">g/G</Text>{' '}Top/Bottom{'  '}
      <Text color="cyan">1-9</Text>{' '}Toggle{'  '}
      {promptNeedsScroll && <><Text color="cyan">p/P</Text>{' '}Prompt{'  '}</>}
      {canChat && <><Text color="cyan">i</Text>{' '}Chat{'  '}</>}
      <Text color="cyan">q/Esc</Text>{' '}Close
    </>
  );
};
