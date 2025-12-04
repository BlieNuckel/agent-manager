export interface WorktreeContext {
  enabled: boolean;
  suggestedName?: string;
  gitRoot: string;
  currentBranch: string;
  repoName: string;
}

export function buildWorktreeInstructions(context: WorktreeContext): string {
  if (!context.enabled) {
    return '';
  }

  return `
# Git Worktree Management Instructions

You are working in a git repository and the user has requested to use git worktrees for isolated development.

## Current Repository Context
- Git Root: ${context.gitRoot}
- Current Branch: ${context.currentBranch}
- Repository Name: ${context.repoName}
- Suggested Branch Name: ${context.suggestedName || '(auto-generate from task)'}

## Your Responsibilities

### 1. Create Git Worktree (First Step)
Before starting any work, you MUST create a git worktree:

\`\`\`bash
# Generate a branch name from the task (2-4 kebab-case words) if not provided
# Example: "add-dark-mode", "fix-auth-bug", "refactor-api-routes"
BRANCH_NAME="${context.suggestedName || '<generate-from-task>'}"

# Create worktree in parent directory with naming pattern: <repo-name>-<branch-name>
WORKTREE_PATH="${context.gitRoot}/../${context.repoName}-\${BRANCH_NAME}"

# Create the worktree branching from current branch
git worktree add -b "\${BRANCH_NAME}" "\${WORKTREE_PATH}" "${context.currentBranch}"

# Change to worktree directory for all subsequent work
cd "\${WORKTREE_PATH}"
\`\`\`

### 2. Work in Isolated Environment
- All file operations (Read, Write, Edit, etc.) should happen in the worktree directory
- Make commits as you normally would
- The worktree is isolated from the main repository

### 3. Prepare for Merge (Final Step)
When your work is complete and you've tested everything:

\`\`\`bash
# Ensure all changes are committed
git add .
git commit -m "Your descriptive commit message"

# Switch back to main repository
cd "${context.gitRoot}"

# Test if merge will have conflicts (dry-run)
git merge --no-commit --no-ff "\${BRANCH_NAME}"

# Check the status
if git status --porcelain | grep -q '^UU\\|^AA\\|^DD'; then
  echo "[WORKTREE_MERGE_CONFLICTS] Branch \${BRANCH_NAME} has conflicts"
  git merge --abort
else
  echo "[WORKTREE_MERGE_READY] Branch \${BRANCH_NAME} is ready to merge"
  git merge --abort
fi
\`\`\`

### 4. Signal Completion
At the end of your work, output one of these markers:
- \`[WORKTREE_MERGE_READY] <branch-name>\` - Branch is ready to merge without conflicts
- \`[WORKTREE_MERGE_CONFLICTS] <branch-name>\` - Branch has merge conflicts that need manual resolution
- \`[WORKTREE_MERGE_FAILED] <branch-name> <error-message>\` - Could not test merge

## Important Notes
- ALWAYS create the worktree as your first action
- ALWAYS work within the worktree directory (not the main repository)
- ALWAYS test merge viability before completing
- DO NOT attempt to merge yourself - signal readiness and let the user decide
- DO NOT delete the worktree or branch - cleanup will be handled after merge confirmation

## Example Workflow

\`\`\`bash
# Step 1: Create worktree
git worktree add -b "add-user-auth" "${context.gitRoot}/../${context.repoName}-add-user-auth" "${context.currentBranch}"
cd "${context.gitRoot}/../${context.repoName}-add-user-auth"

# Step 2: Do your work
# ... make changes, write code, test ...
git add .
git commit -m "Add user authentication system"

# Step 3: Test merge viability
cd "${context.gitRoot}"
git merge --no-commit --no-ff "add-user-auth"
git status --porcelain
git merge --abort

# Step 4: Signal completion
echo "[WORKTREE_MERGE_READY] add-user-auth"
\`\`\`
`.trim();
}

export function buildSystemPrompt(worktreeContext?: WorktreeContext): string {
  const parts: string[] = [];

  if (worktreeContext?.enabled) {
    parts.push(buildWorktreeInstructions(worktreeContext));
  }

  return parts.join('\n\n');
}
