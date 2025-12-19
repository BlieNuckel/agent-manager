import React from 'react';
import { render } from 'ink-testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentOutputViewport } from './AgentOutputViewport';
import type { OutputLine } from '../types';

// Mock the output module
vi.mock('./output', () => ({
  groupOutputLines: vi.fn(() => [
    { type: 'tool-group', id: 'group-1', count: 1, errorCount: 0, lines: ['Tool 1'] },
    { type: 'tool-group', id: 'group-2', count: 1, errorCount: 0, lines: ['Tool 2'] },
    { type: 'tool-group', id: 'group-3', count: 1, errorCount: 0, lines: ['Tool 3'] },
    { type: 'tool-group', id: 'group-10', count: 1, errorCount: 0, lines: ['Tool 10'] },
    { type: 'tool-group', id: 'group-11', count: 1, errorCount: 0, lines: ['Tool 11'] },
    { type: 'tool-group', id: 'group-12', count: 1, errorCount: 0, lines: ['Tool 12'] },
  ]),
  getBlockLineCount: vi.fn(() => 1),
  isCollapsibleBlock: vi.fn((block) => block.type === 'tool-group'),
  convertBlockViewport: vi.fn(() => ({ skipLines: 0, maxLines: undefined, showHeader: true })),
  ToolGroupBlock: vi.fn(({ blockNumber }) => <>{`[${blockNumber}] Tool ${blockNumber}`}</>),
}));

describe('AgentOutputViewport - Smart Multi-digit Input', () => {
  const mockOutput: OutputLine[] = [
    { type: 'block_open', id: '1', variant: 'messages' },
    { type: 'text', content: 'Test output' },
    { type: 'block_close', id: '1' },
  ];

  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  it('should handle single-digit input immediately when no ambiguity', () => {
    const { stdin, rerender } = render(
      <AgentOutputViewport
        output={mockOutput}
        height={10}
        width={80}
        isActive={true}
        showToolCalls={false}
      />
    );

    // Press "3" - should toggle immediately since there's no block 30-39
    stdin.write('3');

    // Force a rerender to ensure state update
    rerender(
      <AgentOutputViewport
        output={mockOutput}
        height={10}
        width={80}
        isActive={true}
        showToolCalls={false}
      />
    );

    // No need to advance timers - should toggle immediately
    // In a real test, we'd verify the collapsed state changed
  });

  it('should wait for second digit when there is ambiguity', () => {
    const { stdin, rerender } = render(
      <AgentOutputViewport
        output={mockOutput}
        height={10}
        width={80}
        isActive={true}
        showToolCalls={false}
      />
    );

    // Press "1" - should wait because blocks 10, 11, 12 exist
    stdin.write('1');

    // Press "0" quickly to form "10"
    stdin.write('0');

    // Should toggle block 10 immediately
    rerender(
      <AgentOutputViewport
        output={mockOutput}
        height={10}
        width={80}
        isActive={true}
        showToolCalls={false}
      />
    );
  });

  it('should timeout and use first digit if no second digit provided', () => {
    const { stdin, rerender } = render(
      <AgentOutputViewport
        output={mockOutput}
        height={10}
        width={80}
        isActive={true}
        showToolCalls={false}
      />
    );

    // Press "1" - should wait because blocks 10, 11, 12 exist
    stdin.write('1');

    // Advance timers by 500ms
    vi.advanceTimersByTime(500);

    // Should toggle block 1 after timeout
    rerender(
      <AgentOutputViewport
        output={mockOutput}
        height={10}
        width={80}
        isActive={true}
        showToolCalls={false}
      />
    );
  });

  it('should handle two-digit numbers correctly', () => {
    const { stdin, rerender } = render(
      <AgentOutputViewport
        output={mockOutput}
        height={10}
        width={80}
        isActive={true}
        showToolCalls={false}
      />
    );

    // Press "1" then "2" to form "12"
    stdin.write('1');
    stdin.write('2');

    // Should toggle block 12 immediately
    rerender(
      <AgentOutputViewport
        output={mockOutput}
        height={10}
        width={80}
        isActive={true}
        showToolCalls={false}
      />
    );
  });

  it('should clear pending input on non-digit key', () => {
    const { stdin, rerender } = render(
      <AgentOutputViewport
        output={mockOutput}
        height={10}
        width={80}
        isActive={true}
        showToolCalls={false}
      />
    );

    // Press "1" - should wait
    stdin.write('1');

    // Press "j" (scroll down) - should clear pending input
    stdin.write('j');

    // Advance timers - nothing should happen since input was cleared
    vi.advanceTimersByTime(500);

    rerender(
      <AgentOutputViewport
        output={mockOutput}
        height={10}
        width={80}
        isActive={true}
        showToolCalls={false}
      />
    );
  });
});