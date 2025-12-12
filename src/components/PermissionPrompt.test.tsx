import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { PermissionPrompt } from './PermissionPrompt';
import type { PermissionRequest, PermissionSuggestion } from '../types';

vi.mock('../utils/permissions', () => ({
  getPermissionExplanation: (suggestions: PermissionSuggestion[] | undefined) => {
    if (!suggestions || suggestions.length === 0) return null;
    return {
      saveLocation: 'repo settings (.claude/settings.json)',
      whatWillBeSaved: 'Write(*)',
      futureBeha: 'Future Write operations will be auto-allowed'
    };
  },
  getDestinationInfo: (destination: string) => {
    switch (destination) {
      case 'projectSettings':
        return { shortcut: 'R', filePath: '.claude/settings.json' };
      case 'localSettings':
        return { shortcut: 'L', filePath: '.claude/settings.local.json' };
      case 'userSettings':
        return { shortcut: 'U', filePath: '~/.claude/settings.json' };
      case 'session':
        return { shortcut: 'S', filePath: 'session' };
      default:
        return { shortcut: '?', filePath: 'unknown' };
    }
  },
  formatPermissionRule: (rule: any) => {
    if (rule.toolName) {
      return `${rule.toolName}(*)`;
    }
    return 'Unknown rule';
  }
}));

vi.mock('../utils/helpers', () => ({
  formatToolInput: (input: unknown) => JSON.stringify(input).slice(0, 50)
}));

const createPermission = (overrides: Partial<PermissionRequest> = {}): PermissionRequest => ({
  toolName: 'Write',
  toolInput: { file_path: '/test/file.ts', content: 'test content' },
  resolve: vi.fn(),
  ...overrides
});

const createSuggestion = (overrides: Partial<PermissionSuggestion> = {}): PermissionSuggestion => ({
  type: 'addRules',
  rules: [{ toolName: 'Write' }],
  behavior: 'allow',
  destination: 'localSettings',
  ...overrides
});

