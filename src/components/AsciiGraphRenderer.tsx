import React from 'react';
import { Box, Text } from 'ink';
import type { GraphData, GraphNode, GraphEdge } from '../types';

interface AsciiGraphRendererProps {
  graphData: GraphData;
  selectedNodeId: string | null;
  onNodeSelect?: (nodeId: string) => void;
}

export const AsciiGraphRenderer: React.FC<AsciiGraphRendererProps> = ({
  graphData,
  selectedNodeId,
}) => {
  // Calculate canvas dimensions
  const maxX = Math.max(...graphData.nodes.map(n => n.position.x + 30), 120);
  const maxY = Math.max(...graphData.nodes.map(n => n.position.y + 3), 30);

  // Create a 2D array for the canvas
  const canvas: string[][] = Array(maxY).fill(null).map(() => Array(maxX).fill(' '));

  // Function to draw a line on the canvas
  const drawLine = (x1: number, y1: number, x2: number, y2: number, type: 'vertical' | 'horizontal') => {
    if (type === 'vertical') {
      const x = x1;
      const startY = Math.min(y1, y2);
      const endY = Math.max(y1, y2);
      for (let y = startY; y <= endY; y++) {
        if (y >= 0 && y < maxY && x >= 0 && x < maxX) {
          canvas[y][x] = '│';
        }
      }
    } else {
      const y = y1;
      const startX = Math.min(x1, x2);
      const endX = Math.max(x1, x2);
      for (let x = startX; x <= endX; x++) {
        if (y >= 0 && y < maxY && x >= 0 && x < maxX) {
          canvas[y][x] = '─';
        }
      }
    }
  };

  // Function to draw a node box
  const drawNode = (node: GraphNode) => {
    const { x, y } = node.position;
    const width = node.label.length + 4;
    const height = 3;

    // Draw box corners
    if (y >= 0 && y < maxY && x >= 0 && x < maxX) canvas[y][x] = '┌';
    if (y >= 0 && y < maxY && x + width - 1 >= 0 && x + width - 1 < maxX) canvas[y][x + width - 1] = '┐';
    if (y + height - 1 >= 0 && y + height - 1 < maxY && x >= 0 && x < maxX) canvas[y + height - 1][x] = '└';
    if (y + height - 1 >= 0 && y + height - 1 < maxY && x + width - 1 >= 0 && x + width - 1 < maxX) canvas[y + height - 1][x + width - 1] = '┘';

    // Draw horizontal lines
    for (let i = 1; i < width - 1; i++) {
      if (y >= 0 && y < maxY && x + i >= 0 && x + i < maxX) canvas[y][x + i] = '─';
      if (y + height - 1 >= 0 && y + height - 1 < maxY && x + i >= 0 && x + i < maxX) canvas[y + height - 1][x + i] = '─';
    }

    // Draw vertical lines
    for (let i = 1; i < height - 1; i++) {
      if (y + i >= 0 && y + i < maxY && x >= 0 && x < maxX) canvas[y + i][x] = '│';
      if (y + i >= 0 && y + i < maxY && x + width - 1 >= 0 && x + width - 1 < maxX) canvas[y + i][x + width - 1] = '│';
    }

    // Add label
    const labelStart = x + 2;
    for (let i = 0; i < node.label.length; i++) {
      if (y + 1 >= 0 && y + 1 < maxY && labelStart + i >= 0 && labelStart + i < maxX) {
        canvas[y + 1][labelStart + i] = node.label[i];
      }
    }
  };

  // Draw edges
  graphData.edges.forEach(edge => {
    const fromNode = graphData.nodes.find(n => n.id === edge.from);
    const toNode = graphData.nodes.find(n => n.id === edge.to);

    if (fromNode && toNode) {
      const fromX = fromNode.position.x + fromNode.label.length / 2;
      const fromY = fromNode.position.y + 3;
      const toX = toNode.position.x + toNode.label.length / 2;
      const toY = toNode.position.y;

      // Simple L-shaped connection
      if (edge.type === 'depends-on' || edge.type === 'contains') {
        drawLine(fromX, fromY, fromX, toY, 'vertical');
        drawLine(fromX, toY, toX, toY, 'horizontal');
      } else if (edge.type === 'produces' || edge.type === 'consumes') {
        // Direct horizontal line for artifact connections
        const midY = (fromY + toY) / 2;
        drawLine(fromNode.position.x + fromNode.label.length + 4, fromNode.position.y + 1,
                toNode.position.x, toNode.position.y + 1, 'horizontal');
      }
    }
  });

  // Draw nodes (after edges so they appear on top)
  graphData.nodes.forEach(node => {
    drawNode(node);
  });

  // Render the canvas
  return (
    <Box flexDirection="column">
      {canvas.map((row, y) => {
        // Check if any node is on this row and is selected
        const rowHasSelectedNode = graphData.nodes.some(node =>
          node.id === selectedNodeId &&
          y >= node.position.y &&
          y < node.position.y + 3
        );

        return (
          <Text key={y} color={rowHasSelectedNode ? 'yellow' : undefined}>
            {row.join('')}
          </Text>
        );
      })}
    </Box>
  );
};