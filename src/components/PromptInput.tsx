import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { AgentType, InputStep } from '../types';
import type { SlashCommand } from '@anthropic-ai/claude-agent-sdk';
import { getGitRoot } from '../git/worktree';
import { AgentSDKManager } from '../agent/manager';
import { SlashCommandMenu } from './SlashCommandMenu';
import { MultilineInput } from './MultilineInput';
import { listArtifacts, formatArtifactReference, type ArtifactInfo } from '../utils/artifacts';

export const PromptInput = ({ onSubmit, onCancel, onStateChange }: {
  onSubmit: (title: string, p: string, agentType: AgentType, worktree: { enabled: boolean; name: string }) => void;
  onCancel: () => void;
  onStateChange?: (state: { step: InputStep; showSlashMenu: boolean }) => void;
}) => {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [agentType, setAgentType] = useState<AgentType>('normal');
  const [agentTypeFilter, setAgentTypeFilter] = useState('');
  const [agentTypeSelectedIndex, setAgentTypeSelectedIndex] = useState(0);
  const [artifacts, setArtifacts] = useState<ArtifactInfo[]>([]);
  const [selectedArtifactIndex, setSelectedArtifactIndex] = useState(-1);
  const [artifactFilter, setArtifactFilter] = useState('');
  const [artifactSelectedIndex, setArtifactSelectedIndex] = useState(0);
  const [useWorktree, setUseWorktree] = useState(false);
  const [worktreeName, setWorktreeName] = useState('');
  const [step, setStep] = useState<InputStep>('title');
  const [gitRoot] = useState(() => getGitRoot());
  const [slashCommands, setSlashCommands] = useState<SlashCommand[]>([]);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashSearchQuery, setSlashSearchQuery] = useState('');
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

  useEffect(() => {
    AgentSDKManager.getAvailableCommands().then(setSlashCommands);
    listArtifacts().then(setArtifacts);
  }, []);

  useEffect(() => {
    onStateChange?.({ step, showSlashMenu });
  }, [step, showSlashMenu, onStateChange]);

  const agentTypeOptions = [
    { value: 'normal', label: 'Normal', description: 'ask for permissions' },
    { value: 'planning', label: 'Planning', description: 'plan before executing' },
    { value: 'auto-accept', label: 'Auto-accept', description: 'no permission prompts' },
  ] as const;

  const getFilteredAgentTypes = () => {
    if (!agentTypeFilter) return agentTypeOptions;
    const filter = agentTypeFilter.toLowerCase();
    return agentTypeOptions.filter(opt =>
      opt.label.toLowerCase().includes(filter) ||
      opt.description.toLowerCase().includes(filter)
    );
  };

  const getFilteredArtifacts = () => {
    const noneOption = { index: -1, name: 'None' };
    if (!artifactFilter) {
      return [noneOption, ...artifacts.map((a, i) => ({ index: i, name: a.name }))];
    }
    const filter = artifactFilter.toLowerCase();
    const filtered = artifacts
      .map((a, i) => ({ index: i, name: a.name }))
      .filter(a => a.name.toLowerCase().includes(filter));
    return [noneOption, ...filtered];
  };

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
      const filteredTypes = getFilteredAgentTypes();

      if (key.upArrow) {
        setAgentTypeSelectedIndex(i => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setAgentTypeSelectedIndex(i => Math.min(filteredTypes.length - 1, i + 1));
        return;
      }
      if (key.backspace || key.delete) {
        if (agentTypeFilter.length > 0) {
          setAgentTypeFilter(f => f.slice(0, -1));
          setAgentTypeSelectedIndex(0);
        }
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setAgentTypeFilter(f => f + input);
        setAgentTypeSelectedIndex(0);
        return;
      }
    }

    if (step === 'artifact') {
      const filteredArtifacts = getFilteredArtifacts();

      if (key.upArrow) {
        setArtifactSelectedIndex(i => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setArtifactSelectedIndex(i => Math.min(filteredArtifacts.length - 1, i + 1));
        return;
      }
      if (key.backspace || key.delete) {
        if (artifactFilter.length > 0) {
          setArtifactFilter(f => f.slice(0, -1));
          setArtifactSelectedIndex(0);
        }
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setArtifactFilter(f => f + input);
        setArtifactSelectedIndex(0);
        return;
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
    onSubmit(title, finalPrompt, agentType, { enabled: true, name });
  };

  const getFinalPrompt = () => {
    if (selectedArtifactIndex >= 0 && selectedArtifactIndex < artifacts.length) {
      const artifact = artifacts[selectedArtifactIndex];
      const artifactRef = formatArtifactReference(artifact.name);
      return `${artifactRef}\n\n${prompt}`;
    }
    return prompt;
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
    const filteredTypes = getFilteredAgentTypes();
    if (filteredTypes.length > 0) {
      const selected = filteredTypes[agentTypeSelectedIndex];
      setAgentType(selected.value as AgentType);
      setAgentTypeFilter('');
      setAgentTypeSelectedIndex(0);
      setStep('artifact');
    }
  };

  const handleArtifactReturn = () => {
    const filteredArtifacts = getFilteredArtifacts();
    if (filteredArtifacts.length > 0) {
      const selected = filteredArtifacts[artifactSelectedIndex];
      setSelectedArtifactIndex(selected.index);
      setArtifactFilter('');
      setArtifactSelectedIndex(0);

      if (gitRoot) {
        setStep('worktree');
      } else {
        const finalPrompt = getFinalPrompt();
        onSubmit(title, finalPrompt, agentType, { enabled: false, name: '' });
      }
    }
  };

  const handleWorktreeReturn = () => {
    if (useWorktree) {
      setStep('worktreeName');
    } else {
      const finalPrompt = getFinalPrompt();
      onSubmit(title, finalPrompt, agentType, { enabled: false, name: '' });
    }
  };

  return (
    <>
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
        <Text bold color="cyan">New Agent</Text>

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
            <Box marginLeft={2}>
              <MultilineInput
                value={prompt}
                onChange={handlePromptChange}
                onSubmit={handlePromptSubmit}
                placeholder="Enter your prompt..."
              />
            </Box>
          ) : (
            <Box marginLeft={2}>
              <Text dimColor={step === 'title'}>{prompt}</Text>
            </Box>
          )}
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text color={step === 'agentType' ? 'cyan' : step === 'title' || step === 'prompt' ? 'gray' : 'green'}>
              {step === 'title' || step === 'prompt' ? '○' : step === 'agentType' ? '▸' : '✓'} Agent Type:{' '}
            </Text>
            {step === 'agentType' ? (
              <TextInput
                value={agentTypeFilter}
                onChange={() => {}}
                placeholder="Filter..."
                showCursor={true}
              />
            ) : (
              <Text dimColor={step === 'title' || step === 'prompt'}>
                {agentType === 'normal' ? 'Normal' : agentType === 'planning' ? 'Planning' : 'Auto-accept'}
              </Text>
            )}
          </Box>
          {step === 'agentType' && (
            <Box flexDirection="column" marginLeft={2}>
              {getFilteredAgentTypes().slice(0, 5).map((opt, i) => (
                <Text key={opt.value} color={i === agentTypeSelectedIndex ? 'cyan' : 'white'} bold={i === agentTypeSelectedIndex}>
                  {i === agentTypeSelectedIndex ? '▸' : ' '} {opt.label} ({opt.description})
                </Text>
              ))}
              {getFilteredAgentTypes().length === 0 && (
                <Text dimColor>No matches found</Text>
              )}
            </Box>
          )}
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text color={step === 'artifact' ? 'cyan' : step === 'title' || step === 'prompt' || step === 'agentType' ? 'gray' : 'green'}>
              {step === 'title' || step === 'prompt' || step === 'agentType' ? '○' : step === 'artifact' ? '▸' : '✓'} Include Artifact:{' '}
            </Text>
            {step === 'artifact' ? (
              <TextInput
                value={artifactFilter}
                onChange={() => {}}
                placeholder="Filter or leave empty for None..."
                showCursor={true}
              />
            ) : (
              <Text dimColor={step === 'title' || step === 'prompt' || step === 'agentType'}>
                {selectedArtifactIndex >= 0 ? artifacts[selectedArtifactIndex].name : 'None'}
              </Text>
            )}
          </Box>
          {step === 'artifact' && (
            <Box flexDirection="column" marginLeft={2}>
              {artifacts.length === 0 ? (
                <Text dimColor>No artifacts found in ~/.agent-manager/artifacts/</Text>
              ) : (
                <>
                  {getFilteredArtifacts().slice(0, 5).map((artifact, i) => (
                    <Text key={artifact.name} color={i === artifactSelectedIndex ? 'cyan' : 'white'} bold={i === artifactSelectedIndex}>
                      {i === artifactSelectedIndex ? '▸' : ' '} {artifact.name}
                    </Text>
                  ))}
                  {getFilteredArtifacts().length === 0 && (
                    <Text dimColor>No matches found</Text>
                  )}
                </>
              )}
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
