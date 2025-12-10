import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { QuitConfirmationPrompt } from './QuitConfirmationPrompt';

describe('QuitConfirmationPrompt', () => {
  let onConfirm: ReturnType<typeof vi.fn>;
  let onCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onConfirm = vi.fn();
    onCancel = vi.fn();
  });

  describe('rendering', () => {
    it('displays Active Agents Running header', () => {
      const { lastFrame } = render(
        <QuitConfirmationPrompt
          activeCount={3}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toContain('Active Agents Running');
    });

    it('shows correct agent count', () => {
      const { lastFrame } = render(
        <QuitConfirmationPrompt
          activeCount={5}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toContain('5');
    });

    it('uses singular "agent" for count of 1', () => {
      const { lastFrame } = render(
        <QuitConfirmationPrompt
          activeCount={1}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toContain('1');
      expect(lastFrame()).toContain('active agent running');
    });

    it('uses plural "agents" for count > 1', () => {
      const { lastFrame } = render(
        <QuitConfirmationPrompt
          activeCount={2}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toContain('2');
      expect(lastFrame()).toContain('agents');
    });

    it('shows termination warning', () => {
      const { lastFrame } = render(
        <QuitConfirmationPrompt
          activeCount={3}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toContain('terminate all running agents');
    });

    it('shows y/n options', () => {
      const { lastFrame } = render(
        <QuitConfirmationPrompt
          activeCount={3}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toContain('[y]');
      expect(lastFrame()).toContain('[n]');
      expect(lastFrame()).toContain('Yes');
      expect(lastFrame()).toContain('No');
    });

    it('asks for quit confirmation', () => {
      const { lastFrame } = render(
        <QuitConfirmationPrompt
          activeCount={3}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toContain('Are you sure you want to quit?');
    });
  });

  describe('snapshots', () => {
    it('renders with 1 agent correctly', () => {
      const { lastFrame } = render(
        <QuitConfirmationPrompt
          activeCount={1}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    it('renders with multiple agents correctly', () => {
      const { lastFrame } = render(
        <QuitConfirmationPrompt
          activeCount={5}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    it('renders with large agent count correctly', () => {
      const { lastFrame } = render(
        <QuitConfirmationPrompt
          activeCount={99}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toMatchSnapshot();
    });
  });
});
