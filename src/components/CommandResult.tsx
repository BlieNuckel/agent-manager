import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { CommandResult as CommandResultType } from '../commands/types';

interface CommandResultProps {
  result: CommandResultType;
  commandName: string;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export const CommandResult: React.FC<CommandResultProps> = ({
  result,
  commandName,
  onDismiss,
  autoDismissMs = 3000,
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (result.success && autoDismissMs > 0) {
      const startTime = Date.now();
      const endTime = startTime + autoDismissMs;

      const interval = setInterval(() => {
        const remaining = Math.ceil((endTime - Date.now()) / 1000);
        if (remaining <= 0) {
          clearInterval(interval);
          onDismiss();
        } else {
          setCountdown(remaining);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [result.success, autoDismissMs, onDismiss]);

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onDismiss();
    }
  });

  const borderColor = result.success ? 'green' : 'red';
  const icon = result.success ? '✓' : '✗';
  const statusColor = result.success ? 'green' : 'red';

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={borderColor} padding={1} width={80}>
      <Box marginBottom={1}>
        <Text bold color={statusColor}>
          {icon} Command Result: {commandName}
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text>{result.message}</Text>
        {result.error && (
          <Box marginTop={1}>
            <Text color="red">Error: {result.error}</Text>
          </Box>
        )}
        {result.data && typeof result.data === 'string' && result.data.trim() && (
          <Box marginTop={1} flexDirection="column">
            <Text color="dim">Output:</Text>
            <Box borderStyle="single" borderColor="dim" paddingX={1} marginTop={0}>
              <Text>{result.data}</Text>
            </Box>
          </Box>
        )}
      </Box>

      <Box borderStyle="single" borderColor="dim" paddingX={1}>
        <Text color="dim">
          {result.success && countdown !== null ? (
            `Auto-dismissing in ${countdown}s • Press Esc to close now`
          ) : (
            'Press Esc to close'
          )}
        </Text>
      </Box>
    </Box>
  );
};
