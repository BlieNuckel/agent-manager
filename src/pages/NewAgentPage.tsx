import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { AgentType, InputStep, HistoryEntry, ImageAttachment, CustomAgentType } from '../types';
import type { SlashCommand } from '@anthropic-ai/claude-agent-sdk';
import { getGitRoot } from '../git/worktree';
import { AgentSDKManager } from '../agent/manager';
import { SlashCommandMenu } from '../components/SlashCommandMenu';
import { MultilineInput } from '../components/MultilineInput';
import { listArtifacts, formatArtifactReference, type ArtifactInfo } from '../utils/artifacts';
import { DiscardConfirmationPrompt } from '../components/DiscardConfirmationPrompt';

interface NewAgentPageProps {
  onSubmit: (title: string, p: string, agentType: AgentType, worktree: { enabled: boolean; name: string }, images?: ImageAttachment[], customAgentType?: CustomAgentType) => void;
  onCancel: () => void;
  onStateChange?: (state: { step: InputStep; showSlashMenu: boolean }) => void;
  initialHistoryEntry?: HistoryEntry | null;
  initialArtifactPath?: string | null;
  customAgentTypes?: CustomAgentType[];
}

export const NewAgentPage = ({ onSubmit, onCancel, onStateChange, initialHistoryEntry, initialArtifactPath, customAgentTypes = [] }: NewAgentPageProps) => {
  const availableAgentTypes = customAgentTypes.filter(at => !at.isSubagent);

  const [title, setTitle] = useState(initialHistoryEntry?.title || '');
  const [prompt, setPrompt] = useState(initialHistoryEntry?.prompt || '');
  const [agentType, setAgentType] = useState<AgentType>('normal');
  const [selectedCustomTypeIndex, setSelectedCustomTypeIndex] = useState(-1);
  const [useWorktree, setUseWorktree] = useState(true);
  const [worktreeName, setWorktreeName] = useState('');
  const [step, setStep] = useState<InputStep>(initialHistoryEntry ? 'prompt' : 'title');
  const [gitRoot] = useState(() => getGitRoot());
  const [slashCommands, setSlashCommands] = useState<SlashCommand[]>([]);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashSearchQuery, setSlashSearchQuery] = useState('');
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const [artifacts, setArtifacts] = useState<ArtifactInfo[]>([]);
  const [selectedArtifactIndex, setSelectedArtifactIndex] = useState(-1);
  const [images, setImages] = useState<Map<string, ImageAttachment>>(new Map());
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false);

  const hasFormContent = () => {
    return title.trim() !== '' || prompt.trim() !== '' || worktreeName.trim() !== '';
  };

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
    const imagePattern = /<image:([^>]+)>/g;
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
    if (showDiscardConfirmation) {
      if (input === 'y' || input === 'Y') {
        onCancel();
      } else if (input === 'n' || input === 'N' || key.escape) {
        setShowDiscardConfirmation(false);
      }
      return;
    }

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

    if (key.escape) {
      if (hasFormContent()) {
        setShowDiscardConfirmation(true);
      } else {
        onCancel();
      }
      return;
    }

    if (key.leftArrow) {
      if (step === 'prompt') {
        setStep('title');
        return;
      } else if (step === 'agentType') {
        setStep('prompt');
        return;
      } else if (step === 'artifact') {
        if (availableAgentTypes.length > 0) {
          setStep('agentType');
        } else {
          setStep('prompt');
        }
        return;
      } else if (step === 'worktree') {
        setStep('artifact');
        return;
      } else if (step === 'worktreeName') {
        const selectedCustomType = getSelectedCustomAgentType();
        if (selectedCustomType?.worktree !== undefined) {
          setStep('artifact');
        } else {
          setStep('worktree');
        }
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
      if (input === '0') { setSelectedCustomTypeIndex(-1); return; }
      const customIdx = parseInt(input) - 1;
      if (!isNaN(customIdx) && customIdx >= 0 && customIdx < availableAgentTypes.length) {
        setSelectedCustomTypeIndex(customIdx);
        return;
      }
      if (key.upArrow || key.downArrow) {
        const totalOptions = 1 + availableAgentTypes.length;
        const currentIdx = selectedCustomTypeIndex + 1;
        let newIdx: number;
        if (key.upArrow) {
          newIdx = currentIdx <= 0 ? totalOptions - 1 : currentIdx - 1;
        } else {
          newIdx = currentIdx >= totalOptions - 1 ? 0 : currentIdx + 1;
        }
        setSelectedCustomTypeIndex(newIdx - 1);
        return;
      }
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
      if (availableAgentTypes.length > 0) {
        setStep('agentType');
      } else {
        setStep('artifact');
      }
    }
  };

  const getSelectedCustomAgentType = (): CustomAgentType | undefined => {
    return selectedCustomTypeIndex >= 0 ? availableAgentTypes[selectedCustomTypeIndex] : undefined;
  };

  const handleWorktreeNameSubmit = (value: string) => {
    const name = value.trim();
    const finalPrompt = getFinalPrompt();
    const imageAttachments = extractImagesFromPrompt(prompt);
    onSubmit(title, finalPrompt, agentType, { enabled: true, name }, imageAttachments, getSelectedCustomAgentType());
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
    const selectedCustomType = getSelectedCustomAgentType();

    if (selectedCustomType?.worktree !== undefined) {
      if (selectedCustomType.worktree) {
        setUseWorktree(true);
        setStep('worktreeName');
      } else {
        const finalPrompt = getFinalPrompt();
        const imageAttachments = extractImagesFromPrompt(prompt);
        onSubmit(title, finalPrompt, agentType, { enabled: false, name: '' }, imageAttachments, selectedCustomType);
      }
    } else if (gitRoot) {
      setStep('worktree');
    } else {
      const finalPrompt = getFinalPrompt();
      const imageAttachments = extractImagesFromPrompt(prompt);
      onSubmit(title, finalPrompt, agentType, { enabled: false, name: '' }, imageAttachments, selectedCustomType);
    }
  };

  const handleWorktreeReturn = () => {
    if (useWorktree) {
      setStep('worktreeName');
    } else {
      const finalPrompt = getFinalPrompt();
      const imageAttachments = extractImagesFromPrompt(prompt);
      onSubmit(title, finalPrompt, agentType, { enabled: false, name: '' }, imageAttachments, getSelectedCustomAgentType());
    }
  };

  const getFinalPrompt = () => {
    let finalPrompt = prompt;

    if (selectedArtifactIndex >= 0 && selectedArtifactIndex < artifacts.length) {
      const artifact = artifacts[selectedArtifactIndex];
      const artifactRef = formatArtifactReference(artifact.name);
      finalPrompt = `${artifactRef}\n\n${finalPrompt}`;
    }

    finalPrompt = finalPrompt.replace(/<image:[^>]+>/g, '').trim();

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

        {availableAgentTypes.length > 0 && (
          <Box marginTop={1} flexDirection="column">
            <Text color={step === 'agentType' ? 'cyan' : step === 'title' || step === 'prompt' ? 'gray' : 'green'}>
              {step === 'title' || step === 'prompt' ? '○' : step === 'agentType' ? '▸' : '✓'} Custom Agent Type:{' '}
            </Text>
            {step === 'agentType' ? (
              <Box flexDirection="column" marginLeft={2}>
                <Text>[<Text color={selectedCustomTypeIndex === -1 ? 'cyan' : 'white'} bold={selectedCustomTypeIndex === -1}>0</Text>] None (standard agent)</Text>
                {availableAgentTypes.map((cat, i) => (
                  <Text key={cat.id}>
                    [<Text color={selectedCustomTypeIndex === i ? 'cyan' : 'white'} bold={selectedCustomTypeIndex === i}>{i + 1}</Text>] {cat.name} <Text dimColor>({cat.description})</Text>
                  </Text>
                ))}
              </Box>
            ) : (
              <Box marginLeft={2}>
                <Text dimColor={step === 'title' || step === 'prompt'}>
                  {selectedCustomTypeIndex >= 0 ? availableAgentTypes[selectedCustomTypeIndex].name : 'None'}
                </Text>
              </Box>
            )}
          </Box>
        )}

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

      {showDiscardConfirmation && (
        <DiscardConfirmationPrompt
          onConfirm={onCancel}
          onCancel={() => setShowDiscardConfirmation(false)}
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
        <Text color="cyan">↑↓</Text> Navigate{' '}
        <Text color="cyan">0-9</Text> Select{' '}
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
