import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import type { Status } from '../types';

export const StatusBadge = ({ status }: { status: Status }) => {
  const cfg: Record<Status, { color: string; icon: string; label: string }> = {
    working: { color: 'yellow', icon: '', label: 'Working' },
    waiting: { color: 'cyan', icon: '?', label: 'Waiting' },
    idle: { color: 'blue', icon: '~', label: 'Idle' },
    done: { color: 'green', icon: '+', label: 'Done' },
    error: { color: 'red', icon: 'x', label: 'Error' },
  };
  const { color, icon, label } = cfg[status];

  return (
    <Box width={12}>
      {status === 'working' ? (
        <Text color={color}><Spinner type="dots" /> {label}</Text>
      ) : (
        <Text color={color}>{icon} {label}</Text>
      )}
    </Box>
  );
};
