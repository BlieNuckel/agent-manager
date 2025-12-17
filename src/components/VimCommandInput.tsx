import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Command } from '../commands/types';

interface VimCommandInputProps {
  commands: Command[];
  onExecute: (command: Command, args: string[]) => void;
  onCancel: () => void;
}

interface ParsedCommand {
  commandName: string;
  args: string[];
  currentArg: number;
}

const parseCommandLine = (input: string): ParsedCommand => {
  const parts = input.split(/\s+/).filter(part => part.length > 0);
  return {
    commandName: parts[0] || '',
    args: parts.slice(1),
    currentArg: parts.length - 1
  };
};

export const VimCommandInput = ({ commands, onExecute, onCancel }: VimCommandInputProps) => {
  const [input, setInput] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const parsed = parseCommandLine(input);

  // Filter commands based on current input
  const suggestions = commands.filter(cmd =>
    cmd.name.toLowerCase().startsWith(parsed.commandName.toLowerCase()) &&
    !cmd.hidden
  );

  // Get the best match for ghost text
  const bestMatch = suggestions.length > 0 ? suggestions[selectedIndex] : null;

  useInput((char, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.return) {
      if (bestMatch) {
        const parts = input.trim().split(/\s+/);
        const args = parts.slice(1);
        onExecute(bestMatch, args);
      }
      return;
    }

    if (key.tab) {
      if (suggestions.length > 0) {
        const selectedCommand = suggestions[selectedIndex];
        setInput(selectedCommand.name + ' ');
        setShowSuggestions(false);
      }
      return;
    }

    if (key.upArrow || (key.ctrl && char === 'k')) {
      if (showSuggestions && selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      }
      return;
    }

    if (key.downArrow || (key.ctrl && char === 'j')) {
      if (showSuggestions && selectedIndex < suggestions.length - 1) {
        setSelectedIndex(selectedIndex + 1);
      }
      return;
    }

    if (key.backspace || key.delete) {
      setInput(prev => prev.slice(0, -1));
      setShowSuggestions(true);
      setSelectedIndex(0);
      return;
    }

    if (char.length === 1 && !key.ctrl && !key.meta) {
      setInput(prev => prev + char);
      setShowSuggestions(true);
      setSelectedIndex(0);
    }
  });

  // Reset selected index when suggestions change
  useEffect(() => {
    if (selectedIndex >= suggestions.length) {
      setSelectedIndex(Math.max(0, suggestions.length - 1));
    }
  }, [suggestions.length, selectedIndex]);

  // Generate ghost text for arguments
  const getGhostText = () => {
    if (!bestMatch) return '';

    // If we're still typing the command name, show the rest of the command
    if (parsed.args.length === 0 && parsed.commandName) {
      const remainder = bestMatch.name.slice(parsed.commandName.length);
      if (remainder) {
        return remainder;
      }
    }

    // Show argument hints if the command has arguments defined
    if (bestMatch.args && bestMatch.args.length > 0 && input.endsWith(' ')) {
      const argIndex = parsed.args.length;
      if (argIndex < bestMatch.args.length) {
        const arg = bestMatch.args[argIndex];
        const hint = arg.required ? `<${arg.name}>` : `[${arg.name}]`;
        return hint;
      }
    }

    return '';
  };

  const ghostText = getGhostText();

  return (
    <Box width="100%" flexDirection="column">
      <Box>
        <Text color="gray">:</Text>
        <Text>{input}</Text>
        {ghostText && <Text dimColor>{ghostText}</Text>}
        <Text inverse> </Text>
      </Box>

      {showSuggestions && suggestions.length > 0 && parsed.commandName && (
        <Box flexDirection="column" marginTop={1}>
          {suggestions.slice(0, 5).map((cmd, index) => (
            <Box key={cmd.id} flexDirection="column">
              <Box>
                <Text color={index === selectedIndex ? 'yellow' : 'gray'}>
                  {index === selectedIndex ? '> ' : '  '}
                </Text>
                <Text color={index === selectedIndex ? 'white' : 'gray'}>
                  {cmd.name}
                </Text>
                <Text dimColor> - {cmd.description}</Text>
              </Box>
              {index === selectedIndex && cmd.args && cmd.args.length > 0 && (
                <Box marginLeft={4}>
                  <Text dimColor>
                    Args: {cmd.args.map(arg =>
                      arg.required ? `<${arg.name}>` : `[${arg.name}]`
                    ).join(' ')}
                  </Text>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};