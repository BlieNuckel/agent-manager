import { describe, it, expect } from 'vitest';
import { formatPermissionRule, getPermissionExplanation, getAlwaysAllowExplanation } from './permissions';
import type { PermissionSuggestion } from '../types';

describe('formatPermissionRule', () => {
  it('returns empty string when suggestion has no rules', () => {
    const suggestion: PermissionSuggestion = {
      type: 'addRules',
      rules: [],
      behavior: 'allow',
      destination: 'localSettings'
    };
    expect(formatPermissionRule(suggestion)).toBe('');
  });

  it('returns tool name for single rule without toolInput', () => {
    const suggestion: PermissionSuggestion = {
      type: 'addRules',
      rules: [{ toolName: 'Write' }],
      behavior: 'allow',
      destination: 'localSettings'
    };
    expect(formatPermissionRule(suggestion)).toBe('Write');
  });

  it('displays SDK-provided command pattern directly', () => {
    const suggestion: PermissionSuggestion = {
      type: 'addRules',
      rules: [{ toolName: 'Bash', toolInput: { command: 'npm:*' } }],
      behavior: 'allow',
      destination: 'localSettings'
    };
    expect(formatPermissionRule(suggestion)).toBe('Bash("npm:*")');
  });

  it('displays SDK-provided npx command pattern directly', () => {
    const suggestion: PermissionSuggestion = {
      type: 'addRules',
      rules: [{ toolName: 'Bash', toolInput: { command: 'npx vitest:*' } }],
      behavior: 'allow',
      destination: 'localSettings'
    };
    expect(formatPermissionRule(suggestion)).toBe('Bash("npx vitest:*")');
  });

  it('displays SDK-provided npm run pattern directly', () => {
    const suggestion: PermissionSuggestion = {
      type: 'addRules',
      rules: [{ toolName: 'Bash', toolInput: { command: 'npm run test:*' } }],
      behavior: 'allow',
      destination: 'localSettings'
    };
    expect(formatPermissionRule(suggestion)).toBe('Bash("npm run test:*")');
  });

  it('displays SDK-provided npm test pattern directly', () => {
    const suggestion: PermissionSuggestion = {
      type: 'addRules',
      rules: [{ toolName: 'Bash', toolInput: { command: 'npm test:*' } }],
      behavior: 'allow',
      destination: 'localSettings'
    };
    expect(formatPermissionRule(suggestion)).toBe('Bash("npm test:*")');
  });

  it('displays SDK-provided yarn dlx pattern directly', () => {
    const suggestion: PermissionSuggestion = {
      type: 'addRules',
      rules: [{ toolName: 'Bash', toolInput: { command: 'yarn dlx:*' } }],
      behavior: 'allow',
      destination: 'localSettings'
    };
    expect(formatPermissionRule(suggestion)).toBe('Bash("yarn dlx:*")');
  });

  it('displays SDK-provided pnpm run pattern directly', () => {
    const suggestion: PermissionSuggestion = {
      type: 'addRules',
      rules: [{ toolName: 'Bash', toolInput: { command: 'pnpm run build:*' } }],
      behavior: 'allow',
      destination: 'localSettings'
    };
    expect(formatPermissionRule(suggestion)).toBe('Bash("pnpm run build:*")');
  });

  it('displays SDK-provided file_path directly', () => {
    const suggestion: PermissionSuggestion = {
      type: 'addRules',
      rules: [{ toolName: 'Write', toolInput: { file_path: '/test/file.ts:*' } }],
      behavior: 'allow',
      destination: 'localSettings'
    };
    expect(formatPermissionRule(suggestion)).toBe('Write("/test/file.ts:*")');
  });

  it('uses fallback toolInput when rule has no toolInput', () => {
    const suggestion: PermissionSuggestion = {
      type: 'addRules',
      rules: [{ toolName: 'Edit' }],
      behavior: 'allow',
      destination: 'localSettings'
    };
    const fallback = { file_path: '/fallback/path.ts' };
    expect(formatPermissionRule(suggestion, fallback)).toBe('Edit("/fallback/path.ts:*")');
  });

  it('returns comma-separated tool names for multiple rules', () => {
    const suggestion: PermissionSuggestion = {
      type: 'addRules',
      rules: [
        { toolName: 'Write' },
        { toolName: 'Edit' },
        { toolName: 'Bash' }
      ],
      behavior: 'allow',
      destination: 'localSettings'
    };
    expect(formatPermissionRule(suggestion)).toBe('Write, Edit, Bash');
  });

  it('returns tool name for unknown input structure without command or file_path', () => {
    const suggestion: PermissionSuggestion = {
      type: 'addRules',
      rules: [{ toolName: 'Custom', toolInput: { unknown: 'data' } }],
      behavior: 'allow',
      destination: 'localSettings'
    };
    expect(formatPermissionRule(suggestion)).toBe('Custom');
  });

  it('handles undefined suggestion rules', () => {
    const suggestion = {
      type: 'addRules',
      behavior: 'allow',
      destination: 'localSettings'
    } as PermissionSuggestion;
    expect(formatPermissionRule(suggestion)).toBe('');
  });
});

