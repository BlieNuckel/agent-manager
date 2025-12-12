import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { AgentItem } from './AgentItem';
import type { Agent, Status } from '../types';

vi.mock('ink-spinner', () => ({
  default: () => <>[*]</>
}));

vi.mock('../utils/helpers', () => ({
  formatTime: () => '12:00',
  formatTimeAgo: () => '5m ago'
}));

const createMockAgent = (overrides: Partial<Agent> = {}): Agent => ({
  id: 'test-123',
  title: 'Test Agent',
  status: 'working',
  prompt: 'This is a test prompt for the agent to work on',
  output: [],
  createdAt: new Date('2025-01-15T12:00:00'),
  updatedAt: new Date('2025-01-15T12:00:00'),
  workDir: '/test/dir',
  agentType: 'normal',
  permissionMode: 'default',
  permissionQueue: [],
  ...overrides
});

describe('AgentItem', () => {
  describe('status variations', () => {
    const statuses: Status[] = ['working', 'waiting', 'idle', 'done', 'error'];

    it.each(statuses)('renders agent with %s status', (status) => {
      const agent = createMockAgent({ status });
      const { lastFrame } = render(<AgentItem agent={agent} selected={false} />);
      expect(lastFrame()).toMatchSnapshot();
    });
  });

  describe('selection state', () => {
    it('renders selected agent correctly', () => {
      const agent = createMockAgent();
      const { lastFrame } = render(<AgentItem agent={agent} selected={true} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('>');
    });

    it('renders unselected agent correctly', () => {
      const agent = createMockAgent();
      const { lastFrame } = render(<AgentItem agent={agent} selected={false} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).not.toMatch(/^>/);
    });
  });

  describe('title variations', () => {
    it('renders pending title with italic style', () => {
      const agent = createMockAgent({ title: 'Pending...' });
      const { lastFrame } = render(<AgentItem agent={agent} selected={false} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('Pending...');
    });

    it('renders normal title', () => {
      const agent = createMockAgent({ title: 'Implement User Authentication' });
      const { lastFrame } = render(<AgentItem agent={agent} selected={false} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('Implement User Authentication');
    });
  });

  describe('prompt truncation', () => {
    it('truncates long prompts to 60 characters', () => {
      const longPrompt = 'a'.repeat(100);
      const agent = createMockAgent({ prompt: longPrompt });
      const { lastFrame } = render(<AgentItem agent={agent} selected={false} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('...');
    });

    it('shows short prompts without truncation', () => {
      const shortPrompt = 'Short prompt';
      const agent = createMockAgent({ prompt: shortPrompt });
      const { lastFrame } = render(<AgentItem agent={agent} selected={false} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('Short prompt');
      expect(lastFrame()).not.toContain('...');
    });
  });

  describe('permission indicator', () => {
    it('renders permission needed indicator', () => {
      const agent = createMockAgent({
        pendingPermission: {
          toolName: 'Write',
          toolInput: { file_path: '/test.ts' },
          resolve: () => {}
        }
      });
      const { lastFrame } = render(<AgentItem agent={agent} selected={false} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('[!]');
      expect(lastFrame()).toContain('Permission needed');
    });

    it('does not show permission indicator when no permission pending', () => {
      const agent = createMockAgent();
      const { lastFrame } = render(<AgentItem agent={agent} selected={false} />);
      expect(lastFrame()).not.toContain('Permission needed');
    });
  });

  describe('question indicator', () => {
    it('renders question pending indicator with headers', () => {
      const agent = createMockAgent({
        pendingQuestion: {
          questions: [
            {
              question: 'Which auth method should we use?',
              header: 'Auth method',
              options: [
                { label: 'OAuth', description: 'Use OAuth 2.0' },
                { label: 'JWT', description: 'Use JWT tokens' }
              ],
              multiSelect: false
            }
          ],
          resolve: () => {}
        }
      });
      const { lastFrame } = render(<AgentItem agent={agent} selected={false} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('[?]');
      expect(lastFrame()).toContain('Auth method');
    });

    it('renders multiple question headers', () => {
      const agent = createMockAgent({
        pendingQuestion: {
          questions: [
            {
              question: 'Which auth method?',
              header: 'Auth method',
              options: [
                { label: 'OAuth', description: 'Use OAuth' },
                { label: 'JWT', description: 'Use JWT' }
              ],
              multiSelect: false
            },
            {
              question: 'Which library?',
              header: 'Library',
              options: [
                { label: 'Express', description: 'Use Express' },
                { label: 'Fastify', description: 'Use Fastify' }
              ],
              multiSelect: false
            }
          ],
          resolve: () => {}
        }
      });
      const { lastFrame } = render(<AgentItem agent={agent} selected={false} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('[?]');
      expect(lastFrame()).toContain('Auth method, Library');
    });

    it('does not show question indicator when no question pending', () => {
      const agent = createMockAgent();
      const { lastFrame } = render(<AgentItem agent={agent} selected={false} />);
      expect(lastFrame()).not.toContain('Auth method');
    });
  });

  describe('merge state indicators', () => {
    it('renders merge ready indicator', () => {
      const agent = createMockAgent({
        pendingMerge: {
          branchName: 'feature-branch',
          status: 'ready'
        }
      });
      const { lastFrame } = render(<AgentItem agent={agent} selected={false} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('[✓]');
      expect(lastFrame()).toContain('Merge Ready');
    });

    it('renders merge conflicts indicator', () => {
      const agent = createMockAgent({
        pendingMerge: {
          branchName: 'feature-branch',
          status: 'conflicts'
        }
      });
      const { lastFrame } = render(<AgentItem agent={agent} selected={false} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('[!]');
      expect(lastFrame()).toContain('Merge Conflicts');
    });

    it('renders merge failed indicator', () => {
      const agent = createMockAgent({
        pendingMerge: {
          branchName: 'feature-branch',
          status: 'failed',
          error: 'Some error'
        }
      });
      const { lastFrame } = render(<AgentItem agent={agent} selected={false} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('[x]');
      expect(lastFrame()).toContain('Merge Failed');
    });
  });

  describe('worktree indicator', () => {
    it('renders worktree branch name', () => {
      const agent = createMockAgent({ worktreeName: 'feature-auth' });
      const { lastFrame } = render(<AgentItem agent={agent} selected={false} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('* feature-auth');
    });

    it('does not show worktree indicator when no worktree', () => {
      const agent = createMockAgent({ status: 'idle' });
      const { lastFrame } = render(<AgentItem agent={agent} selected={false} />);
      expect(lastFrame()).not.toMatch(/^\s+\* \w/m);
    });
  });

  describe('agent type indicator', () => {
    it('shows planning type', () => {
      const agent = createMockAgent({ agentType: 'planning' });
      const { lastFrame } = render(<AgentItem agent={agent} selected={false} />);
      expect(lastFrame()).toContain('[planning]');
    });

    it('shows auto-accept type', () => {
      const agent = createMockAgent({ agentType: 'auto-accept' });
      const { lastFrame } = render(<AgentItem agent={agent} selected={false} />);
      expect(lastFrame()).toContain('[auto-accept]');
    });

    it('does not show normal type', () => {
      const agent = createMockAgent({ agentType: 'normal' });
      const { lastFrame } = render(<AgentItem agent={agent} selected={false} />);
      expect(lastFrame()).not.toContain('[normal]');
    });

    it('shows custom agent type id when present', () => {
      const agent = createMockAgent({ customAgentTypeId: 'research-agent' });
      const { lastFrame } = render(<AgentItem agent={agent} selected={false} />);
      expect(lastFrame()).toContain('[research-agent]');
    });

    it('prefers custom agent type over built-in type', () => {
      const agent = createMockAgent({ agentType: 'planning', customAgentTypeId: 'custom-planner' });
      const { lastFrame } = render(<AgentItem agent={agent} selected={false} />);
      expect(lastFrame()).toContain('[custom-planner]');
      expect(lastFrame()).not.toContain('[planning]');
    });
  });
});
