import type { PermissionSuggestion, PermissionRuleValue, PermissionDestination } from '../types';

export function formatPermissionRule(rule: PermissionRuleValue): string {
  if (!rule.ruleContent) {
    return rule.toolName;
  }

  return `${rule.toolName}("${rule.ruleContent}")`;
}

export function getDestinationInfo(destination: PermissionDestination): {
  label: string;
  filePath: string | null;
  description: string;
  shortcut: string;
} {
  switch (destination) {
    case 'projectSettings':
      return {
        label: 'Repo',
        filePath: '.claude/settings.json',
        description: 'Shared across all developers in this repository',
        shortcut: 'R'
      };

    case 'localSettings':
      return {
        label: 'Local',
        filePath: '.claude/settings.local.json',
        description: 'Only on your machine for this repository',
        shortcut: 'L'
      };

    case 'userSettings':
      return {
        label: 'User',
        filePath: '~/.claude/settings.json',
        description: 'Your global settings across all projects',
        shortcut: 'U'
      };

    case 'session':
      return {
        label: 'Session',
        filePath: null,
        description: 'Only for this session (not saved to file)',
        shortcut: 'S'
      };

    case 'cliArg':
      return {
        label: 'CLI',
        filePath: null,
        description: 'Passed as command-line argument',
        shortcut: 'C'
      };
  }
}

export function getPermissionExplanation(
  suggestions: PermissionSuggestion[]
): {
  summary: string;
  groups: Record<PermissionDestination, PermissionSuggestion[]>;
} {
  const groups: Record<string, PermissionSuggestion[]> = {};

  for (const suggestion of suggestions) {
    const dest = suggestion.destination;
    if (!groups[dest]) {
      groups[dest] = [];
    }
    groups[dest].push(suggestion);
  }

  const totalCount = suggestions.length;
  const destCount = Object.keys(groups).length;

  const summary = `${totalCount} permission update${totalCount !== 1 ? 's' : ''} across ${destCount} location${destCount !== 1 ? 's' : ''}`;

  return { summary, groups: groups as Record<PermissionDestination, PermissionSuggestion[]> };
}

export function getAlwaysAllowExplanation(toolName: string): string {
  return `Auto-accept all Write/Edit tools for the rest of this session (${toolName} and similar edit operations)`;
}
