import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getGitRoot,
  getCurrentBranch,
  getRepoName,
  generateBranchName,
  branchExists,
  generateUniqueBranchName,
} from "./worktree";
import { execSync } from "child_process";

vi.mock("child_process", () => ({
  execSync: vi.fn(),
}));

describe("getGitRoot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the git root path when in a git repository", () => {
    vi.mocked(execSync).mockReturnValue("/Users/test/my-project\n");

    const result = getGitRoot();

    expect(result).toBe("/Users/test/my-project");
    expect(execSync).toHaveBeenCalledWith("git rev-parse --show-toplevel", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  });

  it("trims whitespace from the result", () => {
    vi.mocked(execSync).mockReturnValue("  /path/to/repo  \n");

    const result = getGitRoot();

    expect(result).toBe("/path/to/repo");
  });

  it("returns null when not in a git repository", () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error("fatal: not a git repository");
    });

    const result = getGitRoot();

    expect(result).toBeNull();
  });

  it("returns null when git command fails", () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error("command not found: git");
    });

    const result = getGitRoot();

    expect(result).toBeNull();
  });
});

describe("getCurrentBranch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the current branch name", () => {
    vi.mocked(execSync).mockReturnValue("feature-branch\n");

    const result = getCurrentBranch();

    expect(result).toBe("feature-branch");
    expect(execSync).toHaveBeenCalledWith("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  });

  it("trims whitespace from the result", () => {
    vi.mocked(execSync).mockReturnValue("  main  \n");

    const result = getCurrentBranch();

    expect(result).toBe("main");
  });

  it('returns "main" as default when git command fails', () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error("fatal: not a git repository");
    });

    const result = getCurrentBranch();

    expect(result).toBe("main");
  });

  it('returns "main" when HEAD is detached', () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error("HEAD detached");
    });

    const result = getCurrentBranch();

    expect(result).toBe("main");
  });

  it("handles branch names with slashes", () => {
    vi.mocked(execSync).mockReturnValue("feature/user-auth\n");

    const result = getCurrentBranch();

    expect(result).toBe("feature/user-auth");
  });

  it("handles branch names with hyphens", () => {
    vi.mocked(execSync).mockReturnValue("fix-bug-123\n");

    const result = getCurrentBranch();

    expect(result).toBe("fix-bug-123");
  });
});

describe("getRepoName", () => {
  it("extracts repository name from git root path", () => {
    const result = getRepoName("/Users/test/projects/my-repo");

    expect(result).toBe("my-repo");
  });

  it("handles paths with trailing slash", () => {
    const result = getRepoName("/Users/test/projects/my-repo/");

    expect(result).toBe("my-repo");
  });

  it("handles simple directory names", () => {
    const result = getRepoName("/project");

    expect(result).toBe("project");
  });

  it("handles deeply nested paths", () => {
    const result = getRepoName(
      "/Users/test/Documents/code/projects/client/frontend",
    );

    expect(result).toBe("frontend");
  });

  it("handles paths with hyphens in name", () => {
    const result = getRepoName("/home/user/agent-manager");

    expect(result).toBe("agent-manager");
  });

  it("handles paths with dots in name", () => {
    const result = getRepoName("/home/user/my.project.name");

    expect(result).toBe("my.project.name");
  });

  it("handles single directory", () => {
    const result = getRepoName("repo");

    expect(result).toBe("repo");
  });
});

