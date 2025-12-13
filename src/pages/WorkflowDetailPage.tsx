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

interface WorkflowDetailPageProps {
  workflow: Workflow;
  execution: WorkflowExecutionState;
  currentAgent?: Agent;
  onApproveStage: () => void;
  onRejectStage: (feedback: string) => void;
  onSkipStage: () => void;
  onCancelWorkflow: () => void;
  onQuestionResponse: (answers: Record<string, string | string[]>) => void;
  onPermissionResponse: (allowed: boolean) => void;
  onClose: () => void;
}

export const WorkflowDetailPage = ({
  workflow,
  execution,
  currentAgent,
  onApproveStage,
  onRejectStage,
  onSkipStage,
  onCancelWorkflow,
  onQuestionResponse,
  onPermissionResponse,
  onClose
}: WorkflowDetailPageProps) => {
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
  const stageInfoHeight = 3;
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
    if (isAwaitingApproval && !currentAgent?.pendingPermission && !currentAgent?.pendingQuestion) {
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

    if (input === 'c') {
      onCancelWorkflow();
      return;
    }

    if (key.escape || input === 'q') {
      onClose();
      return;
    }
  });

  const completedStages = execution.stageStates.filter(s => s.status === 'approved' || s.status === 'skipped').length;
  const totalStages = workflow.stages.length;

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box borderStyle="round" borderColor="magenta" paddingX={1} flexDirection="column">
        <Box>
          <Text bold color="magenta">[{workflow.name}]</Text>
          <Text> Stage {Math.min(completedStages + 1, totalStages)}/{totalStages}</Text>
          {currentAgent && (
            <>
              <Text> │ </Text>
              <StatusBadge status={currentAgent.status} />
            </>
          )}
        </Box>
        <WorkflowProgress
          workflow={workflow}
          stageStates={execution.stageStates}
          currentStageIndex={execution.currentStageIndex}
          compact
        />
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text bold>Stage: </Text>
          <Text color="cyan">{currentStage?.name || 'Complete'}</Text>
        </Box>
        {currentStage?.description && (
          <Text dimColor wrap="truncate">{currentStage.description}</Text>
        )}
      </Box>

      {lastArtifact && (
        <Box marginTop={1}>
          <Text dimColor>Prev: </Text>
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

      {isAwaitingApproval && !currentAgent?.pendingPermission && !currentAgent?.pendingQuestion && (
        <Box marginTop={1} borderStyle="single" borderColor="cyan" paddingX={1}>
          <Text color="cyan" bold>Stage complete. </Text>
          <Text>[<Text color="green">a</Text>]pprove </Text>
          {canSkip && <Text>[<Text color="yellow">s</Text>]kip </Text>}
          <Text>[<Text color="gray">c</Text>]ancel</Text>
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

export const getWorkflowDetailHelp = (isAwaitingApproval: boolean, canSkip: boolean, hasPendingPermission: boolean, hasPendingQuestion: boolean) => {
  if (hasPendingPermission || hasPendingQuestion) {
    return (
      <>
        <Text color="cyan">↑↓jk</Text> Scroll{' '}
        <Text color="cyan">g/G</Text> Top/Bottom{' '}
        <Text color="cyan">1-9</Text> Toggle{' '}
        <Text color="cyan">Esc</Text> Close{' '}
        <Text color="gray">c</Text> Cancel
      </>
    );
  }

  if (isAwaitingApproval) {
    return (
      <>
        <Text color="green">a</Text> Approve{' '}
        {canSkip && <><Text color="yellow">s</Text> Skip{' '}</>}
        <Text color="cyan">↑↓jk</Text> Scroll{' '}
        <Text color="cyan">Esc</Text> Close{' '}
        <Text color="gray">c</Text> Cancel
      </>
    );
  }

  return (
    <>
      <Text color="cyan">↑↓jk</Text> Scroll{' '}
      <Text color="cyan">g/G</Text> Top/Bottom{' '}
      <Text color="cyan">1-9</Text> Toggle{' '}
      <Text color="cyan">Esc/q</Text> Close{' '}
      <Text color="gray">c</Text> Cancel
    </>
  );
};
