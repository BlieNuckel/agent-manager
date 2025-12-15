import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { MultilineInput } from '../components/MultilineInput.js';
import type { Workflow } from '../types/workflows';
import type { CustomAgentType } from '../types/agentTypes';
import type { ImageAttachment } from '../types/index.js';
import { formatStageSummary } from '../utils/workflows';
import { getGitRoot, generateUniqueBranchName } from '../git/worktree';

type WorkflowSelectStep = 'workflow' | 'prompt' | 'branchName';

interface WorkflowSelectPageProps {
  workflows: Workflow[];
  agentTypes: CustomAgentType[];
  onStart: (workflow: Workflow, prompt: string, worktree?: { enabled: boolean; name: string }, images?: ImageAttachment[]) => void;
  onCancel: () => void;
  onStateChange?: (state: { step: WorkflowSelectStep }) => void;
}

export const WorkflowSelectPage = ({ workflows, agentTypes, onStart, onCancel, onStateChange }: WorkflowSelectPageProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [step, setStep] = useState<WorkflowSelectStep>('workflow');
  const [prompt, setPrompt] = useState('');
  const [branchName, setBranchName] = useState('');
  const [gitRoot] = useState(() => getGitRoot());
  const [images, setImages] = useState<Map<string, ImageAttachment>>(new Map());

  const extractImagesFromPrompt = (promptText: string): ImageAttachment[] => {
    const imagePattern = /<image:([^>]+)>/g;
    const matches = [...promptText.matchAll(imagePattern)];
    const extractedImages: ImageAttachment[] = [];

    for (const match of matches) {
      const filename = match[1];
      const imageId = filename.split('.')[0];
      const image = images.get(imageId);
      if (image) {
        extractedImages.push(image);
      }
    }

    return extractedImages;
  };

  const handleImagePasted = (id: string, path: string, base64: string, mediaType: string) => {
    const newImage: ImageAttachment = {
      id,
      path,
      base64,
      mediaType: mediaType as ImageAttachment['mediaType'],
      timestamp: Date.now()
    };
    setImages(prev => new Map(prev).set(id, newImage));
  };

  const selectedWorkflowNeedsWorktree = useMemo(() => {
    const workflow = workflows[selectedIndex];
    if (!workflow) return false;

    return workflow.stages.some(stage => {
      const agentType = agentTypes.find(a => a.id === stage.agentType);
      return agentType?.worktree === true;
    });
  }, [workflows, selectedIndex, agentTypes]);

  useInput((input, key) => {
    if (key.escape) {
      if (step === 'branchName') {
        setStep('prompt');
        onStateChange?.({ step: 'prompt' });
      } else if (step === 'prompt') {
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
      if (selectedWorkflowNeedsWorktree && gitRoot) {
        const suggestedName = generateUniqueBranchName(value.trim(), gitRoot);
        setBranchName(suggestedName);
        setStep('branchName');
        onStateChange?.({ step: 'branchName' });
      } else {
        const extractedImages = extractImagesFromPrompt(value);
        onStart(workflows[selectedIndex], value.trim(), undefined, extractedImages.length > 0 ? extractedImages : undefined);
      }
    }
  };

  const handleBranchNameSubmit = (value: string) => {
    if (value.trim() && workflows[selectedIndex]) {
      const extractedImages = extractImagesFromPrompt(prompt);
      onStart(workflows[selectedIndex], prompt.trim(), { enabled: true, name: value.trim() }, extractedImages.length > 0 ? extractedImages : undefined);
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
              <Box marginLeft={2}>
                <Text dimColor>
                  {formatStageSummary(workflow)}
                </Text>
              </Box>
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
                {'  '}{i + 1}. {stage.name}{stage.mediaAccess && stage.mediaAccess.includes('image') ? ' 📎' : ''}{stage.description ? ` - ${stage.description}` : ''}
              </Text>
            ))}
          </Box>
        </Box>
      )}

      {step === 'prompt' && (
        <Box marginTop={1} flexDirection="column">
          <Text color="magenta">Task:</Text>
          <Box marginLeft={2}>
            <MultilineInput
              value={prompt}
              onChange={setPrompt}
              onSubmit={handlePromptSubmit}
              placeholder="Describe your task (Ctrl+V to paste images)..."
              onImagePasted={handleImagePasted}
            />
          </Box>
          {images.size > 0 && (
            <Box marginLeft={2} marginTop={1}>
              <Text dimColor>📎 {images.size} image{images.size > 1 ? 's' : ''} attached</Text>
            </Box>
          )}
        </Box>
      )}

      {step === 'branchName' && (
        <Box marginTop={1} flexDirection="column">
          <Text color="green">+ Task: <Text dimColor>{prompt}</Text></Text>
          <Box marginTop={1} flexDirection="column">
            <Text color="magenta">Branch name (worktree):</Text>
            <Box marginLeft={2}>
              <TextInput
                value={branchName}
                onChange={setBranchName}
                onSubmit={handleBranchNameSubmit}
                placeholder="Enter branch name..."
              />
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export const getWorkflowSelectHelp = (step?: WorkflowSelectStep) => {
  if (step === 'branchName') {
    return (
      <>
        <Text color="cyan">Enter</Text> Start workflow{' '}
        <Text color="cyan">Esc</Text> Back
      </>
    );
  }

  if (step === 'prompt') {
    return (
      <>
        <Text color="cyan">Enter</Text> Continue{' '}
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
