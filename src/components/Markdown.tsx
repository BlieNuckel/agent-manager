import React, { useMemo } from 'react';
import { renderMarkdown } from '../utils/markdownTerminalRenderer';
import { AnsiText } from '../utils/ansiToInk';

interface MarkdownProps {
  children: string;
  wrap?: 'wrap' | 'truncate' | 'truncate-end' | 'truncate-middle' | 'truncate-start';
}

export const Markdown = ({ children, wrap = 'wrap' }: MarkdownProps) => {
  const text = useMemo(() => {
    try {
      return renderMarkdown(children);
    } catch {
      return children;
    }
  }, [children]);

  return <AnsiText wrap={wrap}>{text}</AnsiText>;
};

export default Markdown;
