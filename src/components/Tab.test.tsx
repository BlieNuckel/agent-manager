import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Tab } from './Tab';

describe('Tab', () => {
  describe('active state', () => {
    it('renders active tab correctly', () => {
      const { lastFrame } = render(<Tab label="Agents" active={true} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('Agents');
    });

    it('renders inactive tab correctly', () => {
      const { lastFrame } = render(<Tab label="Agents" active={false} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('Agents');
    });
  });

  describe('count display', () => {
    it('renders tab with count', () => {
      const { lastFrame } = render(<Tab label="Agents" active={true} count={5} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('Agents');
      expect(lastFrame()).toContain('(5)');
    });

    it('renders tab with zero count', () => {
      const { lastFrame } = render(<Tab label="History" active={false} count={0} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('(0)');
    });

    it('renders tab without count', () => {
      const { lastFrame } = render(<Tab label="Artifacts" active={true} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).not.toContain('(');
    });
  });

  describe('label variations', () => {
    it('renders tab with short label', () => {
      const { lastFrame } = render(<Tab label="New" active={false} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('New');
    });

    it('renders tab with longer label', () => {
      const { lastFrame } = render(<Tab label="Recent History" active={true} />);
      expect(lastFrame()).toMatchSnapshot();
      expect(lastFrame()).toContain('Recent History');
    });
  });

  describe('combined states', () => {
    it('renders active tab with high count', () => {
      const { lastFrame } = render(<Tab label="Agents" active={true} count={42} />);
      expect(lastFrame()).toMatchSnapshot();
    });

    it('renders inactive tab with count', () => {
      const { lastFrame } = render(<Tab label="History" active={false} count={10} />);
      expect(lastFrame()).toMatchSnapshot();
    });
  });
});
