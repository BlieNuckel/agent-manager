import React, { useState, useMemo, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { MultilineInput } from '../components/MultilineInput.js';
import type { Workflow } from '../types/workflows';
import type { CustomAgentType } from '../types/agentTypes';
import type { ImageAttachment, Repository } from '../types/index.js';
import { formatStageSummary } from '../utils/workflows';
import { getGitRoot, generateUniqueBranchName } from '../git/worktree';
import { RepositoryManager } from '../utils/repositoryManager';

type WorkflowSelectStep = 'repository' | 'workflow' | 'prompt' | 'branchName';

interface WorkflowSelectPageProps {
  workflows: Workflow[];
  agentTypes: CustomAgentType[];
  onStart: (workflow: Workflow, prompt: string, worktree?: { enabled: boolean; name: string }, images?: ImageAttachment[], repository?: Repository) => void;
  onCancel: () => void;
  onStateChange?: (state: { step: WorkflowSelectStep }) => void;
}

export const WorkflowSelectPage = ({ workflows, agentTypes, onStart, onCancel, onStateChange }: WorkflowSelectPageProps) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepositoryIndex, setSelectedRepositoryIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [step, setStep] = useState<WorkflowSelectStep>('repository');
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

  useEffect(() => {
    RepositoryManager.loadRepositories().then(config => {
      if (config.repositories.length > 0) {
        setRepositories(config.repositories);
        // Select default repository if available
        const defaultIndex = config.repositories.findIndex(r => r.isDefault);
        setSelectedRepositoryIndex(defaultIndex >= 0 ? defaultIndex : 0);
      }
    });
  }, []);

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
      } else if (step === 'workflow') {
        setStep('repository');
        onStateChange?.({ step: 'repository' });
      } else {
        onCancel();
      }
      return;
    }

    // Handle repository selection
    if (step === 'repository') {
      if (key.upArrow && selectedRepositoryIndex > 0) {
        setSelectedRepositoryIndex(selectedRepositoryIndex - 1);
        return;
      }
      if (key.downArrow && selectedRepositoryIndex < repositories.length - 1) {
        setSelectedRepositoryIndex(selectedRepositoryIndex + 1);
        return;
      }
      if (key.return) {
        setStep('workflow');
        onStateChange?.({ step: 'workflow' });
        return;
      }
      const num = parseInt(input);
      if (!isNaN(num) && num >= 1 && num <= repositories.length) {
        setSelectedRepositoryIndex(num - 1);
        return;
      }
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
        const selectedRepo = repositories[selectedRepositoryIndex];
        onStart(workflows[selectedIndex], value.trim(), undefined, extractedImages.length > 0 ? extractedImages : undefined, selectedRepo);
      }
    }
  };

  const handleBranchNameSubmit = (value: string) => {
    if (value.trim() && workflows[selectedIndex]) {
      const extractedImages = extractImagesFromPrompt(prompt);
      const selectedRepo = repositories[selectedRepositoryIndex];
      onStart(workflows[selectedIndex], prompt.trim(), { enabled: true, name: value.trim() }, extractedImages.length > 0 ? extractedImages : undefined, selectedRepo);
    }
  };

  const selectedWorkflow = workflows[selectedIndex];

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1}>
      <Text bold color="magenta">Select Workflow</Text>

      {step === 'repository' && (
        <Box marginTop={1} flexDirection="column">
          <Text color="magenta">Repository:</Text>
          <Box flexDirection="column" marginLeft={2}>
            {repositories.length === 0 ? (
              <>
                <Text dimColor>No repositories registered.</Text>
                <Text dimColor>Use 'R' in the main menu to register repositories.</Text>
              </>
            ) : (
              <>
                {repositories.map((repo, i) => (
                  <Text key={repo.name}>
                    {selectedRepositoryIndex === i ? '▸ ' : '  '}
                    [<Text color={selectedRepositoryIndex === i ? 'magenta' : 'white'} bold={selectedRepositoryIndex === i}>{i + 1}</Text>] {repo.name} <Text dimColor>({repo.path})</Text>
                    {repo.isDefault && <Text color="green"> (default)</Text>}
                  </Text>
                ))}
                <Box marginTop={1}>
                  <Text dimColor>Use arrow keys or numbers to select</Text>
                </Box>
              </>
            )}
          </Box>
        </Box>
      )}

      {(step === 'workflow' || step === 'prompt' || step === 'branchName') && (
      <Box marginTop={1} flexDirection="column">
        {step !== 'repository' && repositories.length > 0 && (
          <Text color="green">+ Repository: <Text dimColor>{repositories[selectedRepositoryIndex]?.name}</Text></Text>
        )}

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
      )}

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
  if (step === 'repository') {
    return (
      <>
        <Text color="cyan">↑↓</Text> Navigate{' '}
        <Text color="cyan">1-9</Text> Select{' '}
        <Text color="cyan">Enter</Text> Continue{' '}
        <Text color="cyan">Esc</Text> Cancel
      </>
    );
  }

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
