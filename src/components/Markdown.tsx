import React, { useMemo } from 'react';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import { AnsiText } from '../utils/ansiToInk';
import chalk from 'chalk';

interface MarkdownProps {
  children: string;
}

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

export const Markdown = ({ children }: MarkdownProps) => {
  const text = useMemo(() => {
    const rendered = marked.parse(children);
    return typeof rendered === 'string' ? rendered.trim() : '';
  }, [children]);

  return <AnsiText>{text}</AnsiText>;
};

export default Markdown;
