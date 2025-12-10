import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { AgentType, InputStep, HistoryEntry, ImageAttachment } from '../types';
import type { SlashCommand } from '@anthropic-ai/claude-agent-sdk';
import { getGitRoot } from '../git/worktree';
import { AgentSDKManager } from '../agent/manager';
import { SlashCommandMenu } from '../components/SlashCommandMenu';
import { MultilineInput } from '../components/MultilineInput';
import { listArtifacts, formatArtifactReference, type ArtifactInfo } from '../utils/artifacts';

interface NewAgentPageProps {
  onSubmit: (title: string, p: string, agentType: AgentType, worktree: { enabled: boolean; name: string }, images?: ImageAttachment[]) => void;
  onCancel: () => void;
  onStateChange?: (state: { step: InputStep; showSlashMenu: boolean }) => void;
  initialHistoryEntry?: HistoryEntry | null;
  initialArtifactPath?: string | null;
}

export const NewAgentPage = ({ onSubmit, onCancel, onStateChange, initialHistoryEntry, initialArtifactPath }: NewAgentPageProps) => {
  const [title, setTitle] = useState(initialHistoryEntry?.title || '');
  const [prompt, setPrompt] = useState(initialHistoryEntry?.prompt || '');
  const [agentType, setAgentType] = useState<AgentType>('normal');
  const [useWorktree, setUseWorktree] = useState(false);
  const [worktreeName, setWorktreeName] = useState('');
  const [step, setStep] = useState<InputStep>(initialHistoryEntry ? 'prompt' : initialArtifactPath ? 'prompt' : 'title');
  const [gitRoot] = useState(() => getGitRoot());
  const [slashCommands, setSlashCommands] = useState<SlashCommand[]>([]);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashSearchQuery, setSlashSearchQuery] = useState('');
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const [artifacts, setArtifacts] = useState<ArtifactInfo[]>([]);
  const [selectedArtifactIndex, setSelectedArtifactIndex] = useState(-1);
  const [images, setImages] = useState<Map<string, ImageAttachment>>(new Map());

  const handleImagePasted = (id: string, path: string, base64: string, mediaType: string) => {
    const attachment: ImageAttachment = {
      id,
      path,
      base64,
      mediaType: mediaType as ImageAttachment['mediaType'],
      timestamp: Date.now(),
      size: Buffer.from(base64, 'base64').length
    };

    setImages(prev => new Map(prev).set(id, attachment));
  };

  const extractImagesFromPrompt = (promptText: string): ImageAttachment[] => {
    const imagePattern = />image:([^>]+)>/g;
    const matches = [...promptText.matchAll(imagePattern)];

    return matches
      .map(m => {
        const filename = m[1];
        const imageId = filename.split('.')[0];
        return images.get(imageId);
      })
      .filter((img): img is ImageAttachment => img !== undefined);
  };

  useEffect(() => {
    AgentSDKManager.getAvailableCommands().then(setSlashCommands);
    listArtifacts().then(setArtifacts);
  }, []);

  useEffect(() => {
    if (initialArtifactPath && artifacts.length > 0) {
      const index = artifacts.findIndex(a => a.path === initialArtifactPath);
      if (index >= 0) {
        setSelectedArtifactIndex(index);
      }
    }
  }, [initialArtifactPath, artifacts]);

  useEffect(() => {
    onStateChange?.({ step, showSlashMenu });
  }, [step, showSlashMenu, onStateChange]);

  useInput((input, key) => {
    if (showSlashMenu) {
      if (key.escape) {
        setShowSlashMenu(false);
        setSlashSearchQuery('');
        setSlashSelectedIndex(0);
        return;
      }

      const filteredCommands = slashCommands.filter(cmd =>
        cmd.name.toLowerCase().includes(slashSearchQuery.toLowerCase()) ||
        cmd.description.toLowerCase().includes(slashSearchQuery.toLowerCase())
      );

      if (key.upArrow) {
        setSlashSelectedIndex(i => Math.max(0, i - 1));
        return;
      }

      if (key.downArrow) {
        setSlashSelectedIndex(i => Math.min(filteredCommands.length - 1, i + 1));
        return;
      }

      if (key.return && filteredCommands.length > 0) {
        const selected = filteredCommands[slashSelectedIndex];
        setPrompt(`/${selected.name} `);
        setShowSlashMenu(false);
        setSlashSearchQuery('');
        setSlashSelectedIndex(0);
        return;
      }

      if (key.backspace || key.delete) {
        if (slashSearchQuery.length > 0) {
          setSlashSearchQuery(q => q.slice(0, -1));
          setSlashSelectedIndex(0);
        }
        return;
      }

      if (input && !key.ctrl && !key.meta) {
        setSlashSearchQuery(q => q + input);
        setSlashSelectedIndex(0);
        return;
      }

      return;
    }

    if (key.escape) { onCancel(); return; }

    if (key.leftArrow) {
      if (step === 'prompt') {
        setStep('title');
        return;
      } else if (step === 'agentType') {
        setStep('prompt');
        return;
      } else if (step === 'artifact') {
        setStep('agentType');
        return;
      } else if (step === 'worktree') {
        setStep('artifact');
        return;
      } else if (step === 'worktreeName') {
        setStep('worktree');
        return;
      }
    }

    if (key.return && !key.shift) {
      if (step === 'agentType') {
        handleAgentTypeReturn();
        return;
      } else if (step === 'artifact') {
        handleArtifactReturn();
        return;
      } else if (step === 'worktree') {
        handleWorktreeReturn();
        return;
      }
    }

    if (step === 'agentType') {
      if (input === '1') { setAgentType('normal'); return; }
      if (input === '2') { setAgentType('planning'); return; }
      if (input === '3') { setAgentType('auto-accept'); return; }
    }

    if (step === 'artifact') {
      if (key.upArrow) {
        setSelectedArtifactIndex(i => Math.max(-1, i - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedArtifactIndex(i => Math.min(artifacts.length - 1, i + 1));
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        const num = parseInt(input);
        if (!isNaN(num) && num >= 0 && num <= artifacts.length) {
          setSelectedArtifactIndex(num - 1);
          return;
        }
      }
    }

    if (step === 'worktree' && (input === 'y' || input === 'Y')) { setUseWorktree(true); return; }
    if (step === 'worktree' && (input === 'n' || input === 'N')) { setUseWorktree(false); return; }
  });

  const handleTitleSubmit = (value: string) => {
    if (value.trim()) {
      setStep('prompt');
    }
  };

  const handlePromptSubmit = (value: string) => {
    if (value.trim()) {
      setStep('agentType');
    }
  };

  const handleWorktreeNameSubmit = (value: string) => {
    const name = value.trim();
    const finalPrompt = getFinalPrompt();
    const imageAttachments = extractImagesFromPrompt(prompt);
    onSubmit(title, finalPrompt, agentType, { enabled: true, name }, imageAttachments);
  };

  const handlePromptChange = (value: string) => {
    if (showSlashMenu && !value.startsWith('/')) {
      setShowSlashMenu(false);
      setSlashSearchQuery('');
      setSlashSelectedIndex(0);
    }

    setPrompt(value);

    if (value.startsWith('/') && value.length === 1 && !showSlashMenu) {
      setShowSlashMenu(true);
      setSlashSearchQuery('');
      setSlashSelectedIndex(0);
    }
  };

  const handleAgentTypeReturn = () => {
    setStep('artifact');
  };

  const handleArtifactReturn = () => {
    if (gitRoot) {
      setStep('worktree');
    } else {
      const finalPrompt = getFinalPrompt();
      const imageAttachments = extractImagesFromPrompt(prompt);
      onSubmit(title, finalPrompt, agentType, { enabled: false, name: '' }, imageAttachments);
    }
  };

  const handleWorktreeReturn = () => {
    if (useWorktree) {
      setStep('worktreeName');
    } else {
      const finalPrompt = getFinalPrompt();
      const imageAttachments = extractImagesFromPrompt(prompt);
      onSubmit(title, finalPrompt, agentType, { enabled: false, name: '' }, imageAttachments);
    }
  };

  const getFinalPrompt = () => {
    let finalPrompt = prompt;

    if (selectedArtifactIndex >= 0 && selectedArtifactIndex < artifacts.length) {
      const artifact = artifacts[selectedArtifactIndex];
      const artifactRef = formatArtifactReference(artifact.name);
      finalPrompt = `${artifactRef}\n\n${finalPrompt}`;
    }

    finalPrompt = finalPrompt.replace(/>image:[^>]+>/g, '').trim();

    return finalPrompt;
  };

  return (
    <>
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold color="cyan">{initialHistoryEntry ? 'Edit & Create Agent' : initialArtifactPath ? 'Create Agent from Artifact' : 'New Agent'}</Text>
          {initialHistoryEntry && <Text dimColor>(from history)</Text>}
          {initialArtifactPath && <Text dimColor>(from artifact)</Text>}
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Text color={step === 'title' ? 'cyan' : step === 'prompt' || step === 'agentType' || step === 'worktree' || step === 'worktreeName' ? 'green' : 'gray'}>
            {step === 'title' ? '>' : title ? '+' : '○'} Title:{' '}
          </Text>
          {step === 'title' ? (
            <Box marginLeft={2}>
              <TextInput
                value={title}
                onChange={setTitle}
                onSubmit={handleTitleSubmit}
                placeholder="Enter agent title..."
              />
            </Box>
          ) : (
            <Box marginLeft={2}>
              <Text dimColor={!title}>{title || ''}</Text>
            </Box>
          )}
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Text color={step === 'prompt' ? 'cyan' : step === 'title' ? 'gray' : 'green'}>
            {step === 'title' ? '○' : step === 'prompt' ? '>' : '+'} Prompt:{' '}
          </Text>
          {step === 'prompt' ? (
            <Box flexDirection="column">
              <Box marginLeft={2}>
                <MultilineInput
                  value={prompt}
                  onChange={handlePromptChange}
                  onSubmit={handlePromptSubmit}
                  onImagePasted={handleImagePasted}
                  placeholder="Enter your prompt..."
                />
              </Box>
              {images.size > 0 && (
                <Box marginLeft={2} marginTop={1}>
                  <Text dimColor>📎 {images.size} image{images.size > 1 ? 's' : ''} attached</Text>
                </Box>
              )}
            </Box>
          ) : (
            <Box marginLeft={2}>
              <Text dimColor={step === 'title'}>{prompt}</Text>
            </Box>
          )}
        </Box>

        <Box marginTop={1}>
          <Text color={step === 'agentType' ? 'cyan' : step === 'title' || step === 'prompt' ? 'gray' : 'green'}>
            {step === 'title' || step === 'prompt' ? '○' : step === 'agentType' ? '▸' : '✓'} Agent Type:{' '}
          </Text>
          {step === 'agentType' ? (
            <Box flexDirection="column">
              <Text>[<Text color={agentType === 'normal' ? 'cyan' : 'white'} bold={agentType === 'normal'}>1</Text>] Normal (ask for permissions)</Text>
              <Text>[<Text color={agentType === 'planning' ? 'cyan' : 'white'} bold={agentType === 'planning'}>2</Text>] Planning (plan before executing)</Text>
              <Text>[<Text color={agentType === 'auto-accept' ? 'cyan' : 'white'} bold={agentType === 'auto-accept'}>3</Text>] Auto-accept edits (no permission prompts)</Text>
            </Box>
          ) : (
            <Text dimColor={step === 'title' || step === 'prompt'}>
              {agentType === 'normal' ? 'Normal' : agentType === 'planning' ? 'Planning' : 'Auto-accept edits'}
            </Text>
          )}
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Text color={step === 'artifact' ? 'cyan' : step === 'title' || step === 'prompt' || step === 'agentType' ? 'gray' : 'green'}>
            {step === 'title' || step === 'prompt' || step === 'agentType' ? '○' : step === 'artifact' ? '▸' : '✓'} Include Artifact:{' '}
          </Text>
          {step === 'artifact' ? (
            <Box flexDirection="column" marginLeft={2}>
              {artifacts.length === 0 ? (
                <Text dimColor>No artifacts found in ~/.agent-manager/artifacts/</Text>
              ) : (
                <>
                  <Text>[<Text color={selectedArtifactIndex === -1 ? 'cyan' : 'white'} bold={selectedArtifactIndex === -1}>0</Text>] None</Text>
                  {artifacts.map((artifact, i) => (
                    <Text key={artifact.name}>
                      [<Text color={selectedArtifactIndex === i ? 'cyan' : 'white'} bold={selectedArtifactIndex === i}>{i + 1}</Text>] {artifact.name}
                    </Text>
                  ))}
                  <Box marginTop={1}>
                    <Text dimColor>Use arrow keys or numbers to select</Text>
                  </Box>
                </>
              )}
            </Box>
          ) : (
            <Box marginLeft={2}>
              <Text dimColor={step === 'title' || step === 'prompt' || step === 'agentType'}>
                {selectedArtifactIndex >= 0 ? artifacts[selectedArtifactIndex].name : 'None'}
              </Text>
            </Box>
          )}
        </Box>

        {gitRoot && (
          <>
            <Box marginTop={1}>
              <Text color={step === 'worktree' ? 'cyan' : step === 'worktreeName' ? 'green' : 'gray'}>
                {step === 'worktreeName' ? '+' : step === 'worktree' ? '>' : '○'} Create worktree?{' '}
              </Text>
              {step === 'worktree' ? (
                <Text>[<Text color={useWorktree ? 'green' : 'white'} bold={useWorktree}>Y</Text>/<Text color={!useWorktree ? 'red' : 'white'} bold={!useWorktree}>N</Text>]</Text>
              ) : (
                <Text dimColor={step === 'title' || step === 'prompt'}>{useWorktree ? 'Yes' : 'No'}</Text>
              )}
            </Box>

            {(step === 'worktreeName' || (useWorktree && step !== 'title' && step !== 'prompt')) && (
              <Box marginTop={1}>
                <Text color={step === 'worktreeName' ? 'cyan' : 'gray'}>
                  {step === 'worktreeName' ? '>' : '○'} Worktree name:{' '}
                </Text>
                {step === 'worktreeName' ? (
                  <TextInput
                    value={worktreeName}
                    onChange={setWorktreeName}
                    onSubmit={handleWorktreeNameSubmit}
                    placeholder="(empty to auto-generate from task)"
                  />
                ) : (
                  <Text>{worktreeName || ''}</Text>
                )}
              </Box>
            )}
          </>
        )}

      </Box>

      {showSlashMenu && (
        <SlashCommandMenu
          commands={slashCommands}
          searchQuery={slashSearchQuery}
          selectedIndex={slashSelectedIndex}
        />
      )}
    </>
  );
};

export const getNewAgentHelp = (inputStep?: InputStep, showSlashMenu?: boolean) => {
  if (showSlashMenu) {
    return (
      <>
        <Text color="cyan">↑↓</Text> Navigate{' '}
        <Text color="cyan">Enter</Text> Select{' '}
        <Text color="cyan">Esc</Text> Cancel{' '}
        <Text color="cyan">Type</Text> Search
      </>
    );
  }

  if (inputStep === 'title') {
    return (
      <>
        <Text color="cyan">Enter</Text> Continue{' '}
        <Text color="cyan">Esc</Text> Cancel
      </>
    );
  }

  if (inputStep === 'prompt') {
    return (
      <>
        <Text color="cyan">Enter</Text> Continue{' '}
        <Text color="cyan">Shift+Enter</Text> New Line{' '}
        <Text color="cyan">Ctrl+G</Text> Edit in Vim{' '}
        <Text color="cyan">/</Text> Slash Commands{' '}
        <Text color="cyan">←</Text> Back{' '}
        <Text color="cyan">Esc</Text> Cancel
      </>
    );
  }

  if (inputStep === 'agentType') {
    return (
      <>
        <Text color="cyan">1-3</Text> Select Type{' '}
        <Text color="cyan">Enter</Text> Continue{' '}
        <Text color="cyan">←</Text> Back{' '}
        <Text color="cyan">Esc</Text> Cancel
      </>
    );
  }

  if (inputStep === 'artifact') {
    return (
      <>
        <Text color="cyan">↑↓</Text> Select{' '}
        <Text color="cyan">0-9</Text> Quick Select{' '}
        <Text color="cyan">Enter</Text> Continue{' '}
        <Text color="cyan">←</Text> Back{' '}
        <Text color="cyan">Esc</Text> Cancel
      </>
    );
  }

  if (inputStep === 'worktree') {
    return (
      <>
        <Text color="cyan">Y/N</Text> Choose{' '}
        <Text color="cyan">Enter</Text> Continue{' '}
        <Text color="cyan">←</Text> Back{' '}
        <Text color="cyan">Esc</Text> Cancel
      </>
    );
  }

  if (inputStep === 'worktreeName') {
    return (
      <>
        <Text color="cyan">Enter</Text> Submit{' '}
        <Text color="cyan">←</Text> Back{' '}
        <Text color="cyan">Esc</Text> Cancel
      </>
    );
  }

  return null;
};
