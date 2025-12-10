import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { MultilineInput } from './MultilineInput';

vi.mock('@crosscopy/clipboard', () => ({
  default: {
    hasImage: vi.fn().mockResolvedValue(false),
    getText: vi.fn().mockResolvedValue(''),
    getImageBase64: vi.fn().mockResolvedValue('')
  }
}));

vi.mock('child_process', () => ({
  spawnSync: vi.fn().mockReturnValue({ status: 0 })
}));

vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue(''),
  unlinkSync: vi.fn()
}));

vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined)
}));

describe('MultilineInput', () => {
  let onChange: ReturnType<typeof vi.fn>;
  let onSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
    onSubmit = vi.fn();
  });

  describe('rendering', () => {
    it('renders empty input with cursor', () => {
      const { lastFrame } = render(
        <MultilineInput
          value=""
          onChange={onChange}
          onSubmit={onSubmit}
        />
      );
      expect(lastFrame()).toContain('█');
    });

    it('renders placeholder when value is empty', () => {
      const { lastFrame } = render(
        <MultilineInput
          value=""
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder="Enter text..."
        />
      );
      expect(lastFrame()).toContain('Enter text...');
    });

    it('renders value with cursor at end', () => {
      const { lastFrame } = render(
        <MultilineInput
          value="Hello"
          onChange={onChange}
          onSubmit={onSubmit}
        />
      );
      expect(lastFrame()).toContain('Hello');
      expect(lastFrame()).toContain('█');
    });

    it('renders multiline content', () => {
      const { lastFrame } = render(
        <MultilineInput
          value="Line 1\nLine 2\nLine 3"
          onChange={onChange}
          onSubmit={onSubmit}
        />
      );
      expect(lastFrame()).toContain('Line 1');
      expect(lastFrame()).toContain('Line 2');
      expect(lastFrame()).toContain('Line 3');
    });

    it('does not show placeholder when value is present', () => {
      const { lastFrame } = render(
        <MultilineInput
          value="some text"
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder="Enter text..."
        />
      );
      expect(lastFrame()).toContain('some text');
      expect(lastFrame()).not.toContain('Enter text...');
    });
  });

  describe('cursor position on value change', () => {
    it('updates displayed content when value prop changes', () => {
      const { rerender, lastFrame } = render(
        <MultilineInput
          value="short"
          onChange={onChange}
          onSubmit={onSubmit}
        />
      );

      expect(lastFrame()).toContain('short');

      rerender(
        <MultilineInput
          value="much longer text"
          onChange={onChange}
          onSubmit={onSubmit}
        />
      );

      const frame = lastFrame();
      expect(frame).toContain('much longer text');
    });

    it('shows cursor on first line when empty', () => {
      const { lastFrame } = render(
        <MultilineInput
          value=""
          onChange={onChange}
          onSubmit={onSubmit}
        />
      );
      expect(lastFrame()).toContain('█');
    });

    it('shows cursor on last line for multiline content', () => {
      const { lastFrame } = render(
        <MultilineInput
          value="Line 1\nLine 2"
          onChange={onChange}
          onSubmit={onSubmit}
        />
      );
      const frame = lastFrame()!;
      const lines = frame.split('\n');
      const lastLine = lines[lines.length - 1];
      expect(lastLine).toContain('█');
    });
  });

  describe('snapshots', () => {
    it('renders empty state correctly', () => {
      const { lastFrame } = render(
        <MultilineInput
          value=""
          onChange={onChange}
          onSubmit={onSubmit}
        />
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    it('renders with placeholder correctly', () => {
      const { lastFrame } = render(
        <MultilineInput
          value=""
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder="Type something..."
        />
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    it('renders single line correctly', () => {
      const { lastFrame } = render(
        <MultilineInput
          value="Hello, World!"
          onChange={onChange}
          onSubmit={onSubmit}
        />
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    it('renders multiline correctly', () => {
      const { lastFrame } = render(
        <MultilineInput
          value="First line\nSecond line\nThird line"
          onChange={onChange}
          onSubmit={onSubmit}
        />
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    it('renders long single line correctly', () => {
      const { lastFrame } = render(
        <MultilineInput
          value="This is a very long line of text that might wrap depending on terminal width"
          onChange={onChange}
          onSubmit={onSubmit}
        />
      );
      expect(lastFrame()).toMatchSnapshot();
    });
  });
});
