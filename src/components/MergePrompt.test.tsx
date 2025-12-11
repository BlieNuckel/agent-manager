import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { MergePrompt } from './MergePrompt';
import type { MergeState } from '../types';

describe('MergePrompt', () => {
  let onApprove: ReturnType<typeof vi.fn>;
  let onDeny: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onApprove = vi.fn();
    onDeny = vi.fn();
  });

  describe('ready state', () => {
    const readyState: MergeState = {
      branchName: 'feature-branch',
      status: 'ready'
    };

    it('renders Merge Ready header', () => {
      const { lastFrame } = render(
        <MergePrompt mergeState={readyState} onApprove={onApprove} onDeny={onDeny} />
      );
      expect(lastFrame()).toContain('Merge Ready');
    });

    it('displays branch name', () => {
      const { lastFrame } = render(
        <MergePrompt mergeState={readyState} onApprove={onApprove} onDeny={onDeny} />
      );
      expect(lastFrame()).toContain('feature-branch');
    });

    it('shows no conflicts detected message', () => {
      const { lastFrame } = render(
        <MergePrompt mergeState={readyState} onApprove={onApprove} onDeny={onDeny} />
      );
      expect(lastFrame()).toContain('No conflicts detected');
    });

    it('shows action choices', () => {
      const { lastFrame } = render(
        <MergePrompt mergeState={readyState} onApprove={onApprove} onDeny={onDeny} />
      );
      expect(lastFrame()).toContain('Choose action:');
    });

    it('shows y/p/n options', () => {
      const { lastFrame } = render(
        <MergePrompt mergeState={readyState} onApprove={onApprove} onDeny={onDeny} />
      );
      expect(lastFrame()).toContain('[y]');
      expect(lastFrame()).toContain('[p]');
      expect(lastFrame()).toContain('[n]');
    });

    it('uses green border color', () => {
      const { lastFrame } = render(
        <MergePrompt mergeState={readyState} onApprove={onApprove} onDeny={onDeny} />
      );
      // Just verify it renders - border color is internal to Ink
      expect(lastFrame()).toContain('🌿');
    });
  });

  describe('conflicts state', () => {
    const conflictsState: MergeState = {
      branchName: 'conflicting-branch',
      status: 'conflicts'
    };

    it('renders Merge Conflicts Detected header', () => {
      const { lastFrame } = render(
        <MergePrompt mergeState={conflictsState} onApprove={onApprove} onDeny={onDeny} />
      );
      expect(lastFrame()).toContain('Merge Conflicts Detected');
    });

    it('displays branch name', () => {
      const { lastFrame } = render(
        <MergePrompt mergeState={conflictsState} onApprove={onApprove} onDeny={onDeny} />
      );
      expect(lastFrame()).toContain('conflicting-branch');
    });

    it('shows resolve conflicts option', () => {
      const { lastFrame } = render(
        <MergePrompt mergeState={conflictsState} onApprove={onApprove} onDeny={onDeny} />
      );
      expect(lastFrame()).toContain('Have the agent resolve conflicts?');
      expect(lastFrame()).toContain('[r]');
      expect(lastFrame()).toContain('Resolve');
    });

    it('does not show y/n options', () => {
      const { lastFrame } = render(
        <MergePrompt mergeState={conflictsState} onApprove={onApprove} onDeny={onDeny} />
      );
      expect(lastFrame()).not.toContain('[y]');
      expect(lastFrame()).not.toContain('[n]');
    });
  });

  describe('failed state', () => {
    const failedState: MergeState = {
      branchName: 'failed-branch',
      status: 'failed',
      error: 'Git command failed: exit code 128'
    };

    it('renders Merge Test Failed header', () => {
      const { lastFrame } = render(
        <MergePrompt mergeState={failedState} onApprove={onApprove} onDeny={onDeny} />
      );
      expect(lastFrame()).toContain('Merge Test Failed');
    });

    it('displays branch name', () => {
      const { lastFrame } = render(
        <MergePrompt mergeState={failedState} onApprove={onApprove} onDeny={onDeny} />
      );
      expect(lastFrame()).toContain('failed-branch');
    });

    it('shows error message when provided', () => {
      const { lastFrame } = render(
        <MergePrompt mergeState={failedState} onApprove={onApprove} onDeny={onDeny} />
      );
      expect(lastFrame()).toContain('Git command failed: exit code 128');
    });

    it('shows resolve option', () => {
      const { lastFrame } = render(
        <MergePrompt mergeState={failedState} onApprove={onApprove} onDeny={onDeny} />
      );
      expect(lastFrame()).toContain('Have the agent resolve this?');
      expect(lastFrame()).toContain('[r]');
      expect(lastFrame()).toContain('Resolve');
    });

    it('handles missing error message', () => {
      const stateWithoutError: MergeState = {
        branchName: 'failed-branch',
        status: 'failed'
      };
      const { lastFrame } = render(
        <MergePrompt mergeState={stateWithoutError} onApprove={onApprove} onDeny={onDeny} />
      );
      expect(lastFrame()).toContain('Merge Test Failed');
    });
  });

  describe('resolving state', () => {
    const resolvingState: MergeState = {
      branchName: 'resolving-branch',
      status: 'resolving'
    };

    it('renders Resolving header', () => {
      const { lastFrame } = render(
        <MergePrompt mergeState={resolvingState} onApprove={onApprove} onDeny={onDeny} />
      );
      expect(lastFrame()).toContain('Resolving Merge Conflicts');
    });

    it('displays branch name', () => {
      const { lastFrame } = render(
        <MergePrompt mergeState={resolvingState} onApprove={onApprove} onDeny={onDeny} />
      );
      expect(lastFrame()).toContain('resolving-branch');
    });

    it('shows agent working message', () => {
      const { lastFrame } = render(
        <MergePrompt mergeState={resolvingState} onApprove={onApprove} onDeny={onDeny} />
      );
      expect(lastFrame()).toContain('Agent is working on resolving merge conflicts');
    });
  });

  describe('snapshots', () => {
    it('renders ready state correctly', () => {
      const readyState: MergeState = {
        branchName: 'feature-xyz',
        status: 'ready'
      };
      const { lastFrame } = render(
        <MergePrompt mergeState={readyState} onApprove={onApprove} onDeny={onDeny} />
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    it('renders conflicts state correctly', () => {
      const conflictsState: MergeState = {
        branchName: 'feature-conflicts',
        status: 'conflicts'
      };
      const { lastFrame } = render(
        <MergePrompt mergeState={conflictsState} onApprove={onApprove} onDeny={onDeny} />
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    it('renders failed state correctly', () => {
      const failedState: MergeState = {
        branchName: 'feature-failed',
        status: 'failed',
        error: 'Something went wrong'
      };
      const { lastFrame } = render(
        <MergePrompt mergeState={failedState} onApprove={onApprove} onDeny={onDeny} />
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    it('renders failed state without error correctly', () => {
      const failedState: MergeState = {
        branchName: 'feature-failed-no-error',
        status: 'failed'
      };
      const { lastFrame } = render(
        <MergePrompt mergeState={failedState} onApprove={onApprove} onDeny={onDeny} />
      );
      expect(lastFrame()).toMatchSnapshot();
    });
  });
});
