import { execSync } from 'child_process';
import * as path from 'path';
import { debug } from '../utils/logger';
import { copySettingsToWorktree, mergeSettingsFromWorktree } from './settingsSync';

export function getGitRoot(cwd?: string): string | null {
  try {
    const workingDir = cwd || process.cwd();
    const toplevel = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: workingDir
    }).trim();

    const commonDir = execSync('git rev-parse --git-common-dir', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: workingDir
    }).trim();

    if (commonDir.endsWith('/.git')) {
      return path.dirname(commonDir);
    }

    return toplevel;
  } catch {
    return null;
  }
}

export function getCurrentBranch(cwd?: string): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: cwd || process.cwd()
    }).trim();
  } catch {
    return 'main';
  }
}

export function branchExists(gitRoot: string, branchName: string): boolean {
  try {
    execSync(`git show-ref --verify --quiet refs/heads/${branchName}`, {
      cwd: gitRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return true;
  } catch {
    return false;
  }
}

export function getRepoName(gitRoot: string): string {
  return path.basename(gitRoot);
}

export interface WorktreeCreateResult {
  success: boolean;
  worktreePath?: string;
  branchName?: string;
  error?: string;
}

export interface MergeTestResult {
  canMerge: boolean;
  hasConflicts: boolean;
  conflictFiles?: string[];
  error?: string;
}

export interface MergeResult {
  success: boolean;
  error?: string;
}

const stopWords = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'it', 'as', 'be', 'this', 'that', 'from', 'i', 'me', 'my', 'we', 'you', 'your',
  'please', 'help', 'want', 'need', 'would', 'like', 'can', 'could', 'should', 'will', 'must',
  'all', 'new', 'very', 'some', 'any', 'thing', 'stuff',
  'just', 'only', 'also', 'into', 'make', 'get', 'set',
  'now', 'then', 'here', 'there', 'when', 'where', 'how',
  'code', 'file', 'files', 'project', 'repo', 'repository'
]);

const intentPrefixes: Record<string, string> = {
  'fix': 'fix',
  'bug': 'fix',
  'repair': 'fix',
  'resolve': 'fix',
  'add': 'feat',
  'implement': 'feat',
  'create': 'feat',
  'build': 'feat',
  'refactor': 'refactor',
  'reorganize': 'refactor',
  'restructure': 'refactor',
  'clean': 'refactor',
  'update': 'update',
  'upgrade': 'update',
  'migrate': 'migrate',
  'docs': 'docs',
  'document': 'docs',
  'test': 'test',
  'chore': 'chore',
  'setup': 'chore',
  'configure': 'chore',
};

const technicalTerms = new Set([
  'api', 'auth', 'authentication', 'authorization', 'jwt', 'oauth',
  'database', 'db', 'sql', 'postgres', 'postgresql', 'mongodb', 'redis',
  'cache', 'caching', 'session', 'cookie', 'token',
  'component', 'hook', 'context', 'state', 'redux', 'store',
  'route', 'router', 'routing', 'endpoint', 'middleware',
  'webpack', 'vite', 'docker', 'kubernetes', 'ci', 'cd',
  'graphql', 'rest', 'websocket', 'ssr', 'csr', 'ssg',
  'validation', 'form', 'input', 'button', 'modal', 'dialog',
  'user', 'admin', 'role', 'permission', 'login', 'logout',
  'payment', 'checkout', 'cart', 'order', 'product',
  'notification', 'email', 'sms', 'push',
  'search', 'filter', 'sort', 'pagination',
  'error', 'exception', 'logging', 'monitoring',
  'i18n', 'l10n', 'locale', 'translation',
  'theme', 'dark', 'light', 'style', 'css',
]);

