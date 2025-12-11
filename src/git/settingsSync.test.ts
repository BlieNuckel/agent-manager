import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  getSettingsPath,
  settingsExist,
  readSettings,
  writeSettings,
  copySettingsToWorktree,
  mergeSettingsFromWorktree
} from './settingsSync';

describe('settingsSync', () => {
  let tempDir: string;
  let mainRepo: string;
  let worktree: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'settings-sync-test-'));
    mainRepo = path.join(tempDir, 'main');
    worktree = path.join(tempDir, 'worktree');
    fs.mkdirSync(mainRepo, { recursive: true });
    fs.mkdirSync(worktree, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getSettingsPath', () => {
    it('returns the correct path', () => {
      expect(getSettingsPath('/repo')).toBe('/repo/.claude/settings.local.json');
    });
  });

  describe('settingsExist', () => {
    it('returns false when settings do not exist', () => {
      expect(settingsExist(mainRepo)).toBe(false);
    });

    it('returns true when settings exist', () => {
      const settingsDir = path.join(mainRepo, '.claude');
      fs.mkdirSync(settingsDir, { recursive: true });
      fs.writeFileSync(path.join(settingsDir, 'settings.local.json'), '{}');

      expect(settingsExist(mainRepo)).toBe(true);
    });
  });

  describe('readSettings/writeSettings', () => {
    it('should read and write settings correctly', () => {
      const settings = {
        permissions: {
          allow: ['Bash(npm:*)'],
          deny: []
        }
      };

      writeSettings(mainRepo, settings);
      const read = readSettings(mainRepo);

      expect(read).toEqual(settings);
    });

    it('should return null for non-existent settings', () => {
      expect(readSettings(mainRepo)).toBeNull();
    });

    it('should create .claude directory if it does not exist', () => {
      const settings = { permissions: { allow: ['Bash(npm:*)'] } };
      writeSettings(mainRepo, settings);

      expect(fs.existsSync(path.join(mainRepo, '.claude'))).toBe(true);
    });

    it('should handle invalid JSON gracefully', () => {
      const settingsDir = path.join(mainRepo, '.claude');
      fs.mkdirSync(settingsDir, { recursive: true });
      fs.writeFileSync(path.join(settingsDir, 'settings.local.json'), 'invalid json');

      expect(readSettings(mainRepo)).toBeNull();
    });
  });

  describe('copySettingsToWorktree', () => {
    it('should copy settings from main to worktree', () => {
      const settings = {
        permissions: { allow: ['Bash(npm:*)'] }
      };
      writeSettings(mainRepo, settings);

      const result = copySettingsToWorktree(mainRepo, worktree);

      expect(result.success).toBe(true);
      expect(result.copied).toBe(true);
      expect(readSettings(worktree)).toEqual(settings);
    });

    it('should succeed with copied=false when no settings exist', () => {
      const result = copySettingsToWorktree(mainRepo, worktree);

      expect(result.success).toBe(true);
      expect(result.copied).toBe(false);
    });

    it('should create .claude directory in worktree if needed', () => {
      const settings = { permissions: { allow: ['Bash(npm:*)'] } };
      writeSettings(mainRepo, settings);

      copySettingsToWorktree(mainRepo, worktree);

      expect(fs.existsSync(path.join(worktree, '.claude'))).toBe(true);
    });
  });

  describe('mergeSettingsFromWorktree', () => {
    it('should merge new permissions from worktree', () => {
      writeSettings(mainRepo, {
        permissions: { allow: ['Bash(npm:*)'] }
      });
      writeSettings(worktree, {
        permissions: { allow: ['Bash(npm:*)', 'Bash(git:*)'] }
      });

      const result = mergeSettingsFromWorktree(mainRepo, worktree);

      expect(result.success).toBe(true);
      expect(result.merged).toBe(true);
      expect(result.newPermissions).toEqual(['Bash(git:*)']);

      const merged = readSettings(mainRepo);
      expect(merged?.permissions?.allow).toContain('Bash(npm:*)');
      expect(merged?.permissions?.allow).toContain('Bash(git:*)');
    });

    it('should create settings in main if none exist', () => {
      writeSettings(worktree, {
        permissions: { allow: ['Bash(npm:*)'] }
      });

      const result = mergeSettingsFromWorktree(mainRepo, worktree);

      expect(result.success).toBe(true);
      expect(result.merged).toBe(true);
      expect(readSettings(mainRepo)?.permissions?.allow).toContain('Bash(npm:*)');
    });

    it('should succeed with merged=false when no worktree settings exist', () => {
      const result = mergeSettingsFromWorktree(mainRepo, worktree);

      expect(result.success).toBe(true);
      expect(result.merged).toBe(false);
    });

    it('should merge deny lists', () => {
      writeSettings(mainRepo, {
        permissions: { deny: ['Bash(rm:*)'] }
      });
      writeSettings(worktree, {
        permissions: { deny: ['Bash(rm:*)', 'Bash(sudo:*)'] }
      });

      mergeSettingsFromWorktree(mainRepo, worktree);

      const merged = readSettings(mainRepo);
      expect(merged?.permissions?.deny).toContain('Bash(rm:*)');
      expect(merged?.permissions?.deny).toContain('Bash(sudo:*)');
    });

    it('should sort merged permissions', () => {
      writeSettings(mainRepo, {
        permissions: { allow: ['Bash(z:*)'] }
      });
      writeSettings(worktree, {
        permissions: { allow: ['Bash(a:*)'] }
      });

      mergeSettingsFromWorktree(mainRepo, worktree);

      const merged = readSettings(mainRepo);
      expect(merged?.permissions?.allow).toEqual(['Bash(a:*)', 'Bash(z:*)']);
    });

    it('should preserve other top-level keys from main', () => {
      writeSettings(mainRepo, {
        permissions: { allow: ['Bash(npm:*)'] },
        someOtherKey: 'value'
      });
      writeSettings(worktree, {
        permissions: { allow: ['Bash(git:*)'] }
      });

      mergeSettingsFromWorktree(mainRepo, worktree);

      const merged = readSettings(mainRepo);
      expect(merged?.someOtherKey).toBe('value');
    });

    it('should add new top-level keys from worktree', () => {
      writeSettings(mainRepo, {
        permissions: { allow: ['Bash(npm:*)'] }
      });
      writeSettings(worktree, {
        permissions: { allow: ['Bash(git:*)'] },
        newKey: 'newValue'
      });

      mergeSettingsFromWorktree(mainRepo, worktree);

      const merged = readSettings(mainRepo);
      expect(merged?.newKey).toBe('newValue');
    });
  });
});
