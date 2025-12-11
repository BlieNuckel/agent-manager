import React, { useMemo } from 'react';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import { AnsiText } from '../utils/ansiToInk';
import chalk from 'chalk';

interface MarkdownProps {
  children: string;
  wrap?: 'wrap' | 'truncate' | 'truncate-end' | 'truncate-middle' | 'truncate-start';
}

chalk.level = 3;

const renderer = new TerminalRenderer({
  code: chalk.yellow,
  codespan: chalk.yellow,
  tableOptions: {
    style: {
      head: ['cyan'],
      border: ['gray']
    }
  }
});

marked.setOptions({ renderer });

export const Markdown = ({ children, wrap = 'wrap' }: MarkdownProps) => {
  const text = useMemo(() => {
    try {
      const rendered = marked.parse(children);
      return typeof rendered === 'string' ? rendered.trim() : '';
    } catch {
      return children;
    }
  }, [children]);

  return <AnsiText wrap={wrap}>{text}</AnsiText>;
};

export default Markdown;
