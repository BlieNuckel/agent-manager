import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { AgentType, InputStep } from '../types';
import type { SlashCommand } from '@anthropic-ai/claude-agent-sdk';
import { getGitRoot } from '../git/worktree';
import { AgentSDKManager } from '../agent/manager';
import { SlashCommandMenu } from './SlashCommandMenu';

export const PromptInput = ({ onSubmit, onCancel }: {
  onSubmit: (p: string, agentType: AgentType, worktree: { enabled: boolean; name: string }) => void;
  onCancel: () => void;
}) => {
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

    if (key.return) {
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
        <Text bold color="cyan">New Agent</Text>

        <Box marginTop={1}>
          <Text color={step === 'prompt' ? 'cyan' : 'green'}>
            {step === 'prompt' ? '>' : '+'} Prompt:{' '}
          </Text>
          {step === 'prompt' ? (
            <TextInput
              value={prompt}
              onChange={handlePromptChange}
              onSubmit={handlePromptSubmit}
              placeholder="Enter your prompt..."
            />
          ) : (
            <Text>{prompt}</Text>
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

        <Box marginTop={1}>
          <Text dimColor>
            Enter to continue • Esc to cancel
            {step !== 'prompt' && ' • ← to go back'}
            {step === 'prompt' && ' • Type / for slash commands'}
          </Text>
        </Box>
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
