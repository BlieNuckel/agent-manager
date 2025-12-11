import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getGitRoot, getCurrentBranch, getRepoName, generateBranchName } from './worktree';
import { execSync } from 'child_process';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('getGitRoot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the git root path when in a git repository', () => {
    vi.mocked(execSync).mockReturnValue('/Users/test/my-project\n');

    const result = getGitRoot();

    expect(result).toBe('/Users/test/my-project');
    expect(execSync).toHaveBeenCalledWith(
      'git rev-parse --show-toplevel',
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
  });

  it('trims whitespace from the result', () => {
    vi.mocked(execSync).mockReturnValue('  /path/to/repo  \n');

    const result = getGitRoot();

    expect(result).toBe('/path/to/repo');
  });

  it('returns null when not in a git repository', () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('fatal: not a git repository');
    });

    const result = getGitRoot();

    expect(result).toBeNull();
  });

  it('returns null when git command fails', () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('command not found: git');
    });

    const result = getGitRoot();

    expect(result).toBeNull();
  });
});

describe('getCurrentBranch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the current branch name', () => {
    vi.mocked(execSync).mockReturnValue('feature-branch\n');

    const result = getCurrentBranch();

    expect(result).toBe('feature-branch');
    expect(execSync).toHaveBeenCalledWith(
      'git rev-parse --abbrev-ref HEAD',
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
  });

  it('trims whitespace from the result', () => {
    vi.mocked(execSync).mockReturnValue('  main  \n');

    const result = getCurrentBranch();

    expect(result).toBe('main');
  });

  it('returns "main" as default when git command fails', () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('fatal: not a git repository');
    });

    const result = getCurrentBranch();

    expect(result).toBe('main');
  });

  it('returns "main" when HEAD is detached', () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('HEAD detached');
    });

    const result = getCurrentBranch();

    expect(result).toBe('main');
  });

  it('handles branch names with slashes', () => {
    vi.mocked(execSync).mockReturnValue('feature/user-auth\n');

    const result = getCurrentBranch();

    expect(result).toBe('feature/user-auth');
  });

  it('handles branch names with hyphens', () => {
    vi.mocked(execSync).mockReturnValue('fix-bug-123\n');

    const result = getCurrentBranch();

    expect(result).toBe('fix-bug-123');
  });
});

describe('getRepoName', () => {
  it('extracts repository name from git root path', () => {
    const result = getRepoName('/Users/test/projects/my-repo');

    expect(result).toBe('my-repo');
  });

  it('handles paths with trailing slash', () => {
    const result = getRepoName('/Users/test/projects/my-repo/');

    expect(result).toBe('my-repo');
  });

  it('handles simple directory names', () => {
    const result = getRepoName('/project');

    expect(result).toBe('project');
  });

  it('handles deeply nested paths', () => {
    const result = getRepoName('/Users/test/Documents/code/projects/client/frontend');

    expect(result).toBe('frontend');
  });

  it('handles paths with hyphens in name', () => {
    const result = getRepoName('/home/user/agent-manager');

    expect(result).toBe('agent-manager');
  });

  it('handles paths with dots in name', () => {
    const result = getRepoName('/home/user/my.project.name');

    expect(result).toBe('my.project.name');
  });

  it('handles single directory', () => {
    const result = getRepoName('repo');

    expect(result).toBe('repo');
  });
});

describe('generateBranchName', () => {
  it('generates a branch name from task description', () => {
    const result = generateBranchName('Add user authentication feature');

    expect(result).toBe('add-user-authentication-feature');
  });

  it('removes content between angle brackets', () => {
    const result = generateBranchName('When generating a <branch-name>, please cut out everything');

    expect(result).toBe('when-generating-cut-out');
  });

  it('removes multiple angle bracket sections', () => {
    const result = generateBranchName('Fix <bug-123> in the <old-component> new module');

    expect(result).toBe('fix-new-module');
  });

  it('handles nested-looking angle brackets', () => {
    const result = generateBranchName('Update <component<T>> handler');

    expect(result).toBe('update-handler');
  });

  it('filters out stop words', () => {
    const result = generateBranchName('I want to add a new feature for the users');

    expect(result).toBe('add-new-feature-users');
  });

  it('limits to 4 keywords', () => {
    const result = generateBranchName('implement user authentication login page form validation');

    expect(result).toBe('implement-user-authentication-login');
  });

  it('returns fallback for empty meaningful words', () => {
    const result = generateBranchName('a the is to');

    expect(result).toMatch(/^task-[a-z0-9]+$/);
  });
});
