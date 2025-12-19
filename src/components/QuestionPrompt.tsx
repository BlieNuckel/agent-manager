import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { QuestionRequest } from '../types';
import type { CompactListItem } from '../types/prompts';
import { CompactListSelect } from './CompactListSelect';

export const QuestionPrompt = ({ questionRequest, onResponse, hasPendingMerge = false }: {
  questionRequest: QuestionRequest;
  onResponse: (answers: Record<string, string | string[]>) => void;
  hasPendingMerge?: boolean;
}) => {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Set<number>>>({});
  const [customTextAnswers, setCustomTextAnswers] = useState<Record<number, string>>({});
  const [isEnteringCustomText, setIsEnteringCustomText] = useState(false);
  const [customTextValue, setCustomTextValue] = useState('');

  const currentQuestion = questionRequest.questions[currentQuestionIdx];
  const isLastQuestion = currentQuestionIdx === questionRequest.questions.length - 1;
  const currentAnswers = answers[currentQuestionIdx] || new Set<number>();
  const otherOptionIdx = currentQuestion.options.length;

  // Build items for CompactListSelect
  const items = useMemo(() => {
    const listItems: CompactListItem[] = currentQuestion.options.map((option, idx) => ({
      key: `option-${idx}`,
      label: option.label,
      description: option.description,
    }));

    // Add "Other" option
    listItems.push({
      key: 'other',
      label: 'Other',
      description: 'Provide your own custom response',
    });

    return listItems;
  }, [currentQuestion]);

  // Get selected values for CompactListSelect
  const selected = useMemo(() => {
    if (customTextAnswers[currentQuestionIdx] !== undefined) {
      return currentQuestion.multiSelect ? ['other'] : 'other';
    }
    const selectedIndices = Array.from(currentAnswers);
    const keys = selectedIndices.map(idx => `option-${idx}`);
    return currentQuestion.multiSelect ? keys : (keys[0] || '');
  }, [currentAnswers, customTextAnswers, currentQuestionIdx, currentQuestion.multiSelect]);

  const handleSelect = (key: string) => {
    if (key === 'other') {
      if (!currentQuestion.multiSelect) {
        setIsEnteringCustomText(true);
        setCustomTextValue('');
      }
      return;
    }

    // Extract index from key
    const idx = parseInt(key.replace('option-', ''));

    if (currentQuestion.multiSelect) {
      const newAnswers = new Set(currentAnswers);
      if (newAnswers.has(idx)) {
        newAnswers.delete(idx);
      } else {
        newAnswers.add(idx);
      }
      setAnswers({ ...answers, [currentQuestionIdx]: newAnswers });
    } else {
      const newAnswers = new Set<number>();
      newAnswers.add(idx);
      setAnswers({ ...answers, [currentQuestionIdx]: newAnswers });
    }
  };

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

    if (key.return || (!hasPendingMerge && input === 'n')) {
      let currentQuestionAnswer = currentAnswers;
      let hasCustomText = customTextAnswers[currentQuestionIdx] !== undefined;

      if (!currentQuestion.multiSelect && currentQuestionAnswer.size === 0 && !hasCustomText) {
        // Default to first option if nothing selected
        currentQuestionAnswer = new Set([0]);
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
      }
    }

    if (key.leftArrow || (!hasPendingMerge && input === 'p')) {
      if (currentQuestionIdx > 0) {
        setCurrentQuestionIdx(idx => idx - 1);
      }
    }
  });

  const header = `[?] ${currentQuestion.header}: ${currentQuestion.question}`;
  const footer = `↑/↓ to select • Space to ${currentQuestion.multiSelect ? 'toggle' : 'choose'} • Enter to ${isLastQuestion ? 'submit' : 'next'}${currentQuestionIdx > 0 ? ' • ← back' : ''}`;

  return (
    <Box flexDirection="column">
      <CompactListSelect
        items={items}
        selected={selected}
        onSelect={handleSelect}
        header={header}
        footer={footer}
        borderColor="magenta"
        multiSelect={currentQuestion.multiSelect}
      />

      {/* Show question progress */}
      <Box marginTop={-1} justifyContent="flex-end" paddingX={1}>
        <Text dimColor>({currentQuestionIdx + 1}/{questionRequest.questions.length})</Text>
      </Box>

      {/* Custom text input */}
      {isEnteringCustomText && (
        <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="magenta" padding={1}>
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

      {/* Show custom answer if provided */}
      {!isEnteringCustomText && customTextAnswers[currentQuestionIdx] && (
        <Box marginTop={1} paddingX={2}>
          <Text dimColor>Custom answer: </Text>
          <Text color="cyan">{customTextAnswers[currentQuestionIdx]}</Text>
        </Box>
      )}
    </Box>
  );
};
