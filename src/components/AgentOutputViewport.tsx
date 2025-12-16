import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import type { OutputLine, SubagentStats } from '../types';
import {
  groupOutputLines,
  getBlockLineCount,
  isCollapsibleBlock,
  convertBlockViewport,
  StatusLine,
  UserInputLine,
  MessageBlock,
  ToolGroupBlock,
  SubagentBlock,
  type OutputBlockData
} from './output';

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

  const totalLines = useMemo(() => {
    let count = 0;
    for (const block of blocks) {
      count += getBlockLineCount(block, collapsedBlocks.has(block.id), width);
    }
    return count;
  }, [blocks, collapsedBlocks, width]);

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

  useInput((input, key) => {
    if (!isActive) return;

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

    const num = parseInt(input, 10);
    if (num >= 1 && num <= 9) {
      const targetBlock = collapsibleBlocks[num - 1];
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
    }
  });

  const renderBlocks = useMemo(() => {
    const result: { block: OutputBlockData; lineIndex: number; collapsed: boolean; blockNumber: number }[] = [];
    let lineIndex = 0;
    let collapsibleIndex = 0;

    for (const block of blocks) {
      const isCollapsible = isCollapsibleBlock(block);
      const collapsed = collapsedBlocks.has(block.id);
      const blockNumber = isCollapsible ? ++collapsibleIndex : 0;

      result.push({ block, lineIndex, collapsed, blockNumber });
      lineIndex += getBlockLineCount(block, collapsed, width);
    }

    return result;
  }, [blocks, collapsedBlocks, width]);

  const visibleBlocks = useMemo(() => {
    const visible: { block: OutputBlockData; collapsed: boolean; blockNumber: number; skipLines: number; maxLines?: number; showHeader: boolean }[] = [];
    const endLine = scrollOffset + height;

    for (const { block, lineIndex, collapsed, blockNumber } of renderBlocks) {
      const blockLines = getBlockLineCount(block, collapsed, width);
      const blockEnd = lineIndex + blockLines;

      if (blockEnd > scrollOffset && lineIndex < endLine) {
        const skipWrappedLines = Math.max(0, scrollOffset - lineIndex);
        const maxWrappedLines = Math.min(blockLines - skipWrappedLines, height - (lineIndex + skipWrappedLines - scrollOffset));

        const viewport = convertBlockViewport(block, collapsed, width, skipWrappedLines, maxWrappedLines);

        visible.push({
          block,
          collapsed,
          blockNumber,
          skipLines: viewport.skipLines,
          maxLines: viewport.maxLines,
          showHeader: viewport.showHeader,
        });
      }
    }

    return visible;
  }, [renderBlocks, scrollOffset, height, width]);

  const renderBlock = (
    block: OutputBlockData,
    collapsed: boolean,
    blockNumber: number,
    skipLines: number,
    maxLines: number | undefined,
    showHeader: boolean
  ) => {
    switch (block.type) {
      case 'messages':
        return (
          <MessageBlock
            key={block.id}
            lines={block.lines}
            width={width}
            skipLines={skipLines}
            maxLines={maxLines}
          />
        );

      case 'user-input':
        return <UserInputLine key={block.id} text={block.text} />;

      case 'status':
        return (
          <Box key={block.id}>
            <StatusLine line={block.line} variant={block.variant} />
          </Box>
        );

      case 'tool-group':
        return (
          <ToolGroupBlock
            key={block.id}
            count={block.count}
            errorCount={block.errorCount}
            lines={block.lines}
            collapsed={collapsed}
            blockNumber={blockNumber}
            skipLines={skipLines}
            maxLines={maxLines}
            showHeader={showHeader}
          />
        );

      case 'subagent':
        return (
          <SubagentBlock
            key={block.id}
            id={block.id}
            subagentType={block.subagentType}
            status={block.status}
            output={block.output}
            stats={block.stats}
            collapsed={collapsed}
            blockNumber={blockNumber}
            width={width}
            skipLines={skipLines}
            maxLines={maxLines}
            showHeader={showHeader}
          />
        );
    }
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
      {visibleBlocks.map(({ block, collapsed, blockNumber, skipLines, maxLines, showHeader }) =>
        renderBlock(block, collapsed, blockNumber, skipLines, maxLines, showHeader)
      )}
    </Box>
  );
};
