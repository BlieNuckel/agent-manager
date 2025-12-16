import React from 'react';
import { Box, Text } from 'ink';
import type { TodoItem } from '../types';

export interface TodoOverlayProps {
  todos: TodoItem[];
}

export const TodoOverlay = ({ todos }: TodoOverlayProps) => {
  const pendingCount = todos.filter(t => t.status === 'pending').length;
  const inProgressCount = todos.filter(t => t.status === 'in_progress').length;
  const completedCount = todos.filter(t => t.status === 'completed').length;

  const getStatusIcon = (status: TodoItem['status']): string => {
    switch (status) {
      case 'pending':
        return '○';
      case 'in_progress':
        return '◐';
      case 'completed':
        return '●';
    }
  };

  const getStatusColor = (status: TodoItem['status']): string => {
    switch (status) {
      case 'pending':
        return 'gray';
      case 'in_progress':
        return 'yellow';
      case 'completed':
        return 'green';
    }
  };

  return (
    <Box flexDirection="column" flexShrink={0} borderStyle="round" borderColor="blue" padding={1}>
      <Box justifyContent="space-between">
        <Text color="blue" bold>
          [T] Todo List
        </Text>
        <Text dimColor>
          {pendingCount} pending, {inProgressCount} in progress, {completedCount} completed
        </Text>
      </Box>

      {todos.length === 0 ? (
        <Box marginTop={1}>
          <Text dimColor>No todos tracked</Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginTop={1}>
          {todos.map((todo, index) => (
            <Box key={index}>
              <Text color={getStatusColor(todo.status)}>
                {getStatusIcon(todo.status)}
              </Text>
              <Text> </Text>
              <Text color={todo.status === 'completed' ? 'gray' : undefined}>
                {todo.status === 'in_progress' ? todo.activeForm : todo.content}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>Press 't' to hide</Text>
      </Box>
    </Box>
  );
};