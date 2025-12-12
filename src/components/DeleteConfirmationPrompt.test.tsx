import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { DeleteConfirmationPrompt } from './DeleteConfirmationPrompt';
import type { Status } from '../types';

describe('DeleteConfirmationPrompt', () => {
  let onConfirm: ReturnType<typeof vi.fn>;
  let onCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onConfirm = vi.fn();
    onCancel = vi.fn();
  });

  describe('rendering', () => {
    it('renders with agent title', () => {
      const { lastFrame } = render(
        <DeleteConfirmationPrompt
          agentTitle="Test Agent"
          agentStatus="working"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toContain('Test Agent');
    });

    it('displays Delete Active Agent header', () => {
      const { lastFrame } = render(
        <DeleteConfirmationPrompt
          agentTitle="Test Agent"
          agentStatus="working"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toContain('Delete Active Agent');
    });

    it('shows y/n options', () => {
      const { lastFrame } = render(
        <DeleteConfirmationPrompt
          agentTitle="Test Agent"
          agentStatus="working"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toContain('[y]');
      expect(lastFrame()).toContain('[n]');
      expect(lastFrame()).toContain('Yes');
      expect(lastFrame()).toContain('No');
    });

    it('shows termination warning', () => {
      const { lastFrame } = render(
        <DeleteConfirmationPrompt
          agentTitle="Test Agent"
          agentStatus="working"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toContain('terminate the agent');
    });
  });

  describe('status display', () => {
    it('displays "working" status correctly', () => {
      const { lastFrame } = render(
        <DeleteConfirmationPrompt
          agentTitle="Test Agent"
          agentStatus="working"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toContain('working');
    });

    it('displays "waiting for permission" status correctly', () => {
      const { lastFrame } = render(
        <DeleteConfirmationPrompt
          agentTitle="Test Agent"
          agentStatus="waiting"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toContain('waiting for permission');
    });

    it('displays "in error state" status for error', () => {
      const { lastFrame } = render(
        <DeleteConfirmationPrompt
          agentTitle="Test Agent"
          agentStatus="error"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toContain('in error state');
    });

    it('displays "waiting for merge approval" when hasPendingMerge is true', () => {
      const { lastFrame } = render(
        <DeleteConfirmationPrompt
          agentTitle="Test Agent"
          agentStatus="idle"
          hasPendingMerge={true}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toContain('waiting for merge approval');
    });

    it('prioritizes pending merge over status', () => {
      const { lastFrame } = render(
        <DeleteConfirmationPrompt
          agentTitle="Test Agent"
          agentStatus="working"
          hasPendingMerge={true}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toContain('waiting for merge approval');
      expect(lastFrame()).not.toContain('currently working');
    });
  });

  describe('snapshots', () => {
    const statuses: Status[] = ['working', 'waiting', 'error'];

    it.each(statuses)('renders %s status correctly', (status) => {
      const { lastFrame } = render(
        <DeleteConfirmationPrompt
          agentTitle="Test Agent"
          agentStatus={status}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    it('renders with long agent title correctly', () => {
      const { lastFrame } = render(
        <DeleteConfirmationPrompt
          agentTitle="A Very Long Agent Title That Might Wrap"
          agentStatus="working"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    it('renders with pending merge correctly', () => {
      const { lastFrame } = render(
        <DeleteConfirmationPrompt
          agentTitle="Test Agent"
          agentStatus="idle"
          hasPendingMerge={true}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toMatchSnapshot();
    });
  });
});
