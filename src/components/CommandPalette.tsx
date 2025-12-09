import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import type { Command } from '../commands/types';
import { HoverWindow } from './HoverWindow';

interface CommandPaletteProps {
  commands: Command[];
  onExecute: (command: Command) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ commands, onExecute, onCancel, loading = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [inputMode, setInputMode] = useState(true);
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns ?? 80;

  const filteredCommands = commands
    .filter(cmd => !cmd.hidden)
    .filter(cmd => {
      const query = searchQuery.toLowerCase();
      return (
        cmd.name.toLowerCase().includes(query) ||
        cmd.description.toLowerCase().includes(query) ||
        (cmd.category && cmd.category.toLowerCase().includes(query))
      );
    });

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useInput((input, key) => {
    if (loading) return;

    if (key.escape) {
      onCancel();
      return;
    }

    if (!inputMode) {
      if (key.upArrow || input === 'k') {
        setSelectedIndex(prev => Math.max(0, prev - 1));
      }
      if (key.downArrow || input === 'j') {
        setSelectedIndex(prev => Math.min(filteredCommands.length - 1, prev + 1));
      }
      if (key.return && filteredCommands[selectedIndex]) {
        onExecute(filteredCommands[selectedIndex]);
      }
      if (input === 'i' || input === '/') {
        setInputMode(true);
      }
    }
  });

  const handleSubmit = () => {
    setInputMode(false);
  };

  const maxHeight = 15;
  const visibleCommands = filteredCommands.slice(0, maxHeight);
  const hasMore = filteredCommands.length > maxHeight;

  const windowWidth = 80;
  const windowLeft = Math.max(0, Math.floor((terminalWidth - windowWidth) / 2));

  return (
    <HoverWindow
      width={windowWidth}
      position={{ top: 2, left: windowLeft }}
      showBorder={true}
      borderColor="cyan"
      borderStyle="round"
      dimBackground={true}
      padding={1}
    >
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyan">Command Palette</Text>
        </Box>

        <Box marginBottom={1}>
          {inputMode ? (
            <Box>
              <Text color="gray">Search: </Text>
              <TextInput
                value={searchQuery}
                onChange={setSearchQuery}
                onSubmit={handleSubmit}
                placeholder="Type to filter commands..."
              />
            </Box>
          ) : (
            <Box>
              <Text color="gray">Search: </Text>
              <Text>{searchQuery || 'Type to filter commands...'}</Text>
              <Text color="dim"> (press i to edit)</Text>
            </Box>
          )}
        </Box>

        {loading ? (
          <Box marginTop={1}>
            <Text color="yellow">Loading commands...</Text>
          </Box>
        ) : filteredCommands.length === 0 ? (
          <Box marginTop={1}>
            <Text color="gray">No commands found</Text>
          </Box>
        ) : (
          <Box flexDirection="column">
            {visibleCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex && !inputMode;
              return (
                <Box key={cmd.id} marginBottom={idx === visibleCommands.length - 1 ? 0 : 0}>
                  <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
                    {isSelected ? '> ' : '  '}
                    {cmd.name}
                  </Text>
                  <Text color="gray"> - {cmd.description}</Text>
                  {cmd.category && (
                    <Text color="dim"> [{cmd.category}]</Text>
                  )}
                </Box>
              );
            })}
            {hasMore && (
              <Box marginTop={1}>
                <Text color="dim">... and {filteredCommands.length - maxHeight} more</Text>
              </Box>
            )}
          </Box>
        )}

        <Box marginTop={1} borderStyle="single" borderColor="dim" paddingX={1}>
          <Text color="dim">
            {inputMode ? (
              'Enter to search • Esc to close'
            ) : (
              '↑↓/kj to navigate • Enter to execute • i to edit search • Esc to close'
            )}
          </Text>
        </Box>
      </Box>
    </HoverWindow>
  );
};
