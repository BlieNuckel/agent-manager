import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from './systemPromptTemplates';

describe('buildSystemPrompt', () => {
  it('includes current date in artifact instructions', () => {
    const prompt = buildSystemPrompt();
    const today = new Date().toISOString().split('T')[0];

    expect(prompt).toContain(`Today's date is ${today}`);
    expect(prompt).toContain(`${today}-descriptive-name.md`);
    expect(prompt).toContain(`${today}-user-auth-plan.md`);
  });

  it('uses dynamic date in all examples', () => {
    const prompt = buildSystemPrompt();

    expect(prompt).not.toContain('2024-03-15');
    expect(prompt).not.toContain('2025-03-15');
    expect(prompt).toContain('created: ${today}');
  });

  it('includes worktree instructions when enabled', () => {
    const prompt = buildSystemPrompt({
      enabled: true,
      worktreePath: '/path/to/worktree',
      branchName: 'feature-branch',
      gitRoot: '/path/to/repo',
      currentBranch: 'main',
      repoName: 'test-repo',
    });

    expect(prompt).toContain('Git Worktree Context');
    expect(prompt).toContain('/path/to/worktree');
    expect(prompt).toContain('feature-branch');
  });

  it('includes workflow instructions when provided', () => {
    const prompt = buildSystemPrompt(undefined, {
      workflowName: 'Test Workflow',
      stageName: 'Research',
      stageIndex: 0,
      totalStages: 3,
    });

    expect(prompt).toContain('Workflow Context');
    expect(prompt).toContain('Test Workflow');
    expect(prompt).toContain('Research');
    expect(prompt).toContain('stage 1 of 3');
  });

  it('includes previous artifact instructions in workflow', () => {
    const prompt = buildSystemPrompt(undefined, {
      workflowName: 'Test Workflow',
      stageName: 'Implementation',
      stageIndex: 1,
      totalStages: 3,
      previousArtifact: '/path/to/artifact.md',
    });

    expect(prompt).toContain('Previous Stage Artifact');
    expect(prompt).toContain('artifact.md');
    expect(prompt).toContain('READ THE PREVIOUS ARTIFACT FIRST');
  });
});