describe('PermissionPrompt', () => {
  let onResponse: ReturnType<typeof vi.fn>;
  let onAlwaysAllow: ReturnType<typeof vi.fn>;
  let onAlwaysAllowInRepo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onResponse = vi.fn();
    onAlwaysAllow = vi.fn();
    onAlwaysAllowInRepo = vi.fn();
  });

  describe('rendering', () => {
    it('renders permission request with tool name', () => {
      const permission = createPermission({ toolName: 'Write' });
      const { lastFrame } = render(
        <PermissionPrompt
          permission={permission}
          onResponse={onResponse}
          onAlwaysAllow={onAlwaysAllow}
        />
      );
      expect(lastFrame()).toContain('Write');
      expect(lastFrame()).toContain('Permission Request');
    });

    it('renders queue count when provided', () => {
      const permission = createPermission();
      const { lastFrame } = render(
        <PermissionPrompt
          permission={permission}
          onResponse={onResponse}
          onAlwaysAllow={onAlwaysAllow}
          queueCount={3}
        />
      );
      expect(lastFrame()).toContain('+3 more pending');
    });

    it('shows Yes and No options for all tools', () => {
      const permission = createPermission({ toolName: 'Bash' });
      const { lastFrame } = render(
        <PermissionPrompt
          permission={permission}
          onResponse={onResponse}
          onAlwaysAllow={onAlwaysAllow}
        />
      );
      expect(lastFrame()).toContain('[Y]es');
      expect(lastFrame()).toContain('[N]o');
    });

    it('shows Local option when suggestions are provided', () => {
      const permission = createPermission({
        suggestions: [createSuggestion({ destination: 'localSettings' })]
      });
      const { lastFrame } = render(
        <PermissionPrompt
          permission={permission}
          onResponse={onResponse}
          onAlwaysAllow={onAlwaysAllow}
          onAlwaysAllowInRepo={onAlwaysAllowInRepo}
        />
      );
      expect(lastFrame()).toContain('[L]ocal');
    });

    it('shows User option when suggestion destination is userSettings', () => {
      const permission = createPermission({
        suggestions: [createSuggestion({ destination: 'userSettings' })]
      });
      const { lastFrame } = render(
        <PermissionPrompt
          permission={permission}
          onResponse={onResponse}
          onAlwaysAllow={onAlwaysAllow}
          onAlwaysAllowInRepo={onAlwaysAllowInRepo}
        />
      );
      expect(lastFrame()).toContain('[U]ser');
    });

    it('shows basic shortcut hints without suggestions', () => {
      const permission = createPermission({ toolName: 'Write' });
      const { lastFrame } = render(
        <PermissionPrompt
          permission={permission}
          onResponse={onResponse}
          onAlwaysAllow={onAlwaysAllow}
        />
      );
      expect(lastFrame()).toContain('y/n');
      expect(lastFrame()).not.toContain('y/n/l');
    });

    it('shows local shortcut hint when suggestions provided', () => {
      const permission = createPermission({
        suggestions: [createSuggestion({ destination: 'localSettings' })]
      });
      const { lastFrame } = render(
        <PermissionPrompt
          permission={permission}
          onResponse={onResponse}
          onAlwaysAllow={onAlwaysAllow}
          onAlwaysAllowInRepo={onAlwaysAllowInRepo}
        />
      );
      expect(lastFrame()).toContain('y/n/l');
    });

    it('shows user shortcut hint when userSettings suggestion provided', () => {
      const permission = createPermission({
        suggestions: [createSuggestion({ destination: 'userSettings' })]
      });
      const { lastFrame } = render(
        <PermissionPrompt
          permission={permission}
          onResponse={onResponse}
          onAlwaysAllow={onAlwaysAllow}
          onAlwaysAllowInRepo={onAlwaysAllowInRepo}
        />
      );
      expect(lastFrame()).toContain('y/n/u');
    });

    it('shows local settings explanation when suggestions provided', () => {
      const permission = createPermission({
        suggestions: [createSuggestion()]
      });
      const { lastFrame } = render(
        <PermissionPrompt
          permission={permission}
          onResponse={onResponse}
          onAlwaysAllow={onAlwaysAllow}
          onAlwaysAllowInRepo={onAlwaysAllowInRepo}
        />
      );
      expect(lastFrame()).toContain('.claude/settings.local.json');
    });
  });

  describe('option variants', () => {
    it('renders only yes/no for tool without suggestions', () => {
      const permission = createPermission({ toolName: 'Bash' });
      const { lastFrame } = render(
        <PermissionPrompt
          permission={permission}
          onResponse={onResponse}
          onAlwaysAllow={onAlwaysAllow}
        />
      );
      expect(lastFrame()).toContain('[Y]es');
      expect(lastFrame()).toContain('[N]o');
      expect(lastFrame()).not.toContain('[L]ocal');
    });

    it('renders yes/no for edit tool without suggestions', () => {
      const permission = createPermission({ toolName: 'Write' });
      const { lastFrame } = render(
        <PermissionPrompt
          permission={permission}
          onResponse={onResponse}
          onAlwaysAllow={onAlwaysAllow}
        />
      );
      expect(lastFrame()).toContain('[Y]es');
      expect(lastFrame()).toContain('[N]o');
      expect(lastFrame()).not.toContain('[L]ocal');
    });

    it('renders suggestion options when provided', () => {
      const permission = createPermission({
        toolName: 'Edit',
        suggestions: [createSuggestion({ destination: 'localSettings' })]
      });
      const { lastFrame } = render(
        <PermissionPrompt
          permission={permission}
          onResponse={onResponse}
          onAlwaysAllow={onAlwaysAllow}
          onAlwaysAllowInRepo={onAlwaysAllowInRepo}
        />
      );
      expect(lastFrame()).toContain('[Y]es');
      expect(lastFrame()).toContain('[N]o');
      expect(lastFrame()).toContain('[L]ocal');
    });
  });

  describe('tool input display', () => {
    it('displays formatted tool input', () => {
      const permission = createPermission({
        toolInput: { file_path: '/test/file.ts' }
      });
      const { lastFrame } = render(
        <PermissionPrompt
          permission={permission}
          onResponse={onResponse}
          onAlwaysAllow={onAlwaysAllow}
        />
      );
      expect(lastFrame()).toContain('Input:');
    });
  });

  describe('snapshots', () => {
    it('renders Write permission correctly', () => {
      const permission = createPermission({
        toolName: 'Write',
        toolInput: { file_path: '/test.ts' }
      });
      const { lastFrame } = render(
        <PermissionPrompt
          permission={permission}
          onResponse={onResponse}
          onAlwaysAllow={onAlwaysAllow}
        />
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    it('renders Bash permission correctly', () => {
      const permission = createPermission({
        toolName: 'Bash',
        toolInput: { command: 'npm test' }
      });
      const { lastFrame } = render(
        <PermissionPrompt
          permission={permission}
          onResponse={onResponse}
          onAlwaysAllow={onAlwaysAllow}
        />
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    it('renders permission with suggestions correctly', () => {
      const permission = createPermission({
        toolName: 'Write',
        suggestions: [createSuggestion()]
      });
      const { lastFrame } = render(
        <PermissionPrompt
          permission={permission}
          onResponse={onResponse}
          onAlwaysAllow={onAlwaysAllow}
          onAlwaysAllowInRepo={onAlwaysAllowInRepo}
        />
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    it('renders permission with queue count correctly', () => {
      const permission = createPermission({ toolName: 'Edit' });
      const { lastFrame } = render(
        <PermissionPrompt
          permission={permission}
          onResponse={onResponse}
          onAlwaysAllow={onAlwaysAllow}
          queueCount={5}
        />
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    it('renders userSettings suggestion correctly', () => {
      const permission = createPermission({
        toolName: 'Write',
        suggestions: [createSuggestion({ destination: 'userSettings' })]
      });
      const { lastFrame } = render(
        <PermissionPrompt
          permission={permission}
          onResponse={onResponse}
          onAlwaysAllow={onAlwaysAllow}
          onAlwaysAllowInRepo={onAlwaysAllowInRepo}
        />
      );
      expect(lastFrame()).toMatchSnapshot();
    });
  });
});
