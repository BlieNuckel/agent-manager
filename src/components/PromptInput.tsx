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
  const [artifacts, setArtifacts] = useState<ArtifactInfo[]>([]);
  const [selectedArtifactIndex, setSelectedArtifactIndex] = useState(-1);
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
    setStep('artifact');
  };

  const handleArtifactReturn = () => {
    if (gitRoot) {
      setStep('worktree');
    } else {
      const finalPrompt = getFinalPrompt();
      onSubmit(title, finalPrompt, agentType, { enabled: false, name: '' });
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

        <Box marginTop={1}>
          <Text color={step === 'agentType' ? 'cyan' : step === 'title' || step === 'prompt' ? 'gray' : 'green'}>
            {step === 'title' || step === 'prompt' ? '○' : step === 'agentType' ? '▸' : '✓'} Agent Type:{' '}
          </Text>
          {step === 'agentType' ? (
            <Box flexDirection="column">
              <Text>[<Text color={agentType === 'normal' ? 'cyan' : 'white'} bold={agentType === 'normal'}>1</Text>] Normal (ask for permissions)</Text>
              <Text>[<Text color={agentType === 'planning' ? 'cyan' : 'white'} bold={agentType === 'planning'}>2</Text>] Planning (plan before executing)</Text>
              <Text>[<Text color={agentType === 'auto-accept' ? 'cyan' : 'white'} bold={agentType === 'auto-accept'}>3</Text>] Auto-accept (no permission prompts)</Text>
            </Box>
          ) : (
            <Text dimColor={step === 'title' || step === 'prompt'}>
              {agentType === 'normal' ? 'Normal' : agentType === 'planning' ? 'Planning' : 'Auto-accept'}
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