function extractIssueNumber(text: string): string | null {
  const match = text.match(/#(\d+)/);
  return match ? match[1] : null;
}

function scoreWord(word: string, position: number): number {
  let score = 1;

  if (technicalTerms.has(word)) {
    score += 3;
  }

  if (word.length >= 5) {
    score += 1;
  }

  if (position < 2) {
    score -= 0.5;
  }

  return score;
}

export function generateBranchName(taskDescription: string, maxKeywords?: number): string {
  if (!taskDescription?.trim()) {
    return `task-${Date.now().toString(36)}`;
  }

  const issueNumber = extractIssueNumber(taskDescription);

  const words = taskDescription
    .replace(/<[^>]*>/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1 && !stopWords.has(word));

  if (words.length === 0) {
    return `task-${Date.now().toString(36)}`;
  }

  const prefix = intentPrefixes[words[0]] || null;
  const wordsToScore = prefix ? words.slice(1) : words;

  const scoredWords = wordsToScore.map((word, i) => ({
    word,
    score: scoreWord(word, i)
  }));

  scoredWords.sort((a, b) => b.score - a.score);

  const defaultMaxKeywords = prefix ? 3 : 4;
  const keywordLimit = maxKeywords !== undefined ? maxKeywords : defaultMaxKeywords;

  const keywords = scoredWords
    .slice(0, keywordLimit)
    .sort((a, b) => wordsToScore.indexOf(a.word) - wordsToScore.indexOf(b.word))
    .map(s => s.word);

  let branchName = keywords.join('-');

  if (prefix) {
    branchName = `${prefix}/${branchName}`;
  }

  if (issueNumber) {
    branchName = branchName.replace(`${issueNumber}-`, '');
    branchName = prefix
      ? `${prefix}/${issueNumber}-${branchName.replace(`${prefix}/`, '')}`
      : `${issueNumber}-${branchName}`;
  }

  return branchName || `task-${Date.now().toString(36)}`;
}

export function generateUniqueBranchName(taskDescription: string, gitRoot: string): string {
  for (let maxKeywords = 4; maxKeywords >= 1; maxKeywords--) {
    const branchName = generateBranchName(taskDescription, maxKeywords);
    if (!branchExists(gitRoot, branchName)) {
      return branchName;
    }
  }

  const baseName = generateBranchName(taskDescription, 2);
  return `${baseName}-${Date.now().toString(36)}`;
}

export async function createWorktree(
  gitRoot: string,
  branchName: string,
  baseBranch: string
): Promise<WorktreeCreateResult> {
  const repoName = getRepoName(gitRoot);
  const worktreePath = path.join(path.dirname(gitRoot), `${repoName}-${branchName}`);

  try {
    debug('Creating worktree:', { gitRoot, branchName, baseBranch, worktreePath });

    execSync(
      `git worktree add -b "${branchName}" "${worktreePath}" "${baseBranch}"`,
      { cwd: gitRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );

    const settingsResult = copySettingsToWorktree(gitRoot, worktreePath);
    if (settingsResult.copied) {
      debug('Settings copied to worktree');
    }

    debug('Worktree created successfully:', worktreePath);

    return {
      success: true,
      worktreePath,
      branchName
    };
  } catch (error: any) {
    debug('Failed to create worktree:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to create worktree'
    };
  }
}

export async function testMerge(
  gitRoot: string,
  branchName: string
): Promise<MergeTestResult> {
  try {
    debug('Testing merge viability:', { gitRoot, branchName });

    execSync(
      `git merge --no-commit --no-ff "${branchName}"`,
      { cwd: gitRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );

    const status = execSync(
      'git status --porcelain',
      { cwd: gitRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );

    const conflictPattern = /^(UU|AA|DD|AU|UA|DU|UD)/m;
    const hasConflicts = conflictPattern.test(status);

    let conflictFiles: string[] | undefined;
    if (hasConflicts) {
      conflictFiles = status
        .split('\n')
        .filter(line => conflictPattern.test(line))
        .map(line => line.substring(3).trim());
    }

    try {
      execSync('git merge --abort', { cwd: gitRoot, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch {
      execSync('git reset --hard HEAD', { cwd: gitRoot, stdio: ['pipe', 'pipe', 'pipe'] });
    }

    debug('Merge test result:', { hasConflicts, conflictFiles });

    return {
      canMerge: !hasConflicts,
      hasConflicts,
      conflictFiles
    };
  } catch (error: any) {
    debug('Merge test failed:', error.message);

    try {
      execSync('git merge --abort', { cwd: gitRoot, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch {
      try {
        execSync('git reset --hard HEAD', { cwd: gitRoot, stdio: ['pipe', 'pipe', 'pipe'] });
      } catch {}
    }

    if (error.message?.includes('CONFLICT') || error.message?.includes('conflict')) {
      return {
        canMerge: false,
        hasConflicts: true,
        error: error.message
      };
    }

    return {
      canMerge: false,
      hasConflicts: false,
      error: error.message || 'Failed to test merge'
    };
  }
}

export async function performMerge(
  gitRoot: string,
  branchName: string,
  commitMessage: string
): Promise<MergeResult> {
  try {
    debug('Performing merge:', { gitRoot, branchName, commitMessage });

    execSync(
      `git merge --no-ff "${branchName}" -m "${commitMessage.replace(/"/g, '\\"')}"`,
      { cwd: gitRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );

    debug('Merge completed successfully');

    return { success: true };
  } catch (error: any) {
    debug('Merge failed:', error.message);

    try {
      execSync('git merge --abort', { cwd: gitRoot, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch {}

    return {
      success: false,
      error: error.message || 'Failed to perform merge'
    };
  }
}

export async function cleanupWorktree(
  worktreePath: string,
  branchName: string,
  gitRoot?: string
): Promise<{ success: boolean; error?: string; settingsMerged?: boolean; newPermissions?: string[] }> {
  try {
    debug('Cleaning up worktree:', { worktreePath, branchName });

    if (!gitRoot) {
      gitRoot = getGitRoot();
      if (!gitRoot) {
        return { success: false, error: 'Not in a git repository' };
      }
    }

    const settingsResult = mergeSettingsFromWorktree(gitRoot, worktreePath);
    if (settingsResult.merged) {
      debug('Settings merged from worktree:', settingsResult.newPermissions);
    }

    try {
      execSync(
        `git worktree remove "${worktreePath}"`,
        { cwd: gitRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
    } catch (error: any) {
      execSync(
        `git worktree remove --force "${worktreePath}"`,
        { cwd: gitRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
    }

    try {
      execSync(
        `git branch -d "${branchName}"`,
        { cwd: gitRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
    } catch (error: any) {
      debug('Warning: Could not delete branch (may already be deleted or merged):', error.message);
    }

    debug('Worktree cleanup completed successfully');

    return {
      success: true,
      settingsMerged: settingsResult.merged,
      newPermissions: settingsResult.newPermissions
    };
  } catch (error: any) {
    debug('Worktree cleanup failed:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to cleanup worktree'
    };
  }
}

export function listAllWorktrees(gitRoot: string): Array<{ path: string; branch: string; commit: string }> {
  try {
    const output = execSync('git worktree list --porcelain', {
      cwd: gitRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const worktrees: Array<{ path: string; branch: string; commit: string }> = [];
    const lines = output.trim().split('\n');
    let currentWorktree: Partial<{ path: string; branch: string; commit: string }> = {};

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        if (currentWorktree.path) {
          worktrees.push(currentWorktree as any);
        }
        currentWorktree = { path: line.substring(9) };
      } else if (line.startsWith('branch refs/heads/')) {
        currentWorktree.branch = line.substring(18);
      } else if (line.startsWith('HEAD ')) {
        currentWorktree.commit = line.substring(5);
      }
    }

    if (currentWorktree.path) {
      worktrees.push(currentWorktree as any);
    }

    // Filter out the main worktree (it has no branch field in porcelain format)
    return worktrees.filter(wt => wt.branch);
  } catch (error) {
    debug('Failed to list worktrees:', error);
    return [];
  }
}
