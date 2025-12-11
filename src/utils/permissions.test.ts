import { describe, it, expect } from 'vitest';
import { formatPermissionRule, getPermissionExplanation, getAlwaysAllowExplanation, getDestinationInfo } from './permissions';
import type { PermissionSuggestion, PermissionRuleValue } from '../types';

describe('formatPermissionRule', () => {
  it('returns tool name for rule without ruleContent', () => {
    const rule: PermissionRuleValue = { toolName: 'Write' };
    expect(formatPermissionRule(rule)).toBe('Write');
  });

  it('formats rule with ruleContent', () => {
    const rule: PermissionRuleValue = { toolName: 'Bash', ruleContent: 'npm test:*' };
    expect(formatPermissionRule(rule)).toBe('Bash("npm test:*")');
  });

  it('formats Write tool with file pattern', () => {
    const rule: PermissionRuleValue = { toolName: 'Write', ruleContent: 'src/**/*.ts' };
    expect(formatPermissionRule(rule)).toBe('Write("src/**/*.ts")');
  });

  it('formats Edit tool without ruleContent', () => {
    const rule: PermissionRuleValue = { toolName: 'Edit' };
    expect(formatPermissionRule(rule)).toBe('Edit');
  });
});

describe('getDestinationInfo', () => {
  it('returns correct info for projectSettings', () => {
    const info = getDestinationInfo('projectSettings');
    expect(info.label).toBe('Repo');
    expect(info.filePath).toBe('.claude/settings.json');
    expect(info.shortcut).toBe('R');
    expect(info.description).toContain('repository');
  });

  it('returns correct info for localSettings', () => {
    const info = getDestinationInfo('localSettings');
    expect(info.label).toBe('Local');
    expect(info.filePath).toBe('.claude/settings.local.json');
    expect(info.shortcut).toBe('L');
  });

  it('returns correct info for userSettings', () => {
    const info = getDestinationInfo('userSettings');
    expect(info.label).toBe('User');
    expect(info.filePath).toBe('~/.claude/settings.json');
    expect(info.shortcut).toBe('U');
  });

  it('returns null filePath for session', () => {
    const info = getDestinationInfo('session');
    expect(info.label).toBe('Session');
    expect(info.filePath).toBeNull();
    expect(info.shortcut).toBe('S');
  });

  it('returns null filePath for cliArg', () => {
    const info = getDestinationInfo('cliArg');
    expect(info.label).toBe('CLI');
    expect(info.filePath).toBeNull();
    expect(info.shortcut).toBe('C');
  });
});

describe('getPermissionExplanation', () => {
  it('groups suggestions by destination', () => {
    const suggestions: PermissionSuggestion[] = [
      {
        type: 'addRules',
        rules: [{ toolName: 'Write' }],
        behavior: 'allow',
        destination: 'projectSettings'
      },
      {
        type: 'addDirectories',
        directories: ['/path'],
        destination: 'projectSettings'
      },
      {
        type: 'setMode',
        mode: 'acceptEdits',
        destination: 'session'
      }
    ];

    const result = getPermissionExplanation(suggestions);
    expect(Object.keys(result.groups)).toEqual(['projectSettings', 'session']);
    expect(result.groups.projectSettings).toHaveLength(2);
    expect(result.groups.session).toHaveLength(1);
  });

  it('generates correct summary for single suggestion', () => {
    const suggestions: PermissionSuggestion[] = [
      {
        type: 'addRules',
        rules: [{ toolName: 'Bash', ruleContent: 'npm test:*' }],
        behavior: 'allow',
        destination: 'localSettings'
      }
    ];

    const result = getPermissionExplanation(suggestions);
    expect(result.summary).toBe('1 permission update across 1 location');
  });

  it('generates correct summary for multiple suggestions in one location', () => {
    const suggestions: PermissionSuggestion[] = [
      {
        type: 'addRules',
        rules: [{ toolName: 'Write' }],
        behavior: 'allow',
        destination: 'projectSettings'
      },
      {
        type: 'addDirectories',
        directories: ['/path'],
        destination: 'projectSettings'
      }
    ];

    const result = getPermissionExplanation(suggestions);
    expect(result.summary).toBe('2 permission updates across 1 location');
  });

  it('generates correct summary for multiple locations', () => {
    const suggestions: PermissionSuggestion[] = [
      {
        type: 'addRules',
        rules: [{ toolName: 'Write' }],
        behavior: 'allow',
        destination: 'projectSettings'
      },
      {
        type: 'setMode',
        mode: 'acceptEdits',
        destination: 'session'
      }
    ];

    const result = getPermissionExplanation(suggestions);
    expect(result.summary).toBe('2 permission updates across 2 locations');
  });

  it('handles empty array', () => {
    const result = getPermissionExplanation([]);
    expect(result.summary).toBe('0 permission updates across 0 locations');
    expect(Object.keys(result.groups)).toHaveLength(0);
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
