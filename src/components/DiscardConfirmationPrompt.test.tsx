import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { DiscardConfirmationPrompt } from './DiscardConfirmationPrompt';

describe('DiscardConfirmationPrompt', () => {
  let onConfirm: ReturnType<typeof vi.fn>;
  let onCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onConfirm = vi.fn();
    onCancel = vi.fn();
  });

  describe('rendering', () => {
    it('renders with header text', () => {
      const { lastFrame } = render(
        <DiscardConfirmationPrompt onConfirm={onConfirm} onCancel={onCancel} />
      );
      expect(lastFrame()).toContain('Discard changes?');
    });

    it('displays description text', () => {
      const { lastFrame } = render(
        <DiscardConfirmationPrompt onConfirm={onConfirm} onCancel={onCancel} />
      );
      expect(lastFrame()).toContain('unsaved input');
    });

    it('shows y/n options', () => {
      const { lastFrame } = render(
        <DiscardConfirmationPrompt onConfirm={onConfirm} onCancel={onCancel} />
      );
      expect(lastFrame()).toContain('[y]');
      expect(lastFrame()).toContain('[n]');
      expect(lastFrame()).toContain('Yes');
      expect(lastFrame()).toContain('No');
    });
  });

  describe('snapshots', () => {
    it('renders correctly', () => {
      const { lastFrame } = render(
        <DiscardConfirmationPrompt onConfirm={onConfirm} onCancel={onCancel} />
      );
      expect(lastFrame()).toMatchSnapshot();
    });
  });
});
