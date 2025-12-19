import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import type { OutputLine, SubagentStats } from '../types';
import {
  groupOutputLines,
  isCollapsibleBlock,
} from './output';
import { renderBlocksToLines, type RenderedLine } from './output/viewportRenderer';
import { AnsiText } from '../utils/ansiToInk';

interface AgentOutputViewportProps {
  output: OutputLine[];
  height: number;
  width: number;
  isActive: boolean;
  autoScroll?: boolean;
  showToolCalls?: boolean;
  subagentStats?: Record<string, SubagentStats>;
}

export const AgentOutputViewport = ({
  output,
  height,
  width,
  isActive,
  autoScroll = true,
  showToolCalls = false,
  subagentStats,
}: AgentOutputViewportProps) => {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set());
  const [userScrolled, setUserScrolled] = useState(false);
  const [pendingInput, setPendingInput] = useState<string>('');
  const [inputTimeout, setInputTimeout] = useState<NodeJS.Timeout | null>(null);

  const blocks = useMemo(() => {
    return groupOutputLines(output, subagentStats);
  }, [output, subagentStats]);

  useEffect(() => {
    const newCollapsed = new Set<string>();
    for (const block of blocks) {
      if (block.type === 'tool-group' && !showToolCalls) {
        newCollapsed.add(block.id);
      }
    }
    setCollapsedBlocks(prev => {
      const merged = new Set(prev);
      for (const id of newCollapsed) {
        if (!prev.has(id)) {
          merged.add(id);
        }
      }
      return merged;
    });
  }, [blocks, showToolCalls]);

  // Pre-render all blocks into lines
  const renderedLines = useMemo(() => {
    return renderBlocksToLines(blocks, {
      width,
      collapsed: collapsedBlocks,
      showToolCalls
    });
  }, [blocks, width, collapsedBlocks, showToolCalls]);

  const totalLines = renderedLines.length;
  const maxScroll = Math.max(0, totalLines - height);

  useEffect(() => {
    if (autoScroll && !userScrolled) {
      setScrollOffset(maxScroll);
    }
  }, [totalLines, maxScroll, autoScroll, userScrolled]);

  useEffect(() => {
    if (scrollOffset >= maxScroll - 1) {
      setUserScrolled(false);
    }
  }, [scrollOffset, maxScroll]);

  const collapsibleBlocks = useMemo(() => {
    return blocks.filter(isCollapsibleBlock);
  }, [blocks]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (inputTimeout) {
        clearTimeout(inputTimeout);
      }
    };
  }, [inputTimeout]);

  // Helper function to toggle a block's collapsed state
  const toggleBlock = (blockNumber: number) => {
    const targetBlock = collapsibleBlocks[blockNumber - 1];
    if (targetBlock) {
      setCollapsedBlocks(prev => {
        const next = new Set(prev);
        if (next.has(targetBlock.id)) {
          next.delete(targetBlock.id);
        } else {
          next.add(targetBlock.id);
        }
        return next;
      });
    }
  };

  // Helper function to check if there are any blocks that start with the given prefix
  const hasBlocksStartingWith = (prefix: string) => {
    const prefixNum = parseInt(prefix, 10);
    if (isNaN(prefixNum)) return false;

    // Check if there are any blocks with numbers that start with this prefix
    for (let i = 0; i < collapsibleBlocks.length; i++) {
      const blockNum = i + 1;
      if (blockNum.toString().startsWith(prefix) && blockNum.toString() !== prefix) {
        return true;
      }
    }
    return false;
  };

  useInput((input, key) => {
    if (!isActive) return;

    // Clear any pending timeout if user presses a non-digit key
    if (!/^\d$/.test(input) && inputTimeout) {
      clearTimeout(inputTimeout);
      setInputTimeout(null);
      setPendingInput('');
    }

    if (key.downArrow || input === 'j') {
      setScrollOffset(o => Math.min(maxScroll, o + 1));
      setUserScrolled(true);
      return;
    }
    if (key.upArrow || input === 'k') {
      setScrollOffset(o => Math.max(0, o - 1));
      setUserScrolled(true);
      return;
    }
    if (input === 'g') {
      setScrollOffset(0);
      setUserScrolled(true);
      return;
    }
    if (input === 'G') {
      setScrollOffset(maxScroll);
      setUserScrolled(false);
      return;
    }

    // Handle numeric input for block toggling
    if (/^\d$/.test(input)) {
      const currentInput = pendingInput + input;
      const currentNum = parseInt(currentInput, 10);

      // Clear any existing timeout
      if (inputTimeout) {
        clearTimeout(inputTimeout);
        setInputTimeout(null);
      }

      // Check if this number exists as a block
      if (currentNum >= 1 && currentNum <= collapsibleBlocks.length) {
        // Check if there could be more digits (ambiguity)
        if (hasBlocksStartingWith(currentInput)) {
          // There's ambiguity, wait for more input
          setPendingInput(currentInput);

          // Set a timeout to execute after 500ms
          const timeout = setTimeout(() => {
            toggleBlock(currentNum);
            setPendingInput('');
            setInputTimeout(null);
          }, 500);

          setInputTimeout(timeout);
        } else {
          // No ambiguity, execute immediately
          toggleBlock(currentNum);
          setPendingInput('');
        }
      } else if (currentInput.length === 1 && hasBlocksStartingWith(currentInput)) {
        // First digit of a potential multi-digit number
        setPendingInput(currentInput);

        // Set a timeout in case user doesn't input second digit
        const timeout = setTimeout(() => {
          setPendingInput('');
          setInputTimeout(null);
        }, 500);

        setInputTimeout(timeout);
      } else {
        // Invalid number or no matching blocks
        setPendingInput('');
      }
    }
  });

  // Get visible lines to render
  const visibleLines = useMemo(() => {
    const startIdx = scrollOffset;
    const endIdx = Math.min(scrollOffset + height, renderedLines.length);
    return renderedLines.slice(startIdx, endIdx);
  }, [renderedLines, scrollOffset, height]);

  const renderLine = (line: RenderedLine) => {
    // Special handling for different line types
    if (line.isHeader) {
      if (line.blockType === 'user-input') {
        return <Text bold color="blue">{line.content}</Text>;
      } else if (line.blockType === 'status') {
        const isSuccess = line.content.includes('[✓]');
        return <Text color={isSuccess ? 'green' : 'red'} bold>{line.content}</Text>;
      } else if (line.blockType === 'tool-group' || line.blockType === 'subagent') {
        return <Text bold dimColor>{line.content}</Text>;
      }
    }

    // Regular content lines - use AnsiText for proper ANSI support
    return <AnsiText wrap="wrap">{line.content}</AnsiText>;
  };

  if (output.length === 0) {
    return (
      <Box flexDirection="column" height={height}>
        <Text dimColor>Waiting for output...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={height} overflow="hidden">
      {visibleLines.map((line, idx) => (
        <Box key={`${line.blockId}-${scrollOffset + idx}`}>
          {renderLine(line)}
        </Box>
      ))}
    </Box>
  );
};