import type { Agent, TokenTracking } from '../types';

const CHARS_PER_TOKEN = 4;
const ESTIMATED_SYSTEM_PROMPT_TOKENS = 1250;

export interface ContextHealth {
  estimatedTokens: number;
  actualTokens?: number;
  percentUsed: number;
  status: 'healthy' | 'warning' | 'critical';
  isEstimate: boolean;
  contextWindow: number;
}

export function estimateContextFromCharacters(agent: Agent): number {
  const outputChars = agent.output
    .map(line => line.text)
    .join('\n').length;

  const promptChars = agent.prompt.length;

  const totalChars = outputChars + promptChars;
  const estimatedTokens = Math.ceil(totalChars / CHARS_PER_TOKEN) + ESTIMATED_SYSTEM_PROMPT_TOKENS;

  return estimatedTokens;
}

export function getContextHealth(agent: Agent): ContextHealth {
  if (agent.tokenUsage && agent.tokenUsage.cumulativeInputTokens > 0) {
    const total = agent.tokenUsage.cumulativeInputTokens + agent.tokenUsage.cumulativeOutputTokens;
    const contextWindow = agent.tokenUsage.contextWindow || 200000;
    const percentUsed = (total / contextWindow) * 100;

    return {
      actualTokens: total,
      estimatedTokens: total,
      percentUsed,
      status: percentUsed > 40 ? 'critical' : percentUsed > 30 ? 'warning' : 'healthy',
      isEstimate: false,
      contextWindow
    };
  }

  const estimatedTokens = estimateContextFromCharacters(agent);
  const contextWindow = 200000;
  const percentUsed = (estimatedTokens / contextWindow) * 100;

  return {
    estimatedTokens,
    percentUsed,
    status: percentUsed > 40 ? 'critical' : percentUsed > 30 ? 'warning' : 'healthy',
    isEstimate: true,
    contextWindow
  };
}

export function formatTokenCount(count: number): string {
  if (count >= 1000) {
    return `${Math.round(count / 1000)}k`;
  }
  return count.toString();
}
