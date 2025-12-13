import React from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import type { Agent } from '../types';
import type { Workflow, WorkflowExecutionState } from '../types/workflows';
import { WorkflowProgress } from '../components/WorkflowProgress';
import { StatusBadge } from '../components/StatusBadge';
import { PermissionPrompt } from '../components/PermissionPrompt';
import { QuestionPrompt } from '../components/QuestionPrompt';
import { AgentOutputViewport } from '../components/AgentOutputViewport';
import { canSkipStage, getLastArtifactPath } from '../utils/workflows';

interface WorkflowExecutionPageProps {
  workflow: Workflow;
  execution: WorkflowExecutionState;
  currentAgent?: Agent;
  onApproveStage: () => void;
  onRejectStage: (feedback: string) => void;
  onSkipStage: () => void;
  onCancelWorkflow: () => void;
  onQuestionResponse: (answers: Record<string, string | string[]>) => void;
}

export const WorkflowExecutionPage = ({
  workflow,
  execution,
  currentAgent,
  onApproveStage,
  onRejectStage,
  onSkipStage,
  onCancelWorkflow,
  onQuestionResponse
}: WorkflowExecutionPageProps) => {
  const { stdout } = useStdout();

  const termHeight = stdout?.rows || 24;
  const termWidth = stdout?.columns || 80;
  const currentStage = workflow.stages[execution.currentStageIndex];
  const currentStageState = execution.stageStates[execution.currentStageIndex];
  const isAwaitingApproval = currentStageState?.status === 'awaiting_approval';
  const canSkip = currentStage && canSkipStage(workflow, currentStage.id);
  const lastArtifact = getLastArtifactPath(execution);

  const headerHeight = 3;
  const progressHeight = 2;
  const stageInfoHeight = 4;
  const artifactInfoHeight = lastArtifact ? 2 : 0;
  const approvalHeight = isAwaitingApproval ? 3 : 0;
  const permissionHeight = currentAgent?.pendingPermission ? 16 : 0;
  const questionHeight = currentAgent?.pendingQuestion ? 14 : 0;
  const outputBoxOverhead = 3;

  const fixedHeight = headerHeight + progressHeight + stageInfoHeight + artifactInfoHeight + approvalHeight + permissionHeight + questionHeight + outputBoxOverhead;
  const visibleLines = Math.max(5, termHeight - fixedHeight);

  const output = currentAgent?.output || [];
  const isViewportActive = !currentAgent?.pendingPermission && !currentAgent?.pendingQuestion;

  useInput((input, key) => {
    if (isAwaitingApproval) {
      if (input === 'a' || input === 'y') {
        onApproveStage();
        return;
      }
      if (input === 'r') {
        onRejectStage('');
        return;
      }
      if (input === 's' && canSkip) {
        onSkipStage();
        return;
      }
    }

    if (input === 'c' || (key.ctrl && input === 'c')) {
      onCancelWorkflow();
      return;
    }
  });

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box borderStyle="round" borderColor="magenta" paddingX={1} flexDirection="column">
        <Text bold color="magenta">{workflow.name}</Text>
        <WorkflowProgress
          workflow={workflow}
          stageStates={execution.stageStates}
          currentStageIndex={execution.currentStageIndex}
        />
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text bold>Stage: </Text>
          <Text color="cyan">{currentStage?.name || 'Complete'}</Text>
          {currentAgent && (
            <>
              <Text> │ </Text>
              <StatusBadge status={currentAgent.status} />
            </>
          )}
        </Box>
        {currentStage?.description && (
          <Text dimColor>{currentStage.description}</Text>
        )}
      </Box>

      {lastArtifact && (
        <Box marginTop={1}>
          <Text dimColor>Previous artifact: </Text>
          <Text color="green">{lastArtifact.split('/').pop()}</Text>
        </Box>
      )}

      <Box
        flexDirection="column"
        flexGrow={1}
        marginTop={1}
        borderStyle="round"
        borderColor="gray"
        paddingX={1}
        minHeight={5}
      >
        <Text dimColor>
          Output ({output.length} lines)
        </Text>
        <AgentOutputViewport
          output={output}
          height={visibleLines}
          width={termWidth - 4}
          isActive={isViewportActive}
          autoScroll={currentAgent?.status === 'working'}
          subagentStats={currentAgent?.subagentStats}
        />
      </Box>

      {currentAgent?.pendingPermission && (
        <PermissionPrompt
          permission={currentAgent.pendingPermission}
          queueCount={currentAgent.permissionQueue.length}
        />
      )}

      {currentAgent?.pendingQuestion && (
        <QuestionPrompt
          questionRequest={currentAgent.pendingQuestion}
          onResponse={onQuestionResponse}
        />
      )}

      {isAwaitingApproval && (
        <Box marginTop={1} borderStyle="single" borderColor="cyan" paddingX={1}>
          <Text color="cyan" bold>Stage complete. </Text>
          <Text>[<Text color="green">a</Text>]pprove </Text>
          <Text>[<Text color="red">r</Text>]eject </Text>
          {canSkip && <Text>[<Text color="yellow">s</Text>]kip </Text>}
          <Text>[<Text color="gray">c</Text>]ancel workflow</Text>
        </Box>
      )}

      {execution.status === 'completed' && (
        <Box marginTop={1} borderStyle="double" borderColor="green" paddingX={1}>
          <Text color="green" bold>Workflow completed!</Text>
        </Box>
      )}
    </Box>
  );
};

export const getWorkflowExecutionHelp = (isAwaitingApproval: boolean, canSkip: boolean, hasPendingPermission: boolean, hasPendingQuestion: boolean) => {
  if (hasPendingPermission || hasPendingQuestion) {
    return (
      <>
        <Text color="cyan">↑↓jk</Text> Scroll{' '}
        <Text color="cyan">g/G</Text> Top/Bottom{' '}
        <Text color="cyan">1-9</Text> Toggle{' '}
        <Text color="cyan">c</Text> Cancel workflow
      </>
    );
  }

  if (isAwaitingApproval) {
    return (
      <>
        <Text color="green">a</Text> Approve{' '}
        <Text color="red">r</Text> Reject{' '}
        {canSkip && <><Text color="yellow">s</Text> Skip{' '}</>}
        <Text color="cyan">↑↓jk</Text> Scroll{' '}
        <Text color="gray">c</Text> Cancel
      </>
    );
  }

  return (
    <>
      <Text color="cyan">↑↓jk</Text> Scroll{' '}
      <Text color="cyan">g/G</Text> Top/Bottom{' '}
      <Text color="cyan">1-9</Text> Toggle{' '}
      <Text color="gray">c</Text> Cancel workflow
    </>
  );
};
