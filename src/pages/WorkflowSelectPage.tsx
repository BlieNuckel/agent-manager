import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { Workflow } from '../types/workflows';
import { formatStageSummary } from '../utils/workflows';

type WorkflowSelectStep = 'workflow' | 'prompt';

interface WorkflowSelectPageProps {
  workflows: Workflow[];
  onStart: (workflow: Workflow, prompt: string) => void;
  onCancel: () => void;
  onStateChange?: (state: { step: WorkflowSelectStep }) => void;
}

export const WorkflowSelectPage = ({ workflows, onStart, onCancel, onStateChange }: WorkflowSelectPageProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [step, setStep] = useState<WorkflowSelectStep>('workflow');
  const [prompt, setPrompt] = useState('');

  useInput((input, key) => {
    if (key.escape) {
      if (step === 'prompt') {
        setStep('workflow');
        onStateChange?.({ step: 'workflow' });
      } else {
        onCancel();
      }
      return;
    }

    if (step === 'workflow') {
      if (key.upArrow || input === 'k') {
        setSelectedIndex(i => Math.max(0, i - 1));
        return;
      }

      if (key.downArrow || input === 'j') {
        setSelectedIndex(i => Math.min(workflows.length - 1, i + 1));
        return;
      }

      if (key.return && workflows.length > 0) {
        setStep('prompt');
        onStateChange?.({ step: 'prompt' });
        return;
      }
    }
  });

  const handlePromptSubmit = (value: string) => {
    if (value.trim() && workflows[selectedIndex]) {
      onStart(workflows[selectedIndex], value.trim());
    }
  };

  const selectedWorkflow = workflows[selectedIndex];

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1}>
      <Text bold color="magenta">Select Workflow</Text>

      <Box marginTop={1} flexDirection="column">
        {workflows.length === 0 ? (
          <Text dimColor>No workflows found.</Text>
        ) : (
          workflows.map((workflow, i) => (
            <Box key={workflow.id} flexDirection="column">
              <Text color={i === selectedIndex ? 'magenta' : 'white'}>
                {i === selectedIndex ? '▸ ' : '  '}{workflow.name}
                {workflow.source === 'user' && <Text dimColor> (custom)</Text>}
              </Text>
              <Text dimColor marginLeft={2}>
                {formatStageSummary(workflow)}
              </Text>
            </Box>
          ))
        )}
      </Box>

      {selectedWorkflow && (
        <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="gray" padding={1}>
          <Text bold>{selectedWorkflow.name}</Text>
          <Text dimColor>{selectedWorkflow.description}</Text>
          <Box marginTop={1} flexDirection="column">
            <Text color="gray">Stages:</Text>
            {selectedWorkflow.stages.map((stage, i) => (
              <Text key={stage.id} dimColor>
                {'  '}{i + 1}. {stage.name}{stage.description ? ` - ${stage.description}` : ''}
              </Text>
            ))}
          </Box>
        </Box>
      )}

      {step === 'prompt' && (
        <Box marginTop={1} flexDirection="column">
          <Text color="magenta">Task:</Text>
          <Box marginLeft={2}>
            <TextInput
              value={prompt}
              onChange={setPrompt}
              onSubmit={handlePromptSubmit}
              placeholder="Describe your task..."
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export const getWorkflowSelectHelp = (step?: WorkflowSelectStep) => {
  if (step === 'prompt') {
    return (
      <>
        <Text color="cyan">Enter</Text> Start workflow{' '}
        <Text color="cyan">Esc</Text> Back
      </>
    );
  }

  return (
    <>
      <Text color="cyan">↑↓jk</Text> Navigate{' '}
      <Text color="cyan">Enter</Text> Select{' '}
      <Text color="cyan">Esc</Text> Cancel
    </>
  );
};
