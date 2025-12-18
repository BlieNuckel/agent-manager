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
  it('should return null when status is healthy', () => {
    const agent = createMockAgent();
    const { lastFrame } = render(<ContextHealthIndicator agent={agent} />);

    expect(lastFrame()).toBe('');
  });

  it('should render with actual tokens when in warning state', () => {
    const tokenUsage: TokenTracking = {
      cumulativeInputTokens: 50000,
      cumulativeOutputTokens: 20000,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      contextWindow: 200000,
      lastUpdated: new Date()
    };

    const agent = createMockAgent({ tokenUsage });
    const { lastFrame } = render(<ContextHealthIndicator agent={agent} />);

    const output = lastFrame();
    expect(output).toContain('Context:');
    expect(output).toContain('35%');
    expect(output).toContain('tokens');
    expect(output).not.toContain('~');
  });

  it('should render compact mode when in warning state', () => {
    const tokenUsage: TokenTracking = {
      cumulativeInputTokens: 50000,
      cumulativeOutputTokens: 20000,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      contextWindow: 200000,
      lastUpdated: new Date()
    };

    const agent = createMockAgent({ tokenUsage });
    const { lastFrame } = render(<ContextHealthIndicator agent={agent} compact />);

    const output = lastFrame();
    expect(output).toContain('35%');
    expect(output).not.toContain('Context:');
    expect(output).not.toContain('tokens');
  });

  it('should return null in compact mode when healthy', () => {
    const tokenUsage: TokenTracking = {
      cumulativeInputTokens: 10000,
      cumulativeOutputTokens: 5000,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      contextWindow: 200000,
      lastUpdated: new Date()
    };

    const agent = createMockAgent({ tokenUsage });
    const { lastFrame } = render(<ContextHealthIndicator agent={agent} compact />);

    expect(lastFrame()).toBe('');
  });


  it('should return null for low usage (healthy)', () => {
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
    expect(output).toBe('');
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

  it('should display tilde for estimates when in warning/critical', () => {
    // Create a very large prompt that would result in warning/critical status
    // 500k characters should be roughly 125k tokens (assuming 4 chars per token)
    const agent = createMockAgent({
      prompt: 'a'.repeat(500000),
      output: ['b'.repeat(100000)] // Add output to increase total tokens
    });
    const { lastFrame } = render(<ContextHealthIndicator agent={agent} />);

    const output = lastFrame();
    expect(output).toContain('~');
    expect(output).toContain('%');
    expect(output).toMatch(/~\d+k\/200k/);
  });

  it('should not display tilde for actual counts', () => {
    const tokenUsage: TokenTracking = {
      cumulativeInputTokens: 50000,
      cumulativeOutputTokens: 20000,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      contextWindow: 200000,
      lastUpdated: new Date()
    };

    const agent = createMockAgent({ tokenUsage });
    const { lastFrame } = render(<ContextHealthIndicator agent={agent} />);

    const output = lastFrame();
    expect(output).toMatch(/70k\/200k/);
    expect(output).not.toMatch(/~70k\/200k/);
  });
});
