import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { AgentType, InputStep } from '../types';
import { getGitRoot, generateWorktreeName } from '../git/worktree';

export const PromptInput = ({ onSubmit, onCancel }: {
  onSubmit: (p: string, agentType: AgentType, worktree: { enabled: boolean; name: string }) => void;
  onCancel: () => void;
}) => {
  const [prompt, setPrompt] = useState('');
  const [agentType, setAgentType] = useState<AgentType>('normal');
  const [useWorktree, setUseWorktree] = useState(false);
  const [worktreeName, setWorktreeName] = useState('');
  const [step, setStep] = useState<InputStep>('prompt');
  const [autoName] = useState(generateWorktreeName);
  const [gitRoot] = useState(() => getGitRoot());

  useInput((input, key) => {
    if (key.escape) { onCancel(); return; }

    if (key.return) {
      if (step === 'prompt' && prompt) { setStep('agentType'); return; }
      if (step === 'agentType') {
        if (gitRoot) { setStep('worktree'); return; }
        onSubmit(prompt, agentType, { enabled: false, name: '' });
        return;
      }
      if (step === 'worktree') {
        if (useWorktree) { setStep('worktreeName'); return; }
        onSubmit(prompt, agentType, { enabled: false, name: '' });
        return;
      }
      if (step === 'worktreeName') {
        const name = worktreeName.trim() || autoName;
        onSubmit(prompt, agentType, { enabled: true, name });
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

    if (key.backspace || key.delete) {
      if (step === 'prompt') setPrompt(p => p.slice(0, -1));
      else if (step === 'worktreeName') setWorktreeName(n => n.slice(0, -1));
      return;
    }

    if (input && !key.ctrl && !key.meta && step !== 'agentType' && step !== 'worktree') {
      if (step === 'prompt') setPrompt(p => p + input);
      else if (step === 'worktreeName') setWorktreeName(n => n + input);
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
      <Text bold color="cyan">New Agent</Text>

      <Box marginTop={1}>
        <Text color={step === 'prompt' ? 'cyan' : 'green'}>
          {step === 'prompt' ? '>' : '+'} Prompt:{' '}
        </Text>
        <Text>{prompt}<Text color="cyan">{step === 'prompt' ? '▋' : ''}</Text></Text>
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
              <Text>
                {worktreeName || ''}
                <Text color="cyan">{step === 'worktreeName' ? '▋' : ''}</Text>
                {step === 'worktreeName' && !worktreeName && (
                  <Text dimColor> (empty for auto: {autoName})</Text>
                )}
              </Text>
            </Box>
          )}
        </>
      )}

      <Box marginTop={1}>
        <Text dimColor>Enter to continue • Esc to cancel</Text>
      </Box>
    </Box>
  );
};
