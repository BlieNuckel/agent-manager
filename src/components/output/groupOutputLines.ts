import type { OutputLine, SubagentStats } from '../../types';
import type { OutputBlockData } from './types';

interface GroupingState {
  currentMessages: string[];
  currentToolGroup: string[];
  toolGroupErrorCount: number;
  activeSubagent: {
    toolUseId: string;
    subagentType: string;
    output: OutputLine[];
  } | null;
}

function getLineType(line: OutputLine): 'subagent-start' | 'subagent-end' | 'tool-call' | 'user-input' | 'error' | 'success' | 'warning' | 'message' {
  const text = line.text;

  if (text.startsWith('[→]')) return 'subagent-start';
  if (text.startsWith('[←]')) return 'subagent-end';
  if (text.startsWith('[>] User:')) return 'user-input';
  if (text.startsWith('[>]') || text.startsWith('[✓]') || text.startsWith('[×]')) return 'tool-call';
  if (text.startsWith('[x]')) return 'error';
  if (text.startsWith('[+]')) return 'success';
  if (text.startsWith('[-]') || text.startsWith('[!]') || text.startsWith('[?]')) return 'warning';

  return 'message';
}

function extractSubagentType(text: string): string {
  const match = text.match(/\[→\] Starting subagent: (.+)$/);
  return match?.[1] || 'unknown';
}

function extractSubagentToolUseId(line: OutputLine): string {
  return line.subagentId || `subagent-${Date.now()}`;
}

export function groupOutputLines(
  lines: OutputLine[],
  subagentStats?: Record<string, SubagentStats>
): OutputBlockData[] {
  const blocks: OutputBlockData[] = [];
  const state: GroupingState = {
    currentMessages: [],
    currentToolGroup: [],
    toolGroupErrorCount: 0,
    activeSubagent: null,
  };

  let currentLineIndex = 0;
  let blockStartLine = 0;

  const flushMessages = () => {
    if (state.currentMessages.length > 0) {
      blocks.push({
        type: 'messages',
        id: `block-${blockStartLine}`,
        lines: [...state.currentMessages],
      });
      state.currentMessages = [];
      blockStartLine = currentLineIndex;
    }
  };

  const flushToolGroup = () => {
    if (state.currentToolGroup.length > 0) {
      blocks.push({
        type: 'tool-group',
        id: `block-${blockStartLine}`,
        count: state.currentToolGroup.length,
        errorCount: state.toolGroupErrorCount,
        lines: [...state.currentToolGroup],
      });
      state.currentToolGroup = [];
      state.toolGroupErrorCount = 0;
      blockStartLine = currentLineIndex;
    }
  };

  const flushSubagent = (completed: boolean) => {
    if (state.activeSubagent) {
      const stats = subagentStats?.[state.activeSubagent.toolUseId];
      blocks.push({
        type: 'subagent',
        id: `block-${blockStartLine}`,
        toolUseId: state.activeSubagent.toolUseId,
        subagentType: state.activeSubagent.subagentType,
        status: completed ? 'completed' : 'running',
        output: [...state.activeSubagent.output],
        stats,
      });
      state.activeSubagent = null;
      blockStartLine = currentLineIndex;
    }
  };

  for (const line of lines) {
    if (!line.text.trim()) continue;

    const lineType = getLineType(line);

    if (line.isSubagent && state.activeSubagent) {
      state.activeSubagent.output.push(line);
      continue;
    }

    switch (lineType) {
      case 'subagent-start': {
        flushMessages();
        flushToolGroup();
        const subagentType = extractSubagentType(line.text);
        const toolUseId = extractSubagentToolUseId(line);
        state.activeSubagent = {
          toolUseId,
          subagentType,
          output: [],
        };
        break;
      }

      case 'subagent-end': {
        flushSubagent(true);
        break;
      }

      case 'tool-call': {
        flushMessages();
        state.currentToolGroup.push(line.text);

        if (line.toolError) {
          state.currentToolGroup.push(`    Error: ${line.toolError}`);
        }

        if (line.text.startsWith('[×]')) {
          state.toolGroupErrorCount++;
        }

        break;
      }

      case 'user-input': {
        flushMessages();
        flushToolGroup();
        blocks.push({
          type: 'user-input',
          id: `block-${blockStartLine}`,
          text: line.text.replace(/^\[>\] User:\s*/, ''),
        });
        blockStartLine = currentLineIndex + 1;
        break;
      }

      case 'error': {
        flushMessages();
        flushToolGroup();
        blocks.push({
          type: 'status',
          id: `block-${blockStartLine}`,
          line: line.text,
          variant: 'error',
        });
        blockStartLine = currentLineIndex + 1;
        break;
      }

      case 'success': {
        flushMessages();
        flushToolGroup();
        blocks.push({
          type: 'status',
          id: `block-${blockStartLine}`,
          line: line.text,
          variant: 'success',
        });
        blockStartLine = currentLineIndex + 1;
        break;
      }

      case 'warning': {
        flushMessages();
        flushToolGroup();
        blocks.push({
          type: 'status',
          id: `block-${blockStartLine}`,
          line: line.text,
          variant: 'warning',
        });
        blockStartLine = currentLineIndex + 1;
        break;
      }

      case 'message': {
        flushToolGroup();
        state.currentMessages.push(line.text);
        break;
      }
    }

    currentLineIndex++;
  }

  flushMessages();
  flushToolGroup();
  if (state.activeSubagent) {
    flushSubagent(false);
  }

  return blocks;
}

