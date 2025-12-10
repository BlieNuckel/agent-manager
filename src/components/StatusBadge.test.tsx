import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { StatusBadge } from './StatusBadge';
import type { Status } from '../types';

vi.mock('ink-spinner', () => ({
  default: () => <>[*]</>
}));

describe('StatusBadge', () => {
  const statuses: Status[] = ['working', 'waiting', 'idle', 'done', 'error'];

  it.each(statuses)('renders %s status correctly', (status) => {
    const { lastFrame } = render(<StatusBadge status={status} />);
    expect(lastFrame()).toMatchSnapshot();
  });

  it('displays spinner icon for working status', () => {
    const { lastFrame } = render(<StatusBadge status="working" />);
    expect(lastFrame()).toContain('[*]');
    expect(lastFrame()).toContain('Working');
  });

  it('displays question mark icon for waiting status', () => {
    const { lastFrame } = render(<StatusBadge status="waiting" />);
    expect(lastFrame()).toContain('?');
    expect(lastFrame()).toContain('Waiting');
  });

  it('displays tilde icon for idle status', () => {
    const { lastFrame } = render(<StatusBadge status="idle" />);
    expect(lastFrame()).toContain('~');
    expect(lastFrame()).toContain('Idle');
  });

  it('displays plus icon for done status', () => {
    const { lastFrame } = render(<StatusBadge status="done" />);
    expect(lastFrame()).toContain('+');
    expect(lastFrame()).toContain('Done');
  });

  it('displays x icon for error status', () => {
    const { lastFrame } = render(<StatusBadge status="error" />);
    expect(lastFrame()).toContain('x');
    expect(lastFrame()).toContain('Error');
  });
});
