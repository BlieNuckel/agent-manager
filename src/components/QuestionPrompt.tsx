import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { QuestionRequest } from '../types';

export const QuestionPrompt = ({ questionRequest, onResponse }: {
  questionRequest: QuestionRequest;
  onResponse: (answers: Record<string, string | string[]>) => void;
}) => {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Set<number>>>({});
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(0);

  const currentQuestion = questionRequest.questions[currentQuestionIdx];
  const isLastQuestion = currentQuestionIdx === questionRequest.questions.length - 1;
  const currentAnswers = answers[currentQuestionIdx] || new Set<number>();

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setSelectedOptionIdx(s => Math.max(0, s - 1));
    }
    if (key.downArrow || input === 'j') {
      setSelectedOptionIdx(s => Math.min(currentQuestion.options.length - 1, s + 1));
    }

    if (input === ' ') {
      if (currentQuestion.multiSelect) {
        const newAnswers = new Set(currentAnswers);
        if (newAnswers.has(selectedOptionIdx)) {
          newAnswers.delete(selectedOptionIdx);
        } else {
          newAnswers.add(selectedOptionIdx);
        }
        setAnswers({ ...answers, [currentQuestionIdx]: newAnswers });
      } else {
        const newAnswers = new Set<number>();
        newAnswers.add(selectedOptionIdx);
        setAnswers({ ...answers, [currentQuestionIdx]: newAnswers });
      }
    }

    if (key.return || input === 'n') {
      const hasAnswer = currentAnswers.size > 0;
      if (!hasAnswer && !currentQuestion.multiSelect) {
        const newAnswers = new Set<number>();
        newAnswers.add(selectedOptionIdx);
        setAnswers({ ...answers, [currentQuestionIdx]: newAnswers });
      }

      if (isLastQuestion) {
        const finalAnswers: Record<string, string | string[]> = {};
        questionRequest.questions.forEach((q, idx) => {
          const selectedIndices = Array.from(answers[idx] || new Set([0]));
          if (q.multiSelect) {
            finalAnswers[q.header] = selectedIndices.map(i => q.options[i].label);
          } else {
            finalAnswers[q.header] = q.options[selectedIndices[0]].label;
          }
        });
        onResponse(finalAnswers);
      } else {
        setCurrentQuestionIdx(idx => idx + 1);
        setSelectedOptionIdx(0);
      }
    }

    if (key.leftArrow || input === 'p') {
      if (currentQuestionIdx > 0) {
        setCurrentQuestionIdx(idx => idx - 1);
        setSelectedOptionIdx(0);
      }
    }
  });

  return (
    <Box flexDirection="column" flexShrink={0} borderStyle="round" borderColor="magenta" padding={1}>
      <Box justifyContent="space-between">
        <Text color="magenta" bold>[?] User Input Required</Text>
        <Text dimColor>({currentQuestionIdx + 1}/{questionRequest.questions.length})</Text>
      </Box>

      <Box marginTop={1}>
        <Text color="cyan">{currentQuestion.header}: </Text>
        <Text>{currentQuestion.question}</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        {currentQuestion.options.map((option, idx) => {
          const isSelected = selectedOptionIdx === idx;
          const isAnswered = currentAnswers.has(idx);

          return (
            <Box key={idx} marginBottom={idx < currentQuestion.options.length - 1 ? 1 : 0}>
              <Box
                flexDirection="column"
                paddingX={2}
                paddingY={0}
                flexShrink={0}
                borderStyle={isSelected ? 'bold' : 'single'}
                borderColor={isSelected ? 'magenta' : 'gray'}
                width="100%"
              >
                <Box>
                  <Text color={isSelected ? 'magenta' : 'white'} bold={isSelected}>
                    {isAnswered ? '[✓] ' : '[ ] '}
                    {option.label}
                  </Text>
                </Box>
                <Box>
                  <Text dimColor>{option.description}</Text>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>↑/↓ to select • Space to {currentQuestion.multiSelect ? 'toggle' : 'choose'} • Enter to {isLastQuestion ? 'submit' : 'next'}</Text>
        {currentQuestionIdx > 0 && <Text dimColor>← or p to go back</Text>}
      </Box>
    </Box>
  );
};
