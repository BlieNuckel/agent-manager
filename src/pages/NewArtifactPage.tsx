import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { Template } from '../types';
import { createArtifactFromTemplate } from '../utils/artifacts';

type Step = 'template' | 'title' | 'preview';

interface NewArtifactPageProps {
  templates: Template[];
  onComplete: (artifactPath: string) => void;
  onCancel: () => void;
}

export const NewArtifactPage = ({ templates, onComplete, onCancel }: NewArtifactPageProps) => {
  const [step, setStep] = useState<Step>('template');
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const selectedTemplate = templates[selectedTemplateIndex];

  useInput((input, key) => {
    if (isCreating) return;

    if (key.escape) {
      if (step === 'title') {
        setStep('template');
      } else if (step === 'preview') {
        setStep('title');
      } else {
        onCancel();
      }
      return;
    }

    if (step === 'template') {
      if (key.upArrow && selectedTemplateIndex > 0) {
        setSelectedTemplateIndex(i => i - 1);
      }
      if (key.downArrow && selectedTemplateIndex < templates.length - 1) {
        setSelectedTemplateIndex(i => i + 1);
      }
      if (key.return && templates.length > 0) {
        setStep('title');
      }
    }

    if (step === 'preview') {
      if (key.return) {
        handleCreate();
      }
      if (key.leftArrow) {
        setStep('title');
      }
    }
  });

  const handleTitleSubmit = (value: string) => {
    if (value.trim()) {
      setStep('preview');
    }
  };

  const handleCreate = async () => {
    if (!selectedTemplate || !title.trim()) return;

    setIsCreating(true);
    try {
      const path = await createArtifactFromTemplate(selectedTemplate, { title: title.trim() });
      onComplete(path);
    } catch (err) {
      setIsCreating(false);
    }
  };

  if (templates.length === 0) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
        <Text bold color="cyan">New Artifact</Text>
        <Box marginTop={1}>
          <Text dimColor>No templates available. Templates should be in:</Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>  - assets/templates/ (system templates)</Text>
          <Text dimColor>  - ~/.agent-manager/templates/ (user templates)</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
      <Text bold color="cyan">New Artifact from Template</Text>

      <Box marginTop={1} flexDirection="column">
        <Text color={step === 'template' ? 'cyan' : 'green'}>
          {step === 'template' ? '>' : '+'} Template:
        </Text>
        {step === 'template' ? (
          <Box flexDirection="column" marginLeft={2}>
            {templates.map((t, i) => (
              <Box key={t.id}>
                <Text color={i === selectedTemplateIndex ? 'cyan' : 'white'} bold={i === selectedTemplateIndex}>
                  {i === selectedTemplateIndex ? '> ' : '  '}
                </Text>
                <Text color={i === selectedTemplateIndex ? 'cyan' : 'white'} bold={i === selectedTemplateIndex}>
                  {t.name}
                </Text>
                <Text dimColor> - {t.description}</Text>
              </Box>
            ))}
          </Box>
        ) : (
          <Box marginLeft={2}>
            <Text>{selectedTemplate?.name}</Text>
          </Box>
        )}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color={step === 'title' ? 'cyan' : step === 'template' ? 'gray' : 'green'}>
          {step === 'template' ? '○' : step === 'title' ? '>' : '+'} Title:
        </Text>
        {step === 'title' ? (
          <Box marginLeft={2}>
            <TextInput
              value={title}
              onChange={setTitle}
              onSubmit={handleTitleSubmit}
              placeholder="Enter artifact title..."
            />
          </Box>
        ) : (
          <Box marginLeft={2}>
            <Text dimColor={step === 'template'}>{title || ''}</Text>
          </Box>
        )}
      </Box>

      {step === 'preview' && (
        <Box marginTop={1} flexDirection="column">
          <Text color="cyan">{'>'} Preview:</Text>
          <Box marginLeft={2} flexDirection="column" borderStyle="single" borderColor="gray" padding={1}>
            <Text dimColor>Template: {selectedTemplate?.id}</Text>
            <Text dimColor>Title: {title}</Text>
            <Text dimColor>Created: {new Date().toISOString().split('T')[0]}</Text>
          </Box>
          <Box marginTop={1}>
            {isCreating ? (
              <Text color="yellow">Creating artifact...</Text>
            ) : (
              <Text dimColor>Press Enter to create, Esc to go back</Text>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export const getNewArtifactHelp = (step: Step) => {
  if (step === 'template') {
    return (
      <>
        <Text color="cyan">up/down</Text> Select{' '}
        <Text color="cyan">Enter</Text> Continue{' '}
        <Text color="cyan">Esc</Text> Cancel
      </>
    );
  }
  if (step === 'title') {
    return (
      <>
        <Text color="cyan">Enter</Text> Continue{' '}
        <Text color="cyan">Esc</Text> Back
      </>
    );
  }
  return (
    <>
      <Text color="cyan">Enter</Text> Create{' '}
      <Text color="cyan">Esc/left</Text> Back
    </>
  );
};
