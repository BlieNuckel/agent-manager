import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { QuestionRequest } from '../types';

export const QuestionPrompt = ({ questionRequest, onResponse, hasPendingMerge = false }: {
  questionRequest: QuestionRequest;
  onResponse: (answers: Record<string, string | string[]>) => void;
  hasPendingMerge?: boolean;
}) => {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Set<number>>>({});
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(0);
  const [customTextAnswers, setCustomTextAnswers] = useState<Record<number, string>>({});
  const [isEnteringCustomText, setIsEnteringCustomText] = useState(false);
  const [customTextValue, setCustomTextValue] = useState('');

  const currentQuestion = questionRequest.questions[currentQuestionIdx];
  const isLastQuestion = currentQuestionIdx === questionRequest.questions.length - 1;
  const currentAnswers = answers[currentQuestionIdx] || new Set<number>();
  const totalOptions = currentQuestion.options.length + 1;
  const otherOptionIdx = currentQuestion.options.length;

  useInput((input, key) => {
    if (isEnteringCustomText) {
      if (key.escape) {
        setIsEnteringCustomText(false);
        setCustomTextValue('');
      }
      return;
    }

    if (hasPendingMerge && (input === 'y' || input === 'n' || input === 'p')) {
      return;
    }

    if (key.upArrow || input === 'k') {
      setSelectedOptionIdx(s => Math.max(0, s - 1));
    }
    if (key.downArrow || input === 'j') {
      setSelectedOptionIdx(s => Math.min(totalOptions - 1, s + 1));
    }

    if (input === ' ') {
      if (selectedOptionIdx === otherOptionIdx) {
        if (!currentQuestion.multiSelect) {
          setIsEnteringCustomText(true);
          setCustomTextValue('');
        }
      } else if (currentQuestion.multiSelect) {
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

    if (key.return || (!hasPendingMerge && input === 'n')) {
      let currentQuestionAnswer = currentAnswers;
      let hasCustomText = customTextAnswers[currentQuestionIdx] !== undefined;

      if (!currentQuestion.multiSelect && currentQuestionAnswer.size === 0 && !hasCustomText) {
        currentQuestionAnswer = new Set([selectedOptionIdx]);
      }

      if (currentQuestionAnswer !== currentAnswers) {
        setAnswers({ ...answers, [currentQuestionIdx]: currentQuestionAnswer });
      }

      if (isLastQuestion) {
        const finalAnswers: Record<string, string | string[]> = {};
        questionRequest.questions.forEach((q, idx) => {
          const customText = customTextAnswers[idx];
          if (customText !== undefined) {
            finalAnswers[q.header] = customText;
          } else {
            const answerSet = idx === currentQuestionIdx
              ? currentQuestionAnswer
              : (answers[idx] || new Set([0]));
            const selectedIndices = Array.from(answerSet);
            if (q.multiSelect) {
              finalAnswers[q.header] = selectedIndices.map(i => q.options[i].label);
            } else {
              finalAnswers[q.header] = q.options[selectedIndices[0]].label;
            }
          }
        });
        onResponse(finalAnswers);
      } else {
        setCurrentQuestionIdx(idx => idx + 1);
        setSelectedOptionIdx(0);
      }
    }

    if (key.leftArrow || (!hasPendingMerge && input === 'p')) {
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
            <Box key={idx} marginBottom={1}>
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

        <Box>
          <Box
            flexDirection="column"
            paddingX={2}
            paddingY={0}
            flexShrink={0}
            borderStyle={selectedOptionIdx === otherOptionIdx ? 'bold' : 'single'}
            borderColor={selectedOptionIdx === otherOptionIdx ? 'magenta' : 'gray'}
            width="100%"
          >
            <Box>
              <Text color={selectedOptionIdx === otherOptionIdx ? 'magenta' : 'white'} bold={selectedOptionIdx === otherOptionIdx}>
                {customTextAnswers[currentQuestionIdx] ? '[✓] ' : '[ ] '}
                Other
              </Text>
            </Box>
            <Box>
              <Text dimColor>Provide your own custom response</Text>
            </Box>
          </Box>
        </Box>

        {isEnteringCustomText && (
          <Box marginTop={1} flexDirection="column">
            <Text color="cyan">Enter your response:</Text>
            <Box marginTop={1}>
              <Text color="magenta">&gt; </Text>
              <TextInput
                value={customTextValue}
                onChange={setCustomTextValue}
                onSubmit={(value) => {
                  if (value.trim()) {
                    setCustomTextAnswers({ ...customTextAnswers, [currentQuestionIdx]: value.trim() });
                  }
                  setIsEnteringCustomText(false);
                  setCustomTextValue('');
                }}
              />
            </Box>
            <Box marginTop={1}>
              <Text dimColor>Press Enter to confirm • Esc to cancel</Text>
            </Box>
          </Box>
        )}

        {!isEnteringCustomText && customTextAnswers[currentQuestionIdx] && (
          <Box marginTop={1} paddingX={2}>
            <Text dimColor>Custom answer: </Text>
            <Text color="cyan">{customTextAnswers[currentQuestionIdx]}</Text>
          </Box>
        )}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>↑/↓ to select • Space to {currentQuestion.multiSelect ? 'toggle' : 'choose'} • Enter to {isLastQuestion ? 'submit' : 'next'}</Text>
        {currentQuestionIdx > 0 && <Text dimColor>← or p to go back</Text>}
      </Box>
    </Box>
  );
};
