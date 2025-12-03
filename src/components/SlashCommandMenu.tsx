import React from 'react';
import { Box, Text } from 'ink';
import type { SlashCommand } from '@anthropic-ai/claude-agent-sdk';

interface SlashCommandMenuProps {
  commands: SlashCommand[];
  searchQuery: string;
  selectedIndex: number;
}

export const SlashCommandMenu = ({ commands, searchQuery, selectedIndex }: SlashCommandMenuProps) => {
  const filteredCommands = commands.filter(cmd =>
    cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filteredCommands.length === 0) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} marginTop={1}>
        <Text color="yellow">No slash commands found matching "{searchQuery}"</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} marginTop={1}>
      <Text bold color="yellow">Slash Commands (↑↓ to navigate, Enter to select, Esc to cancel)</Text>
      <Box flexDirection="column" marginTop={1}>
        {filteredCommands.map((cmd, index) => {
          const isSelected = index === selectedIndex;
          return (
            <Box key={cmd.name} flexDirection="column" marginBottom={index < filteredCommands.length - 1 ? 1 : 0}>
              <Box>
                <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
                  {isSelected ? '▸ ' : '  '}
                  /{cmd.name}
                  {cmd.argumentHint && <Text dimColor> {cmd.argumentHint}</Text>}
                </Text>
              </Box>
              <Box marginLeft={2}>
                <Text dimColor>{cmd.description}</Text>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