function estimateWrappedLines(text: string, width: number): number {
  if (width <= 0) return 1;

  const lines = text.split('\n');
  let totalLines = 0;

  for (const line of lines) {
    const cleanLine = line.replace(/\u001b\[[0-9;]+m/g, '');
    if (cleanLine.length === 0) {
      totalLines += 1;
    } else {
      totalLines += Math.ceil(cleanLine.length / width);
    }
  }

  return Math.max(1, totalLines);
}

export function getBlockLineCount(block: OutputBlockData, collapsed: boolean, width: number = 80): number {
  switch (block.type) {
    case 'messages': {
      const text = block.lines.join('\n');
      return estimateWrappedLines(text, width);
    }
    case 'subagent':
      if (collapsed) return 1;
      return 1 + block.output.reduce((acc, line) => {
        return acc + estimateWrappedLines(line.text, width - 4);
      }, 0);
    case 'tool-group':
      if (collapsed) return 1;
      return 1 + block.lines.reduce((acc, line) => {
        return acc + estimateWrappedLines(line, width - 4);
      }, 0);
    case 'status':
    case 'user-input':
      return 1;
  }
}

export function isCollapsibleBlock(block: OutputBlockData): boolean {
  return block.type === 'subagent' || block.type === 'tool-group';
}

export interface SourceLineMapping {
  skipSourceLines: number;
  maxSourceLines?: number;
}

function mapWrappedLinesToSourceLines(
  sourceLines: string[],
  width: number,
  skipWrappedLines: number,
  maxWrappedLines?: number
): SourceLineMapping {
  if (skipWrappedLines === 0 && maxWrappedLines === undefined) {
    return { skipSourceLines: 0, maxSourceLines: undefined };
  }

  if (sourceLines.length === 0) {
    return { skipSourceLines: 0, maxSourceLines: 0 };
  }

  let cumulativeWrappedLines = 0;
  let startSourceLine = 0;
  let endSourceLine = sourceLines.length;
  let foundStart = false;
  let wrappedLinesFromStart = 0;

  for (let i = 0; i < sourceLines.length; i++) {
    const linesForThisSource = estimateWrappedLines(sourceLines[i], width);
    const nextCumulative = cumulativeWrappedLines + linesForThisSource;

    if (!foundStart && nextCumulative > skipWrappedLines) {
      startSourceLine = i;
      foundStart = true;
      wrappedLinesFromStart = 0;
    }

    if (foundStart) {
      wrappedLinesFromStart += linesForThisSource;

      if (maxWrappedLines !== undefined && wrappedLinesFromStart >= maxWrappedLines) {
        endSourceLine = i + 1;
        break;
      }
    }

    cumulativeWrappedLines = nextCumulative;
  }

  if (!foundStart) {
    return { skipSourceLines: sourceLines.length, maxSourceLines: 0 };
  }

  const maxSourceLines = maxWrappedLines !== undefined
    ? Math.max(1, endSourceLine - startSourceLine)
    : undefined;

  return {
    skipSourceLines: startSourceLine,
    maxSourceLines,
  };
}

export function convertBlockViewport(
  block: OutputBlockData,
  collapsed: boolean,
  width: number,
  skipWrappedLines: number,
  maxWrappedLines?: number
): { showHeader: boolean; skipLines: number; maxLines?: number } {
  if (collapsed) {
    return {
      showHeader: skipWrappedLines === 0,
      skipLines: 0,
      maxLines: skipWrappedLines === 0 ? 1 : 0,
    };
  }

  switch (block.type) {
    case 'messages': {
      const text = block.lines.join('\n');
      const sourceLines = text.split('\n');
      const mapping = mapWrappedLinesToSourceLines(sourceLines, width, skipWrappedLines, maxWrappedLines);
      return {
        showHeader: true,
        skipLines: mapping.skipSourceLines,
        maxLines: mapping.maxSourceLines,
      };
    }

    case 'tool-group': {
      const showHeader = skipWrappedLines === 0;
      const contentSkip = showHeader ? 0 : skipWrappedLines - 1;
      const contentMax = maxWrappedLines !== undefined
        ? maxWrappedLines - (showHeader ? 1 : 0)
        : undefined;

      const mapping = mapWrappedLinesToSourceLines(
        block.lines,
        width - 4,
        contentSkip,
        contentMax
      );

      return {
        showHeader,
        skipLines: mapping.skipSourceLines,
        maxLines: mapping.maxSourceLines,
      };
    }

    case 'subagent': {
      const showHeader = skipWrappedLines === 0;
      const contentSkip = showHeader ? 0 : skipWrappedLines - 1;
      const contentMax = maxWrappedLines !== undefined
        ? maxWrappedLines - (showHeader ? 1 : 0)
        : undefined;

      const outputTexts = block.output.map(line => line.text);
      const mapping = mapWrappedLinesToSourceLines(
        outputTexts,
        width - 4,
        contentSkip,
        contentMax
      );

      return {
        showHeader,
        skipLines: mapping.skipSourceLines,
        maxLines: mapping.maxSourceLines,
      };
    }

    case 'status':
    case 'user-input':
      return {
        showHeader: true,
        skipLines: 0,
        maxLines: skipWrappedLines === 0 ? 1 : 0,
      };
  }
}
