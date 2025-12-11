import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { ContextHealthIndicator } from './ContextHealthIndicator';
import type { Agent, TokenTracking } from '../types';

const createMockAgent = (overrides?: Partial<Agent>): Agent => ({
  id: 'test-id',
  title: 'Test Agent',
  status: 'idle',
  prompt: 'Test prompt with some content',
  output: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  workDir: '/test',
  agentType: 'normal',
  permissionMode: 'default',
  permissionQueue: [],
  ...overrides
});

describe('ContextHealthIndicator', () => {
  it('should render with estimated tokens', () => {
    const agent = createMockAgent();
    const { lastFrame } = render(<ContextHealthIndicator agent={agent} />);

    expect(lastFrame()).toContain('Context:');
    expect(lastFrame()).toContain('~');
    expect(lastFrame()).toContain('%');
    expect(lastFrame()).toContain('tokens');
  });

  it('should render with actual tokens when available', () => {
    const tokenUsage: TokenTracking = {
      cumulativeInputTokens: 10000,
      cumulativeOutputTokens: 5000,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      contextWindow: 200000,
      lastUpdated: new Date()
    };

    const agent = createMockAgent({ tokenUsage });
    const { lastFrame } = render(<ContextHealthIndicator agent={agent} />);

    const output = lastFrame();
    expect(output).toContain('Context:');
    expect(output).toContain('%');
    expect(output).toContain('tokens');
    expect(output).not.toContain('~');
  });

  it('should render compact mode', () => {
    const agent = createMockAgent();
    const { lastFrame } = render(<ContextHealthIndicator agent={agent} compact />);

    const output = lastFrame();
    expect(output).toContain('%');
    expect(output).not.toContain('Context:');
    expect(output).not.toContain('tokens');
  });

  it('should show correct bar length in compact mode', () => {
    const agent = createMockAgent();
    const { lastFrame } = render(<ContextHealthIndicator agent={agent} compact />);

    const output = lastFrame();
    const barChars = (output.match(/[█░]/g) || []).length;
    expect(barChars).toBe(5);
  });

  it('should show correct bar length in full mode', () => {
    const agent = createMockAgent();
    const { lastFrame } = render(<ContextHealthIndicator agent={agent} />);

    const output = lastFrame();
    const barChars = (output.match(/[█░]/g) || []).length;
    expect(barChars).toBe(10);
  });

  it('should display percentage for low usage', () => {
    const tokenUsage: TokenTracking = {
      cumulativeInputTokens: 10000,
      cumulativeOutputTokens: 5000,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      contextWindow: 200000,
      lastUpdated: new Date()
    };

    const agent = createMockAgent({ tokenUsage });
    const { lastFrame } = render(<ContextHealthIndicator agent={agent} />);

    const output = lastFrame();
    expect(output).toContain('8%');
  });

  it('should display percentage for medium usage', () => {
    const tokenUsage: TokenTracking = {
      cumulativeInputTokens: 80000,
      cumulativeOutputTokens: 40000,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      contextWindow: 200000,
      lastUpdated: new Date()
    };

    const agent = createMockAgent({ tokenUsage });
    const { lastFrame } = render(<ContextHealthIndicator agent={agent} />);

    const output = lastFrame();
    expect(output).toContain('60%');
  });

  it('should display percentage for high usage', () => {
    const tokenUsage: TokenTracking = {
      cumulativeInputTokens: 140000,
      cumulativeOutputTokens: 60000,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      contextWindow: 200000,
      lastUpdated: new Date()
    };

    const agent = createMockAgent({ tokenUsage });
    const { lastFrame } = render(<ContextHealthIndicator agent={agent} />);

    const output = lastFrame();
    expect(output).toContain('100%');
  });

  it('should format token counts with k suffix', () => {
    const tokenUsage: TokenTracking = {
      cumulativeInputTokens: 100000,
      cumulativeOutputTokens: 50000,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      contextWindow: 200000,
      lastUpdated: new Date()
    };

    const agent = createMockAgent({ tokenUsage });
    const { lastFrame } = render(<ContextHealthIndicator agent={agent} />);

    const output = lastFrame();
    expect(output).toContain('150k');
    expect(output).toContain('200k');
  });

  it('should display tilde for estimates', () => {
    const agent = createMockAgent({ prompt: 'a'.repeat(10000) });
    const { lastFrame } = render(<ContextHealthIndicator agent={agent} />);

    const output = lastFrame();
    expect(output).toMatch(/~\d+k\/200k/);
  });

  it('should not display tilde for actual counts', () => {
    const tokenUsage: TokenTracking = {
      cumulativeInputTokens: 10000,
      cumulativeOutputTokens: 5000,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      contextWindow: 200000,
      lastUpdated: new Date()
    };

    const agent = createMockAgent({ tokenUsage });
    const { lastFrame } = render(<ContextHealthIndicator agent={agent} />);

    const output = lastFrame();
    expect(output).toMatch(/15k\/200k/);
    expect(output).not.toMatch(/~15k\/200k/);
  });
});
