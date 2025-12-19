import React from 'react';
import { Box, Text } from 'ink';
import type { GraphNode as GraphNodeType } from '../types';

interface GraphNodeProps {
  node: GraphNodeType;
  isSelected: boolean;
}

export const GraphNode: React.FC<GraphNodeProps> = ({ node, isSelected }) => {
  // Determine node colors based on type and status
  const getNodeColor = () => {
    if (isSelected) return 'yellow';

    if (node.status === 'active') return 'cyan';
    if (node.status === 'completed') return 'green';
    if (node.status === 'failed') return 'red';

    switch (node.type) {
      case 'workflow': return 'magenta';
      case 'stage': return 'blue';
      case 'agent': return 'white';
      case 'artifact': return 'gray';
      default: return 'white';
    }
  };

  // Determine status indicator
  const getStatusIndicator = () => {
    switch (node.status) {
      case 'active': return '◉';
      case 'completed': return '✓';
      case 'failed': return '✗';
      case 'pending': return '○';
      default: return ' ';
    }
  };

  // Format label with type prefix
  const getFormattedLabel = () => {
    const prefix = node.type === 'workflow' ? '📊' :
                   node.type === 'stage' ? '📌' :
                   node.type === 'agent' ? '🤖' :
                   node.type === 'artifact' ? '📄' : '';

    return `${prefix} ${node.label}`;
  };

  return (
    <Box borderStyle="single" borderColor={getNodeColor()} paddingX={1}>
      <Text color={getNodeColor()}>
        {getStatusIndicator()} {getFormattedLabel()}
      </Text>
    </Box>
  );
};