import { describe, it, expect } from 'vitest';
import { isToolAllowed, matchesPattern } from './agentTypes';
import type { AgentToolConfig } from '../types/agentTypes';

describe('matchesPattern', () => {
  it('matches exact strings', () => {
    expect(matchesPattern('Read', 'Read')).toBe(true);
    expect(matchesPattern('Write', 'Read')).toBe(false);
  });

  it('matches wildcard patterns', () => {
    expect(matchesPattern('git status', 'git *')).toBe(true);
    expect(matchesPattern('git commit', 'git *')).toBe(true);
    expect(matchesPattern('npm install', 'git *')).toBe(false);
  });

  it('handles empty prefix wildcards', () => {
    expect(matchesPattern('anything', '*')).toBe(true);
  });
});

describe('isToolAllowed', () => {
  it('allows all tools when no config is provided', () => {
    expect(isToolAllowed('Read', undefined)).toBe(true);
    expect(isToolAllowed('Write', undefined)).toBe(true);
    expect(isToolAllowed('Bash', undefined)).toBe(true);
  });

  it('allows tools in the allow list', () => {
    const config: AgentToolConfig = {
      allow: ['Read', 'Glob', 'Grep']
    };
    expect(isToolAllowed('Read', config)).toBe(true);
    expect(isToolAllowed('Glob', config)).toBe(true);
    expect(isToolAllowed('Write', config)).toBe(false);
  });

  it('denies tools in the deny list', () => {
    const config: AgentToolConfig = {
      deny: ['Write', 'Edit']
    };
    expect(isToolAllowed('Write', config)).toBe(false);
    expect(isToolAllowed('Edit', config)).toBe(false);
    expect(isToolAllowed('Read', config)).toBe(true);
  });

  it('deny takes precedence over allow', () => {
    const config: AgentToolConfig = {
      allow: ['Read', 'Write'],
      deny: ['Write']
    };
    expect(isToolAllowed('Read', config)).toBe(true);
    expect(isToolAllowed('Write', config)).toBe(false);
  });

  it('handles bash command allow patterns', () => {
    const config: AgentToolConfig = {
      allow: ['Bash'],
      bashAllow: ['git *', 'ls *']
    };
    expect(isToolAllowed('Bash', config, 'git status')).toBe(true);
    expect(isToolAllowed('Bash', config, 'ls -la')).toBe(true);
    expect(isToolAllowed('Bash', config, 'rm -rf /')).toBe(false);
  });

  it('handles bash command deny patterns', () => {
    const config: AgentToolConfig = {
      allow: ['Bash'],
      bashDeny: ['rm *', 'mv *']
    };
    expect(isToolAllowed('Bash', config, 'git status')).toBe(true);
    expect(isToolAllowed('Bash', config, 'rm file.txt')).toBe(false);
    expect(isToolAllowed('Bash', config, 'mv old new')).toBe(false);
  });

  it('bash deny takes precedence over bash allow', () => {
    const config: AgentToolConfig = {
      allow: ['Bash'],
      bashAllow: ['git *'],
      bashDeny: ['git push *']
    };
    expect(isToolAllowed('Bash', config, 'git status')).toBe(true);
    expect(isToolAllowed('Bash', config, 'git push origin')).toBe(false);
  });

  it('allows all bash commands if no bash config', () => {
    const config: AgentToolConfig = {
      allow: ['Bash']
    };
    expect(isToolAllowed('Bash', config, 'any command')).toBe(true);
  });

  it('ignores bash patterns for non-Bash tools', () => {
    const config: AgentToolConfig = {
      allow: ['Read'],
      bashAllow: ['git *']
    };
    expect(isToolAllowed('Read', config)).toBe(true);
  });
});
