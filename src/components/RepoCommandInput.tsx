import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { RepositoryManager } from '../utils/repositoryManager';
import type { Repository } from '../types';

interface RepoCommandInputProps {
  onComplete: () => void;
  onResult: (message: string, success: boolean) => void;
}

export const RepoCommandInput = ({ onComplete, onResult }: RepoCommandInputProps) => {
  const [input, setInput] = useState('repo ');
  const [showHelp, setShowHelp] = useState(true);

  useInput(async (char, key) => {
    if (key.escape) {
      onComplete();
      return;
    }

    if (key.backspace || key.delete) {
      if (input.length > 5) { // Don't delete "repo "
        setInput(input.slice(0, -1));
      }
      return;
    }

    if (key.return) {
      const parts = input.trim().split(/\s+/);
      if (parts.length < 2) {
        setShowHelp(true);
        return;
      }

      const subcommand = parts[1];

      try {
        switch (subcommand) {
          case 'ls': {
            const config = await RepositoryManager.loadRepositories();
            if (config.repositories.length === 0) {
              onResult('No repositories registered. Use "repo add <name> <path>" to add one.', true);
            } else {
              const message = config.repositories.map(r =>
                `${r.isDefault ? '* ' : '  '}${r.name} → ${r.path}`
              ).join('\n');
              onResult(message, true);
            }
            break;
          }

          case 'add': {
            if (parts.length < 4) {
              onResult('Usage: repo add <name> <path>', false);
              break;
            }
            const name = parts[2];
            const repoPath = parts.slice(3).join(' ');
            await RepositoryManager.addRepository(name, repoPath);
            onResult(`Repository '${name}' added successfully.`, true);
            break;
          }

          case 'remove': {
            if (parts.length < 3) {
              onResult('Usage: repo remove <name>', false);
              break;
            }
            const name = parts[2];
            await RepositoryManager.removeRepository(name);
            onResult(`Repository '${name}' removed.`, true);
            break;
          }

          case 'default': {
            if (parts.length < 3) {
              onResult('Usage: repo default <name>', false);
              break;
            }
            const name = parts[2];
            await RepositoryManager.setDefaultRepository(name);
            onResult(`Repository '${name}' set as default.`, true);
            break;
          }

          default:
            onResult(`Unknown subcommand: ${subcommand}`, false);
            break;
        }
      } catch (error: any) {
        onResult(`Error: ${error.message}`, false);
      }
      return;
    }

    if (char && !key.ctrl && !key.meta) {
      setInput(prev => prev + char);
      setShowHelp(false);
    }
  });

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="gray">:</Text>
        <Text>{input}</Text>
        <Text inverse> </Text>
      </Box>

      {showHelp && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Available subcommands:</Text>
          <Text dimColor>  ls                  - List all registered repositories</Text>
          <Text dimColor>  add &lt;name&gt; &lt;path&gt;   - Add a new repository</Text>
          <Text dimColor>  remove &lt;name&gt;       - Remove a repository</Text>
          <Text dimColor>  default &lt;name&gt;      - Set the default repository</Text>
        </Box>
      )}
    </Box>
  );
};