describe("generateBranchName", () => {
  it("removes content between angle brackets", () => {
    const result = generateBranchName(
      "When generating a <branch-name>, please cut out everything",
    );

    expect(result).toBe("when-generating-cut-out");
  });

  it("removes multiple angle bracket sections", () => {
    const result = generateBranchName(
      "Fix <bug-123> in the <old-component> new module",
    );

    expect(result).toBe("fix-new-module");
  });

  it("handles nested-looking angle brackets", () => {
    const result = generateBranchName("Update <component<T>> handler");

    expect(result).toBe("update-handler");
  });

  it("extracts meaningful keywords from verbose prompts", () => {
    expect(
      generateBranchName(
        "Please refactor the authentication system to use JWT tokens",
      ),
    ).toBe("refactor/authentication-jwt-tokens");
  });

  it("uses fix prefix for bug-related prompts", () => {
    expect(generateBranchName("Fix the broken pagination on dashboard")).toBe(
      "fix/broken-pagination-dashboard",
    );
  });

  it("uses feat prefix for new features", () => {
    expect(generateBranchName("Add dark mode toggle to the application")).toBe(
      "feat/dark-toggle-application",
    );
  });

  it("extracts issue numbers", () => {
    expect(generateBranchName("Fix #123: Memory leak in event handler")).toBe(
      "fix/123-memory-event-handler",
    );
  });

  it("prioritizes technical terms", () => {
    expect(
      generateBranchName(
        "Review and optimize slow database queries in the user service",
      ),
    ).toBe("database-queries-user-service");
  });

  it("handles empty input", () => {
    expect(generateBranchName("")).toMatch(/^task-[a-z0-9]+$/);
  });

  it("handles whitespace-only input", () => {
    expect(generateBranchName("   ")).toMatch(/^task-[a-z0-9]+$/);
  });

  it("filters noise words", () => {
    const result = generateBranchName("Fix all the new very broken things");
    expect(result).not.toContain("all");
    expect(result).not.toContain("new");
    expect(result).not.toContain("very");
  });

  it("uses update prefix for update prompts", () => {
    expect(generateBranchName("Update the user authentication flow")).toBe(
      "update/user-authentication-flow",
    );
  });

  it("uses chore prefix for setup tasks", () => {
    expect(generateBranchName("Setup the CI/CD pipeline")).toBe(
      "chore/ci-cd-pipeline",
    );
  });

  it("handles prompts without recognized intent prefix", () => {
    expect(generateBranchName("Analyze the performance bottlenecks")).toBe(
      "analyze-performance-bottlenecks",
    );
  });

  it("handles issue number without prefix", () => {
    expect(generateBranchName("Investigate #456 performance issue")).toBe(
      "456-investigate-performance-issue",
    );
  });

  it("respects maxKeywords parameter", () => {
    expect(generateBranchName("Fix the broken pagination on dashboard", 2)).toBe(
      "fix/pagination-dashboard",
    );
  });

  it("returns single keyword when maxKeywords is 1", () => {
    expect(generateBranchName("Fix the broken pagination on dashboard", 1)).toBe(
      "fix/pagination",
    );
  });

  it("handles maxKeywords larger than available words", () => {
    expect(generateBranchName("Fix auth", 10)).toBe("fix/auth");
  });
});

describe("branchExists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when branch exists", () => {
    vi.mocked(execSync).mockReturnValue("");

    const result = branchExists("/path/to/repo", "feature-branch");

    expect(result).toBe(true);
    expect(execSync).toHaveBeenCalledWith(
      "git show-ref --verify --quiet refs/heads/feature-branch",
      {
        cwd: "/path/to/repo",
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
  });

  it("returns false when branch does not exist", () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error("fatal: not a valid ref");
    });

    const result = branchExists("/path/to/repo", "nonexistent-branch");

    expect(result).toBe(false);
  });

  it("handles branch names with slashes", () => {
    vi.mocked(execSync).mockReturnValue("");

    const result = branchExists("/path/to/repo", "fix/auth-bug");

    expect(result).toBe(true);
    expect(execSync).toHaveBeenCalledWith(
      "git show-ref --verify --quiet refs/heads/fix/auth-bug",
      expect.any(Object),
    );
  });
});

describe("generateUniqueBranchName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns first generated name when it does not exist", () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error("not found");
    });

    const result = generateUniqueBranchName(
      "Fix the broken pagination on dashboard",
      "/path/to/repo",
    );

    expect(result).toBe("fix/broken-pagination-dashboard");
  });

  it("tries fewer keywords when branch name exists", () => {
    let callCount = 0;
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (cmd.includes("show-ref")) {
        callCount++;
        if (callCount <= 2) {
          return "";
        }
        throw new Error("not found");
      }
      return "";
    });

    const result = generateUniqueBranchName(
      "Fix the broken pagination on dashboard",
      "/path/to/repo",
    );

    expect(result).toBe("fix/pagination-dashboard");
  });

  it("adds timestamp suffix when all variations exist", () => {
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (cmd.includes("show-ref")) {
        return "";
      }
      return "";
    });

    const result = generateUniqueBranchName(
      "Fix the broken pagination on dashboard",
      "/path/to/repo",
    );

    expect(result).toMatch(/^fix\/pagination-dashboard-[a-z0-9]+$/);
  });
});
