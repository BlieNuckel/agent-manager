import React from 'react';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import { AnsiText } from '../utils/ansiToInk';

interface MarkdownProps {
  children: string;
}

export const Markdown = ({ children }: MarkdownProps) => {
  marked.setOptions({
    renderer: new TerminalRenderer({
      tableOptions: {
        style: {
          head: ['cyan'],
          border: ['gray']
        }
      }
    })
  });
  const rendered = marked.parse(children);
  const text = typeof rendered === 'string' ? rendered.trim() : '';
  return <AnsiText>{text}</AnsiText>;
};

export default Markdown;
