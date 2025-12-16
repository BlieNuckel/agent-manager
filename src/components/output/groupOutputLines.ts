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

  let blockIdCounter = 0;
  const nextId = () => `block-${blockIdCounter++}`;

  const flushMessages = () => {
    if (state.currentMessages.length > 0) {
      blocks.push({
        type: 'messages',
        id: nextId(),
        lines: [...state.currentMessages],
      });
      state.currentMessages = [];
    }
  };

  const flushToolGroup = () => {
    if (state.currentToolGroup.length > 0) {
      blocks.push({
        type: 'tool-group',
        id: nextId(),
        count: state.currentToolGroup.length,
        errorCount: state.toolGroupErrorCount,
        lines: [...state.currentToolGroup],
      });
      state.currentToolGroup = [];
      state.toolGroupErrorCount = 0;
    }
  };

  const flushSubagent = (completed: boolean) => {
    if (state.activeSubagent) {
      const stats = subagentStats?.[state.activeSubagent.toolUseId];
      blocks.push({
        type: 'subagent',
        id: nextId(),
        toolUseId: state.activeSubagent.toolUseId,
        subagentType: state.activeSubagent.subagentType,
        status: completed ? 'completed' : 'running',
        output: [...state.activeSubagent.output],
        stats,
      });
      state.activeSubagent = null;
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
          id: nextId(),
          text: line.text.replace(/^\[>\] User:\s*/, ''),
        });
        break;
      }

      case 'error': {
        flushMessages();
        flushToolGroup();
        blocks.push({
          type: 'status',
          id: nextId(),
          line: line.text,
          variant: 'error',
        });
        break;
      }

      case 'success': {
        flushMessages();
        flushToolGroup();
        blocks.push({
          type: 'status',
          id: nextId(),
          line: line.text,
          variant: 'success',
        });
        break;
      }

      case 'warning': {
        flushMessages();
        flushToolGroup();
        blocks.push({
          type: 'status',
          id: nextId(),
          line: line.text,
          variant: 'warning',
        });
        break;
      }

      case 'message': {
        flushToolGroup();
        state.currentMessages.push(line.text);
        break;
      }
    }
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
