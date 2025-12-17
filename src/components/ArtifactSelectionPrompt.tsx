import React from 'react';
import { Box, Text } from 'ink';
import type { ArtifactInfo } from '../utils/artifacts';

interface Props {
  executionId: string;
  stageId: string;
  stageName: string;
  recentArtifacts: ArtifactInfo[];
  onSelect: (artifactPath: string) => void;
  onSkip: () => void;
  onCancel: () => void;
}

export const ArtifactSelectionPrompt = ({
  executionId,
  stageId,
  stageName,
  recentArtifacts,
  onSelect,
  onSkip,
  onCancel
}: Props) => {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} flexShrink={0}>
      <Text bold color="yellow">⚠️  Workflow Artifact Not Found</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text>
          Stage <Text color="cyan">{stageName}</Text> completed, but no artifact was found with the required frontmatter:
        </Text>
        <Box marginLeft={2} marginTop={1} flexDirection="column">
          <Text dimColor>workflowExecutionId: {executionId}</Text>
          <Text dimColor>workflowStageId: {stageId}</Text>
        </Box>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold>This means:</Text>
        <Text>• The agent may not have created an artifact</Text>
        <Text>• Or the artifact is missing the required frontmatter fields</Text>
        <Text>• The next stage won't automatically know which artifact to read</Text>
      </Box>

      {recentArtifacts.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Recently modified artifacts:</Text>
          {recentArtifacts.slice(0, 3).map((artifact, idx) => (
            <Box key={artifact.path} marginLeft={2}>
              <Text dimColor>[{idx + 1}]</Text>
              <Text> {artifact.name}</Text>
            </Box>
          ))}
        </Box>
      )}

      <Box marginTop={1} flexDirection="column">
        <Text bold>Options:</Text>
        <Text>
          <Text color="cyan">[1-{Math.min(3, recentArtifacts.length)}]</Text>
          <Text> Select artifact by number</Text>
        </Text>
        <Text>
          <Text color="yellow">[s]</Text>
          <Text> Skip - continue without artifact (next stage may fail)</Text>
        </Text>
        <Text>
          <Text color="red">[c]</Text>
          <Text> Cancel - stay on this stage</Text>
        </Text>
      </Box>
    </Box>
  );
};
