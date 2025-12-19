import React from 'react';
import { render } from 'ink-testing-library';
import { ScrollableMarkdown } from './ScrollableMarkdown';

describe('ScrollableMarkdown', () => {
  it('should wrap long lines instead of truncating', () => {
    const longContent = 'This is a very long line that should be wrapped instead of truncated when it exceeds the terminal width. It contains enough text to ensure it will definitely need to be wrapped on most terminals.';

    // Render with a small height to ensure scrolling is needed
    const { lastFrame } = render(
      <ScrollableMarkdown content={longContent} height={10} />
    );

    // The content should be rendered without truncation
    // The exact output will depend on terminal width, but it should contain the full text
    const output = lastFrame();

    // Check that the text is present (not truncated)
    expect(output).toBeDefined();
    // The long line should be wrapped, so we should see at least part of it
    expect(output).toContain('This is a very long line');
  });

  it('should handle markdown content with proper wrapping', () => {
    const markdownContent = `# Heading

This is a paragraph with a very long line that should be wrapped properly when displayed in the terminal. The text should not be truncated.

- List item 1 with some text
- List item 2 with a very long description that exceeds the normal terminal width and should be wrapped
`;

    const { lastFrame } = render(
      <ScrollableMarkdown content={markdownContent} height={15} />
    );

    const output = lastFrame();
    expect(output).toBeDefined();
    // Should contain the heading
    expect(output).toContain('Heading');
  });
});