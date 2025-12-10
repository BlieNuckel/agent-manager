import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { HistoryItem } from './HistoryItem';
import type { HistoryEntry } from '../types';

vi.mock('../utils/helpers', () => ({
  formatTimeAgo: () => '2h ago'
}));

const createMockEntry = (overrides: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id: 'hist-123',
  title: 'Implement Feature X',
  prompt: 'Create a new feature that does something useful',
  date: new Date('2025-01-15T10:00:00'),
  workDir: '/test/project',
  ...overrides
});

describe('HistoryItem', () => {
  describe('selection state', () => {
    it('renders selected entry correctly', () => {
      const entry = createMockEntry();
      const { lastFrame } = render(<HistoryItem entry={entry} selected={true} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('>');
    });

    it('renders unselected entry correctly', () => {
      const entry = createMockEntry();
      const { lastFrame } = render(<HistoryItem entry={entry} selected={false} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).not.toMatch(/^>/);
    });
  });

  describe('title display', () => {
    it('renders entry title', () => {
      const entry = createMockEntry({ title: 'Fix Authentication Bug' });
      const { lastFrame } = render(<HistoryItem entry={entry} selected={false} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('Fix Authentication Bug');
    });

    it('renders long title', () => {
      const entry = createMockEntry({ title: 'A very long title that describes the task in detail' });
      const { lastFrame } = render(<HistoryItem entry={entry} selected={false} />);
      expect(lastFrame()).toMatchSnapshot();
    });
  });

  describe('time display', () => {
    it('renders formatted time ago', () => {
      const entry = createMockEntry();
      const { lastFrame } = render(<HistoryItem entry={entry} selected={false} />);
      expect(lastFrame()).toContain('2h ago');
    });
  });

  describe('prompt truncation', () => {
    it('truncates prompt to 30 characters plus ellipsis', () => {
      const entry = createMockEntry({
        prompt: 'This is a very long prompt that should be truncated'
      });
      const { lastFrame } = render(<HistoryItem entry={entry} selected={false} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('...');
    });

    it('shows short prompts with ellipsis', () => {
      const entry = createMockEntry({ prompt: 'Short prompt' });
      const { lastFrame } = render(<HistoryItem entry={entry} selected={false} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('Short prompt...');
    });
  });

  describe('various entry configurations', () => {
    it('renders entry with images indicator in images array', () => {
      const entry = createMockEntry({
        images: [
          { id: 'img-1', mediaType: 'image/png', size: 1024 }
        ]
      });
      const { lastFrame } = render(<HistoryItem entry={entry} selected={false} />);
      expect(lastFrame()).toMatchSnapshot();
    });
  });
});
