import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { HelpBar } from './HelpBar';
import { Text } from 'ink';

describe('HelpBar', () => {
  describe('content rendering', () => {
    it('renders simple text content', () => {
      const { lastFrame } = render(<HelpBar>Press q to quit</HelpBar>);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('Press q to quit');
    });

    it('renders multiple key bindings', () => {
      const { lastFrame } = render(
        <HelpBar>
          ↑↓ Navigate • Enter Select • q Quit
        </HelpBar>
      );
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('Navigate');
      expect(lastFrame()).toContain('Select');
      expect(lastFrame()).toContain('Quit');
    });
  });

  describe('with children components', () => {
    it('renders Text children', () => {
      const { lastFrame } = render(
        <HelpBar>
          <Text>n</Text> New Agent • <Text>d</Text> Delete
        </HelpBar>
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    it('renders mixed content', () => {
      const { lastFrame } = render(
        <HelpBar>
          Press <Text bold>Enter</Text> to confirm
        </HelpBar>
      );
      expect(lastFrame()).toMatchSnapshot();
    });
  });

  describe('list view help bar content', () => {
    it('renders list view key bindings', () => {
      const { lastFrame } = render(
        <HelpBar>
          n New • Enter/→ View • d Kill • Tab Switch • q Quit
        </HelpBar>
      );
      expect(lastFrame()).toMatchSnapshot();
    });
  });

  describe('detail view help bar content', () => {
    it('renders detail view key bindings', () => {
      const { lastFrame } = render(
        <HelpBar>
          ←/Esc Back • i Chat • y Copy • ↑↓ Scroll
        </HelpBar>
      );
      expect(lastFrame()).toMatchSnapshot();
    });
  });

  describe('empty and minimal content', () => {
    it('renders with empty string', () => {
      const { lastFrame } = render(<HelpBar>{''}</HelpBar>);
      expect(lastFrame()).toMatchSnapshot();
    });

    it('renders with single character', () => {
      const { lastFrame } = render(<HelpBar>q</HelpBar>);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('q');
    });
  });
});
