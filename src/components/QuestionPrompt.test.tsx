import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { QuestionPrompt } from './QuestionPrompt';
import type { QuestionRequest } from '../types';

const createQuestionRequest = (overrides: Partial<QuestionRequest> = {}): QuestionRequest => ({
  questions: [
    {
      question: 'Which framework do you prefer?',
      header: 'Framework',
      options: [
        { label: 'React', description: 'A JavaScript library for building UIs' },
        { label: 'Vue', description: 'The progressive JavaScript framework' },
        { label: 'Angular', description: 'Platform for building mobile & desktop apps' }
      ],
      multiSelect: false
    }
  ],
  resolve: vi.fn(),
  ...overrides
});

const createMultiQuestionRequest = (): QuestionRequest => ({
  questions: [
    {
      question: 'Select your framework',
      header: 'Framework',
      options: [
        { label: 'React', description: 'React framework' },
        { label: 'Vue', description: 'Vue framework' }
      ],
      multiSelect: false
    },
    {
      question: 'Select your styling',
      header: 'Styling',
      options: [
        { label: 'CSS', description: 'Plain CSS' },
        { label: 'Tailwind', description: 'Utility-first CSS' }
      ],
      multiSelect: false
    }
  ],
  resolve: vi.fn()
});

const createMultiSelectQuestion = (): QuestionRequest => ({
  questions: [
    {
      question: 'Select all that apply',
      header: 'Features',
      options: [
        { label: 'TypeScript', description: 'Type safety' },
        { label: 'ESLint', description: 'Code linting' },
        { label: 'Prettier', description: 'Code formatting' }
      ],
      multiSelect: true
    }
  ],
  resolve: vi.fn()
});

