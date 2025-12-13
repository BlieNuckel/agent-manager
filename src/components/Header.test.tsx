import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Header } from './Header';

describe('Header', () => {
  describe('basic rendering', () => {
    it('renders header with app title', () => {
      const { lastFrame } = render(<Header activeCount={0} waitingCount={0} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('Clank Manager');
      expect(lastFrame()).toContain('v2');
    });
  });

  describe('active count display', () => {
    it('renders with zero active agents', () => {
      const { lastFrame } = render(<Header activeCount={0} waitingCount={0} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('0 active');
    });

    it('renders with one active agent', () => {
      const { lastFrame } = render(<Header activeCount={1} waitingCount={0} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('1 active');
    });

    it('renders with multiple active agents', () => {
      const { lastFrame } = render(<Header activeCount={5} waitingCount={0} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('5 active');
    });
  });

  describe('waiting count display', () => {
    it('does not show waiting count when zero', () => {
      const { lastFrame } = render(<Header activeCount={3} waitingCount={0} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).not.toContain('waiting');
    });

    it('shows waiting count when greater than zero', () => {
      const { lastFrame } = render(<Header activeCount={3} waitingCount={2} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('2 waiting');
    });

    it('shows waiting count of one', () => {
      const { lastFrame } = render(<Header activeCount={1} waitingCount={1} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('1 waiting');
    });
  });

  describe('combined states', () => {
    it('renders no agents state', () => {
      const { lastFrame } = render(<Header activeCount={0} waitingCount={0} />);
      expect(lastFrame()).toMatchSnapshot();
    });

    it('renders many active with many waiting', () => {
      const { lastFrame } = render(<Header activeCount={10} waitingCount={5} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('10 active');
      expect(lastFrame()).toContain('5 waiting');
    });

    it('renders only waiting agents (edge case)', () => {
      const { lastFrame } = render(<Header activeCount={0} waitingCount={3} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('0 active');
      expect(lastFrame()).toContain('3 waiting');
    });
  });
});
