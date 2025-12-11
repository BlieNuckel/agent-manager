import * as fs from 'fs';
import * as path from 'path';
import { debug } from '../utils/logger';

const SETTINGS_PATH = '.claude/settings.local.json';

interface ClaudeSettings {
  permissions?: {
    allow?: string[];
    deny?: string[];
  };
  [key: string]: unknown;
}

export function getSettingsPath(repoRoot: string): string {
  return path.join(repoRoot, SETTINGS_PATH);
}

export function settingsExist(repoRoot: string): boolean {
  return fs.existsSync(getSettingsPath(repoRoot));
}

export function readSettings(repoRoot: string): ClaudeSettings | null {
  const settingsPath = getSettingsPath(repoRoot);
  try {
    if (!fs.existsSync(settingsPath)) {
      return null;
    }
    const content = fs.readFileSync(settingsPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    debug('Failed to read settings:', error);
    return null;
  }
}

export function writeSettings(repoRoot: string, settings: ClaudeSettings): boolean {
  const settingsPath = getSettingsPath(repoRoot);
  try {
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
    return true;
  } catch (error) {
    debug('Failed to write settings:', error);
    return false;
  }
}

export function copySettingsToWorktree(
  mainRepoRoot: string,
  worktreePath: string
): { success: boolean; copied: boolean; error?: string } {
  try {
    if (!settingsExist(mainRepoRoot)) {
      debug('No settings to copy from main repo');
      return { success: true, copied: false };
    }

    const mainSettings = readSettings(mainRepoRoot);
    if (!mainSettings) {
      return { success: true, copied: false };
    }

    const worktreeSettingsDir = path.join(worktreePath, '.claude');
    if (!fs.existsSync(worktreeSettingsDir)) {
      fs.mkdirSync(worktreeSettingsDir, { recursive: true });
    }

    const written = writeSettings(worktreePath, mainSettings);
    if (written) {
      debug('Copied settings from main to worktree:', { mainRepoRoot, worktreePath });
      return { success: true, copied: true };
    }

    return { success: false, copied: false, error: 'Failed to write settings' };
  } catch (error: any) {
    debug('Failed to copy settings to worktree:', error);
    return { success: false, copied: false, error: error.message };
  }
}

export function mergeSettingsFromWorktree(
  mainRepoRoot: string,
  worktreePath: string
): { success: boolean; merged: boolean; newPermissions?: string[]; error?: string } {
  try {
    const worktreeSettings = readSettings(worktreePath);
    if (!worktreeSettings) {
      debug('No settings to merge from worktree');
      return { success: true, merged: false };
    }

    const mainSettings = readSettings(mainRepoRoot) || {};
    const newPermissions = findNewPermissions(mainSettings, worktreeSettings);
    const mergedSettings = mergeSettings(mainSettings, worktreeSettings);

    const written = writeSettings(mainRepoRoot, mergedSettings);
    if (written) {
      debug('Merged settings from worktree to main:', {
        mainRepoRoot,
        worktreePath,
        newPermissions
      });
      return { success: true, merged: true, newPermissions };
    }

    return { success: false, merged: false, error: 'Failed to write merged settings' };
  } catch (error: any) {
    debug('Failed to merge settings from worktree:', error);
    return { success: false, merged: false, error: error.message };
  }
}

function mergeSettings(
  mainSettings: ClaudeSettings,
  worktreeSettings: ClaudeSettings
): ClaudeSettings {
  const merged: ClaudeSettings = { ...mainSettings };

  if (worktreeSettings.permissions) {
    merged.permissions = merged.permissions || {};

    if (worktreeSettings.permissions.allow) {
      const mainAllow = new Set(merged.permissions.allow || []);
      const worktreeAllow = worktreeSettings.permissions.allow;
      worktreeAllow.forEach(p => mainAllow.add(p));
      merged.permissions.allow = Array.from(mainAllow).sort();
    }

    if (worktreeSettings.permissions.deny) {
      const mainDeny = new Set(merged.permissions.deny || []);
      const worktreeDeny = worktreeSettings.permissions.deny;
      worktreeDeny.forEach(p => mainDeny.add(p));
      merged.permissions.deny = Array.from(mainDeny).sort();
    }
  }

  for (const key of Object.keys(worktreeSettings)) {
    if (key !== 'permissions' && !(key in merged)) {
      merged[key] = worktreeSettings[key];
    }
  }

  return merged;
}

function findNewPermissions(
  mainSettings: ClaudeSettings,
  worktreeSettings: ClaudeSettings
): string[] {
  const mainAllow = new Set(mainSettings.permissions?.allow || []);
  const worktreeAllow = worktreeSettings.permissions?.allow || [];

  return worktreeAllow.filter(p => !mainAllow.has(p));
}
