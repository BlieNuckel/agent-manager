import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { CompactListSelect } from './CompactListSelect';
import type { CompactListItem } from '../types/prompts';

describe('CompactListSelect', () => {
  const mockOnSelect = vi.fn();

  const createItems = (): CompactListItem[] => [
    { key: 'option1', shortcut: 'a', label: 'Option A', description: 'First option' },
    { key: 'option2', shortcut: 'b', label: 'Option B', description: 'Second option' },
    { key: 'option3', label: 'Option C', description: 'Third option' },
  ];

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  describe('rendering', () => {
    it('renders header and items', () => {
      const items = createItems();
      const { lastFrame } = render(
        <CompactListSelect
          items={items}
          selected=""
          onSelect={mockOnSelect}
          header="[!] Select an option"
        />
      );

      expect(lastFrame()).toContain('[!] Select an option');
      expect(lastFrame()).toContain('[a]ption A');
      expect(lastFrame()).toContain('[b]ption B');
      expect(lastFrame()).toContain('Option C');
    });

    it('renders footer when provided', () => {
      const { lastFrame } = render(
        <CompactListSelect
          items={createItems()}
          selected=""
          onSelect={mockOnSelect}
          header="Header"
          footer="Press keys to select"
        />
      );

      expect(lastFrame()).toContain('Press keys to select');
    });

    it('shows selection indicator', () => {
      const { lastFrame } = render(
        <CompactListSelect
          items={createItems()}
          selected=""
          onSelect={mockOnSelect}
          header="Header"
        />
      );

      expect(lastFrame()).toContain('▸');
    });

    it('shows descriptions', () => {
      const { lastFrame } = render(
        <CompactListSelect
          items={createItems()}
          selected=""
          onSelect={mockOnSelect}
          header="Header"
        />
      );

      expect(lastFrame()).toContain('First option');
      expect(lastFrame()).toContain('Second option');
    });

    it('uses custom border color', () => {
      const { lastFrame } = render(
        <CompactListSelect
          items={createItems()}
          selected=""
          onSelect={mockOnSelect}
          header="Header"
          borderColor="magenta"
        />
      );

      // Border rendering might vary, but the component should not crash
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('single select mode', () => {
    it('shows selected item', () => {
      const { lastFrame } = render(
        <CompactListSelect
          items={createItems()}
          selected="option2"
          onSelect={mockOnSelect}
          header="Header"
        />
      );

      const frame = lastFrame();
      expect(frame).toBeDefined();
      // The selected item should have the indicator
      const lines = frame!.split('\n');
      const optionBLine = lines.find(l => l.includes('Option B'));
      expect(optionBLine).toBeDefined();
      if (optionBLine) {
        expect(optionBLine).toContain('▸');
      }
    });
  });

  describe('multi-select mode', () => {
    it('shows checkboxes for multi-select', () => {
      const { lastFrame } = render(
        <CompactListSelect
          items={createItems()}
          selected={[]}
          onSelect={mockOnSelect}
          header="Header"
          multiSelect
        />
      );

      expect(lastFrame()).toContain('[ ]');
    });

    it('shows checked items', () => {
      const { lastFrame } = render(
        <CompactListSelect
          items={createItems()}
          selected={['option1', 'option3']}
          onSelect={mockOnSelect}
          header="Header"
          multiSelect
        />
      );

      expect(lastFrame()).toContain('[✓]');
    });
  });

  describe('keyboard interaction', () => {
    it('responds to shortcut keys', () => {
      const { stdin } = render(
        <CompactListSelect
          items={createItems()}
          selected=""
          onSelect={mockOnSelect}
          header="Header"
        />
      );

      stdin.write('a');
      expect(mockOnSelect).toHaveBeenCalledWith('option1');
    });

    it('responds to arrow navigation and enter', () => {
      const { stdin } = render(
        <CompactListSelect
          items={createItems()}
          selected=""
          onSelect={mockOnSelect}
          header="Header"
        />
      );

      stdin.write('\u001B[B'); // down arrow
      stdin.write('\r'); // enter
      expect(mockOnSelect).toHaveBeenCalledWith('option2');
    });

    it('ignores shortcuts for disabled items', () => {
      const items: CompactListItem[] = [
        { key: 'disabled', shortcut: 'd', label: 'Disabled', disabled: true },
        { key: 'enabled', shortcut: 'e', label: 'Enabled' },
      ];

      const { stdin } = render(
        <CompactListSelect
          items={items}
          selected=""
          onSelect={mockOnSelect}
          header="Header"
        />
      );

      stdin.write('d');
      expect(mockOnSelect).not.toHaveBeenCalled();

      stdin.write('e');
      expect(mockOnSelect).toHaveBeenCalledWith('enabled');
    });
  });
});