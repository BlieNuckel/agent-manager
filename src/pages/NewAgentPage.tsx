import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { AgentType, InputStep } from '../types';
import type { SlashCommand } from '@anthropic-ai/claude-agent-sdk';
import { getGitRoot } from '../git/worktree';
import { AgentSDKManager } from '../agent/manager';
import { SlashCommandMenu } from '../components/SlashCommandMenu';
import { MultilineInput } from '../components/MultilineInput';

interface NewAgentPageProps {
  onSubmit: (p: string, agentType: AgentType, worktree: { enabled: boolean; name: string }) => void;
  onCancel: () => void;
  onStateChange?: (state: { step: InputStep; showSlashMenu: boolean }) => void;
  artifact?: { path: string; createdAt: Date };
}

export const NewAgentPage = ({ onSubmit, onCancel, onStateChange, artifact }: NewAgentPageProps) => {
  const [prompt, setPrompt] = useState('');
  const [agentType, setAgentType] = useState<AgentType>('normal');
  const [useWorktree, setUseWorktree] = useState(false);
  const [worktreeName, setWorktreeName] = useState('');
  const [step, setStep] = useState<InputStep>('prompt');
  const [gitRoot] = useState(() => getGitRoot());
  const [slashCommands, setSlashCommands] = useState<SlashCommand[]>([]);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashSearchQuery, setSlashSearchQuery] = useState('');
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

  useEffect(() => {
    AgentSDKManager.getAvailableCommands().then(setSlashCommands);
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
      if (step === 'agentType') {
        setStep('prompt');
        return;
      } else if (step === 'worktree') {
        setStep('agentType');
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

    if (step === 'worktree' && (input === 'y' || input === 'Y')) { setUseWorktree(true); return; }
    if (step === 'worktree' && (input === 'n' || input === 'N')) { setUseWorktree(false); return; }
  });

  const handlePromptSubmit = (value: string) => {
    if (value.trim()) {
      setStep('agentType');
    }
  };

  const handleWorktreeNameSubmit = (value: string) => {
    const name = value.trim();
    onSubmit(prompt, agentType, { enabled: true, name });
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
    if (gitRoot) {
      setStep('worktree');
    } else {
      onSubmit(prompt, agentType, { enabled: false, name: '' });
    }
  };

  const handleWorktreeReturn = () => {
    if (useWorktree) {
      setStep('worktreeName');
    } else {
      onSubmit(prompt, agentType, { enabled: false, name: '' });
    }
  };

  return (
    <>
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold color="cyan">New Agent</Text>
          {artifact && (
            <Text color="magenta" bold>
              📄 Artifact Context
            </Text>
          )}
        </Box>

        {artifact && (
          <Box marginTop={1} borderStyle="single" borderColor="magenta" paddingX={1}>
            <Text dimColor>Artifact: </Text>
            <Text color="magenta">{artifact.path}</Text>
          </Box>
        )}

        <Box marginTop={1} flexDirection="column">
          <Text color={step === 'prompt' ? 'cyan' : 'green'}>
            {step === 'prompt' ? '>' : '+'} Prompt:{' '}
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
              <Text>{prompt}</Text>
            </Box>
          )}
        </Box>

        <Box marginTop={1}>
          <Text color={step === 'agentType' ? 'cyan' : step === 'prompt' ? 'gray' : 'green'}>
            {step === 'prompt' ? '○' : step === 'agentType' ? '▸' : '✓'} Agent Type:{' '}
          </Text>
          {step === 'agentType' ? (
            <Box flexDirection="column">
              <Text>[<Text color={agentType === 'normal' ? 'cyan' : 'white'} bold={agentType === 'normal'}>1</Text>] Normal (ask for permissions)</Text>
              <Text>[<Text color={agentType === 'planning' ? 'cyan' : 'white'} bold={agentType === 'planning'}>2</Text>] Planning (plan before executing)</Text>
              <Text>[<Text color={agentType === 'auto-accept' ? 'cyan' : 'white'} bold={agentType === 'auto-accept'}>3</Text>] Auto-accept (no permission prompts)</Text>
            </Box>
          ) : (
            <Text dimColor={step === 'prompt'}>
              {agentType === 'normal' ? 'Normal' : agentType === 'planning' ? 'Planning' : 'Auto-accept'}
            </Text>
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
                <Text dimColor={step === 'prompt'}>{useWorktree ? 'Yes' : 'No'}</Text>
              )}
            </Box>

            {(step === 'worktreeName' || (useWorktree && step !== 'prompt')) && (
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

  if (inputStep === 'prompt') {
    return (
      <>
        <Text color="cyan">Enter</Text> Continue{' '}
        <Text color="cyan">Shift+Enter</Text> New Line{' '}
        <Text color="cyan">Ctrl+G</Text> Edit in Vim{' '}
        <Text color="cyan">/</Text> Slash Commands{' '}
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