describe('getPermissionExplanation', () => {
  it('returns null for undefined suggestions', () => {
    expect(getPermissionExplanation(undefined, 'Write')).toBeNull();
  });

  it('returns null for empty suggestions array', () => {
    expect(getPermissionExplanation([], 'Write')).toBeNull();
  });

  it('returns local settings path for localSettings destination', () => {
    const suggestions: PermissionSuggestion[] = [{
      type: 'addRules',
      rules: [{ toolName: 'Write' }],
      behavior: 'allow',
      destination: 'localSettings'
    }];
    const result = getPermissionExplanation(suggestions, 'Write');
    expect(result?.saveLocation).toBe('.claude/settings.local.json');
  });

  it('returns global settings path for globalSettings destination', () => {
    const suggestions: PermissionSuggestion[] = [{
      type: 'addRules',
      rules: [{ toolName: 'Write' }],
      behavior: 'allow',
      destination: 'globalSettings'
    }];
    const result = getPermissionExplanation(suggestions, 'Write');
    expect(result?.saveLocation).toBe('~/.claude/settings.json');
  });

  it('includes SDK-provided rule in whatWillBeSaved', () => {
    const suggestions: PermissionSuggestion[] = [{
      type: 'addRules',
      rules: [{ toolName: 'Bash', toolInput: { command: 'npm test:*' } }],
      behavior: 'allow',
      destination: 'localSettings'
    }];
    const result = getPermissionExplanation(suggestions, 'Bash');
    expect(result?.whatWillBeSaved).toBe('Bash("npm test:*")');
  });

  it('uses toolInput param for rule formatting', () => {
    const suggestions: PermissionSuggestion[] = [{
      type: 'addRules',
      rules: [{ toolName: 'Write' }],
      behavior: 'allow',
      destination: 'localSettings'
    }];
    const result = getPermissionExplanation(suggestions, 'Write', { file_path: '/test.ts' });
    expect(result?.whatWillBeSaved).toBe('Write("/test.ts:*")');
  });

  it('describes allow behavior for futureBeha', () => {
    const suggestions: PermissionSuggestion[] = [{
      type: 'addRules',
      rules: [{ toolName: 'Write' }],
      behavior: 'allow',
      destination: 'localSettings'
    }];
    const result = getPermissionExplanation(suggestions, 'Write');
    expect(result?.futureBeha).toBe('Future Write commands matching this pattern will be automatically allowed');
  });

  it('describes deny behavior for futureBeha', () => {
    const suggestions: PermissionSuggestion[] = [{
      type: 'addRules',
      rules: [{ toolName: 'Bash' }],
      behavior: 'deny',
      destination: 'localSettings'
    }];
    const result = getPermissionExplanation(suggestions, 'Bash');
    expect(result?.futureBeha).toBe('Future Bash commands matching this pattern will be automatically denied');
  });

  it('only uses first suggestion when multiple are provided', () => {
    const suggestions: PermissionSuggestion[] = [
      {
        type: 'addRules',
        rules: [{ toolName: 'First' }],
        behavior: 'allow',
        destination: 'localSettings'
      },
      {
        type: 'addRules',
        rules: [{ toolName: 'Second' }],
        behavior: 'deny',
        destination: 'globalSettings'
      }
    ];
    const result = getPermissionExplanation(suggestions, 'First');
    expect(result?.saveLocation).toBe('.claude/settings.local.json');
    expect(result?.futureBeha).toContain('automatically allowed');
  });
});

describe('getAlwaysAllowExplanation', () => {
  it('includes the tool name in the explanation', () => {
    const result = getAlwaysAllowExplanation('Write');
    expect(result).toContain('Write');
  });

  it('mentions auto-accept for edit operations', () => {
    const result = getAlwaysAllowExplanation('Edit');
    expect(result).toContain('Auto-accept');
    expect(result).toContain('Write/Edit tools');
    expect(result).toContain('Edit');
  });

  it('mentions session duration', () => {
    const result = getAlwaysAllowExplanation('Bash');
    expect(result).toContain('session');
  });

  it('returns expected format', () => {
    const result = getAlwaysAllowExplanation('NotebookEdit');
    expect(result).toBe('Auto-accept all Write/Edit tools for the rest of this session (NotebookEdit and similar edit operations)');
  });
});
