import React from 'react';
import { Text } from 'ink';

interface StatusLineProps {
  line: string;
  variant: 'error' | 'success' | 'warning';
}

const variantColors = {
  error: 'red',
  success: 'green',
  warning: 'yellow',
} as const;

export const StatusLine = ({ line, variant }: StatusLineProps) => {
  return <Text color={variantColors[variant]}>{line}</Text>;
};
