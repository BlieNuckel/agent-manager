import type { PermissionSuggestion } from '../types';

export function formatPermissionRule(suggestion: PermissionSuggestion, fallbackToolInput?: unknown): string {
  if (!suggestion.rules || suggestion.rules.length === 0) {
    return '';
  }

  const toolNames = suggestion.rules.map(r => r.toolName);

  if (toolNames.length === 1) {
    const rule = suggestion.rules[0];
    const toolInput = rule.toolInput || fallbackToolInput;
    if (toolInput && typeof toolInput === 'object') {
      const inputStr = formatToolInputForRule(toolInput as Record<string, unknown>);
      return `${rule.toolName}("${inputStr}")`;
    }
    return rule.toolName;
  }

  return toolNames.join(', ');
}

function formatToolInputForRule(input: Record<string, unknown>): string {
  if ('command' in input && typeof input.command === 'string') {
    const cmd = input.command;
    const firstWord = cmd.split(/\s+/)[0];
    return `${firstWord}:*`;
  }

  if ('file_path' in input && typeof input.file_path === 'string') {
    return `${input.file_path}:*`;
  }

  return '*';
}

export function getPermissionExplanation(suggestions: PermissionSuggestion[] | undefined, toolName: string, toolInput?: unknown): {
  saveLocation: string;
  whatWillBeSaved: string;
  futureBeha: string;
} | null {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const suggestion = suggestions[0];
  const saveLocation = suggestion.destination === 'localSettings'
    ? '.claude/settings.local.json'
    : '~/.claude/settings.json';

  const ruleStr = formatPermissionRule(suggestion, toolInput);
  const whatWillBeSaved = ruleStr;

  const futureBeha = suggestion.behavior === 'allow'
    ? `Future ${toolName} commands matching this pattern will be automatically allowed`
    : `Future ${toolName} commands matching this pattern will be automatically denied`;

  return {
    saveLocation,
    whatWillBeSaved,
    futureBeha
  };
}

export function getAlwaysAllowExplanation(toolName: string): string {
  return `Auto-accept all Write/Edit tools for the rest of this session (${toolName} and similar edit operations)`;
}
