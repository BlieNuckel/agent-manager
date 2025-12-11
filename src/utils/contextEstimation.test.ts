import { describe, it, expect } from 'vitest';
import { estimateContextFromCharacters, getContextHealth, formatTokenCount } from './contextEstimation';
import type { Agent, TokenTracking } from '../types';

const createMockAgent = (overrides?: Partial<Agent>): Agent => ({
  id: 'test-id',
  title: 'Test Agent',
  status: 'idle',
  prompt: 'Test prompt',
  output: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  workDir: '/test',
  agentType: 'normal',
  permissionMode: 'default',
  permissionQueue: [],
  ...overrides
});

describe('estimateContextFromCharacters', () => {
  it('should estimate tokens from empty agent', () => {
    const agent = createMockAgent();
    const estimate = estimateContextFromCharacters(agent);
    expect(estimate).toBeGreaterThan(1000);
  });

  it('should account for prompt length', () => {
    const shortPrompt = createMockAgent({ prompt: 'hi' });
    const longPrompt = createMockAgent({ prompt: 'a'.repeat(1000) });

    const shortEstimate = estimateContextFromCharacters(shortPrompt);
    const longEstimate = estimateContextFromCharacters(longPrompt);

    expect(longEstimate).toBeGreaterThan(shortEstimate);
  });

  it('should account for output length', () => {
    const noOutput = createMockAgent({ output: [] });
    const withOutput = createMockAgent({
      output: [
        { text: 'a'.repeat(1000), isSubagent: false },
        { text: 'b'.repeat(1000), isSubagent: false }
      ]
    });

    const noOutputEstimate = estimateContextFromCharacters(noOutput);
    const withOutputEstimate = estimateContextFromCharacters(withOutput);

    expect(withOutputEstimate).toBeGreaterThan(noOutputEstimate);
  });
});

describe('getContextHealth', () => {
  it('should return estimate when no tokenUsage', () => {
    const agent = createMockAgent();
    const health = getContextHealth(agent);

    expect(health.isEstimate).toBe(true);
    expect(health.actualTokens).toBeUndefined();
    expect(health.estimatedTokens).toBeGreaterThan(0);
    expect(health.status).toBe('healthy');
  });

  it('should return actual when tokenUsage present', () => {
    const tokenUsage: TokenTracking = {
      cumulativeInputTokens: 10000,
      cumulativeOutputTokens: 5000,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      contextWindow: 200000,
      lastUpdated: new Date()
    };

    const agent = createMockAgent({ tokenUsage });
    const health = getContextHealth(agent);

    expect(health.isEstimate).toBe(false);
    expect(health.actualTokens).toBe(15000);
    expect(health.estimatedTokens).toBe(15000);
    expect(health.status).toBe('healthy');
  });

  it('should calculate correct percentage', () => {
    const tokenUsage: TokenTracking = {
      cumulativeInputTokens: 100000,
      cumulativeOutputTokens: 50000,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      contextWindow: 200000,
      lastUpdated: new Date()
    };

    const agent = createMockAgent({ tokenUsage });
    const health = getContextHealth(agent);

    expect(health.percentUsed).toBeCloseTo(75, 0);
    expect(health.status).toBe('critical');
  });

  it('should return healthy status for low usage', () => {
    const tokenUsage: TokenTracking = {
      cumulativeInputTokens: 20000,
      cumulativeOutputTokens: 10000,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      contextWindow: 200000,
      lastUpdated: new Date()
    };

    const agent = createMockAgent({ tokenUsage });
    const health = getContextHealth(agent);

    expect(health.status).toBe('healthy');
    expect(health.percentUsed).toBeLessThan(50);
  });

  it('should return warning status for medium usage', () => {
    const tokenUsage: TokenTracking = {
      cumulativeInputTokens: 80000,
      cumulativeOutputTokens: 40000,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      contextWindow: 200000,
      lastUpdated: new Date()
    };

    const agent = createMockAgent({ tokenUsage });
    const health = getContextHealth(agent);

    expect(health.status).toBe('warning');
    expect(health.percentUsed).toBeGreaterThan(50);
    expect(health.percentUsed).toBeLessThanOrEqual(75);
  });

  it('should return critical status for high usage', () => {
    const tokenUsage: TokenTracking = {
      cumulativeInputTokens: 140000,
      cumulativeOutputTokens: 60000,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      contextWindow: 200000,
      lastUpdated: new Date()
    };

    const agent = createMockAgent({ tokenUsage });
    const health = getContextHealth(agent);

    expect(health.status).toBe('critical');
    expect(health.percentUsed).toBeGreaterThan(75);
  });

  it('should use correct context window', () => {
    const tokenUsage: TokenTracking = {
      cumulativeInputTokens: 10000,
      cumulativeOutputTokens: 5000,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      contextWindow: 100000,
      lastUpdated: new Date()
    };

    const agent = createMockAgent({ tokenUsage });
    const health = getContextHealth(agent);

    expect(health.contextWindow).toBe(100000);
    expect(health.percentUsed).toBe(15);
  });
});

describe('formatTokenCount', () => {
  it('should format small numbers as-is', () => {
    expect(formatTokenCount(0)).toBe('0');
    expect(formatTokenCount(123)).toBe('123');
    expect(formatTokenCount(999)).toBe('999');
  });

  it('should format thousands with k suffix', () => {
    expect(formatTokenCount(1000)).toBe('1k');
    expect(formatTokenCount(1500)).toBe('2k');
    expect(formatTokenCount(5000)).toBe('5k');
    expect(formatTokenCount(156789)).toBe('157k');
  });

  it('should round to nearest thousand', () => {
    expect(formatTokenCount(1234)).toBe('1k');
    expect(formatTokenCount(1567)).toBe('2k');
    expect(formatTokenCount(199999)).toBe('200k');
  });
});