describe('QuestionPrompt', () => {
  let onResponse: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onResponse = vi.fn();
  });

  describe('rendering', () => {
    it('renders question with header', () => {
      const questionRequest = createQuestionRequest();
      const { lastFrame } = render(
        <QuestionPrompt questionRequest={questionRequest} onResponse={onResponse} />
      );
      expect(lastFrame()).toContain('Framework');
      expect(lastFrame()).toContain('Which framework do you prefer?');
    });

    it('renders all options', () => {
      const questionRequest = createQuestionRequest();
      const { lastFrame } = render(
        <QuestionPrompt questionRequest={questionRequest} onResponse={onResponse} />
      );
      expect(lastFrame()).toContain('React');
      expect(lastFrame()).toContain('Vue');
      expect(lastFrame()).toContain('Angular');
    });

    it('renders option descriptions', () => {
      const questionRequest = createQuestionRequest();
      const { lastFrame } = render(
        <QuestionPrompt questionRequest={questionRequest} onResponse={onResponse} />
      );
      expect(lastFrame()).toContain('A JavaScript library for building UIs');
      expect(lastFrame()).toContain('The progressive JavaScript framework');
      expect(lastFrame()).toContain('Platform for building mobile & desktop apps');
    });

    it('displays question counter for multi-question requests', () => {
      const questionRequest = createMultiQuestionRequest();
      const { lastFrame } = render(
        <QuestionPrompt questionRequest={questionRequest} onResponse={onResponse} />
      );
      expect(lastFrame()).toContain('(1/2)');
    });

    it('shows User Input Required header', () => {
      const questionRequest = createQuestionRequest();
      const { lastFrame } = render(
        <QuestionPrompt questionRequest={questionRequest} onResponse={onResponse} />
      );
      expect(lastFrame()).toContain('User Input Required');
    });

    it('shows navigation hints', () => {
      const questionRequest = createQuestionRequest();
      const { lastFrame } = render(
        <QuestionPrompt questionRequest={questionRequest} onResponse={onResponse} />
      );
      expect(lastFrame()).toContain('↑/↓ to select');
    });

    it('shows submit hint for single question', () => {
      const questionRequest = createQuestionRequest();
      const { lastFrame } = render(
        <QuestionPrompt questionRequest={questionRequest} onResponse={onResponse} />
      );
      expect(lastFrame()).toContain('Enter to submit');
    });

    it('shows next hint for multi-question', () => {
      const questionRequest = createMultiQuestionRequest();
      const { lastFrame } = render(
        <QuestionPrompt questionRequest={questionRequest} onResponse={onResponse} />
      );
      expect(lastFrame()).toContain('Enter to next');
    });

    it('shows toggle hint for multi-select questions', () => {
      const questionRequest = createMultiSelectQuestion();
      const { lastFrame } = render(
        <QuestionPrompt questionRequest={questionRequest} onResponse={onResponse} />
      );
      expect(lastFrame()).toContain('Space to toggle');
    });

    it('shows choose hint for single-select questions', () => {
      const questionRequest = createQuestionRequest();
      const { lastFrame } = render(
        <QuestionPrompt questionRequest={questionRequest} onResponse={onResponse} />
      );
      expect(lastFrame()).toContain('Space to choose');
    });

    it('does not show back navigation hint on first question', () => {
      const questionRequest = createMultiQuestionRequest();
      const { lastFrame } = render(
        <QuestionPrompt questionRequest={questionRequest} onResponse={onResponse} />
      );
      expect(lastFrame()).not.toContain('← or p to go back');
    });
  });

  describe('option count variations', () => {
    it('renders two options correctly', () => {
      const questionRequest = createQuestionRequest({
        questions: [{
          question: 'Yes or no?',
          header: 'Confirm',
          options: [
            { label: 'Yes', description: 'Proceed' },
            { label: 'No', description: 'Cancel' }
          ],
          multiSelect: false
        }]
      });
      const { lastFrame } = render(
        <QuestionPrompt questionRequest={questionRequest} onResponse={onResponse} />
      );
      expect(lastFrame()).toContain('Yes');
      expect(lastFrame()).toContain('No');
    });

    it('renders four options correctly', () => {
      const questionRequest = createQuestionRequest({
        questions: [{
          question: 'Choose a direction',
          header: 'Direction',
          options: [
            { label: 'North', description: 'Go north' },
            { label: 'South', description: 'Go south' },
            { label: 'East', description: 'Go east' },
            { label: 'West', description: 'Go west' }
          ],
          multiSelect: false
        }]
      });
      const { lastFrame } = render(
        <QuestionPrompt questionRequest={questionRequest} onResponse={onResponse} />
      );
      expect(lastFrame()).toContain('North');
      expect(lastFrame()).toContain('South');
      expect(lastFrame()).toContain('East');
      expect(lastFrame()).toContain('West');
    });
  });

  describe('unchecked state', () => {
    it('shows unchecked boxes initially', () => {
      const questionRequest = createQuestionRequest();
      const { lastFrame } = render(
        <QuestionPrompt questionRequest={questionRequest} onResponse={onResponse} />
      );
      expect(lastFrame()).toContain('[ ]');
    });
  });

  describe('snapshots', () => {
    it('renders single question correctly', () => {
      const questionRequest = createQuestionRequest();
      const { lastFrame } = render(
        <QuestionPrompt questionRequest={questionRequest} onResponse={onResponse} />
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    it('renders multi-question first page correctly', () => {
      const questionRequest = createMultiQuestionRequest();
      const { lastFrame } = render(
        <QuestionPrompt questionRequest={questionRequest} onResponse={onResponse} />
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    it('renders multi-select question correctly', () => {
      const questionRequest = createMultiSelectQuestion();
      const { lastFrame } = render(
        <QuestionPrompt questionRequest={questionRequest} onResponse={onResponse} />
      );
      expect(lastFrame()).toMatchSnapshot();
    });

    it('renders two options correctly', () => {
      const questionRequest = createQuestionRequest({
        questions: [{
          question: 'Yes or no?',
          header: 'Confirm',
          options: [
            { label: 'Yes', description: 'Proceed' },
            { label: 'No', description: 'Cancel' }
          ],
          multiSelect: false
        }]
      });
      const { lastFrame } = render(
        <QuestionPrompt questionRequest={questionRequest} onResponse={onResponse} />
      );
      expect(lastFrame()).toMatchSnapshot();
    });
  });
});
