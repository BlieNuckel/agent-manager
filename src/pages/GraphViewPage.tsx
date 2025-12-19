import React, { useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { AsciiGraphRenderer } from '../components/AsciiGraphRenderer';
import { buildWorkflowGraph } from '../utils/graphBuilder';
import { findNextNode, getNodeDescription } from '../utils/graphNavigation';
import type { State, GraphData, Workflow, WorkflowExecutionState, Agent, ArtifactInfo } from '../types';

interface GraphViewPageProps {
  state: State;
  dispatch: React.Dispatch<any>;
  workflow: Workflow;
  execution: WorkflowExecutionState;
  agents: Agent[];
  artifacts: ArtifactInfo[];
  onBack: () => void;
}

export const GraphViewPage: React.FC<GraphViewPageProps> = ({
  state,
  dispatch,
  workflow,
  execution,
  agents,
  artifacts,
  onBack,
}) => {
  // Build graph data if not already loaded
  useEffect(() => {
    if (!state.graphView.graphData || state.graphView.selectedWorkflowId !== workflow.id) {
      const graphData = buildWorkflowGraph(workflow, execution, agents, artifacts);
      dispatch({ type: 'LOAD_GRAPH', workflowId: workflow.id, graphData });
    }
  }, [workflow.id, execution, agents, artifacts, dispatch, state.graphView.graphData, state.graphView.selectedWorkflowId]);

  useInput((input, key) => {
    if (key.escape) {
      dispatch({ type: 'CLOSE_GRAPH_VIEW' });
      onBack();
      return;
    }

    if (!state.graphView.graphData) return;

    // Arrow key navigation
    if (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow) {
      const currentNode = state.graphView.selectedNodeId
        ? state.graphView.graphData.nodes.find(n => n.id === state.graphView.selectedNodeId)
        : null;

      const direction = key.downArrow ? 'down' :
                       key.upArrow ? 'up' :
                       key.rightArrow ? 'right' : 'left';

      const nextNode = findNextNode(state.graphView.graphData.nodes, currentNode || null, direction);

      if (nextNode) {
        dispatch({ type: 'SELECT_GRAPH_NODE', nodeId: nextNode.id });
      }
    }

    // Enter key to view details
    if (key.return && state.graphView.selectedNodeId) {
      const selectedNode = state.graphView.graphData.nodes.find(n => n.id === state.graphView.selectedNodeId);
      if (selectedNode && selectedNode.type === 'agent') {
        const agentId = selectedNode.id.replace('agent-', '');
        const agent = agents.find(a => a.id === agentId);
        if (agent) {
          dispatch({ type: 'CLOSE_GRAPH_VIEW' });
          // The parent component should handle navigation to agent detail view
          onBack();
        }
      }
    }
  });

  if (!state.graphView.graphData) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>Loading graph...</Text>
      </Box>
    );
  }

  const selectedNode = state.graphView.selectedNodeId
    ? state.graphView.graphData.nodes.find(n => n.id === state.graphView.selectedNodeId)
    : null;

  return (
    <Box flexDirection="column" height="100%">
      <Box borderStyle="single" borderColor="blue" paddingX={1}>
        <Text bold>Workflow Graph: {workflow.name}</Text>
      </Box>

      <Box flexGrow={1} paddingTop={1}>
        <AsciiGraphRenderer
          graphData={state.graphView.graphData}
          selectedNodeId={state.graphView.selectedNodeId}
        />
      </Box>

      <Box borderStyle="single" borderColor="gray" paddingX={1} marginTop={1}>
        <Text dimColor>
          {selectedNode ? getNodeDescription(selectedNode) : 'Use arrow keys to navigate, Enter to view details, Escape to exit'}
        </Text>
      </Box>

      <Box paddingX={1}>
        <Text dimColor>
          [↑↓←→] Navigate  [Enter] View Details  [Esc] Back
        </Text>
      </Box>
    </Box>
  );
};

export const getGraphViewHelp = () => [
  { key: '↑↓←→', description: 'Navigate between nodes' },
  { key: 'Enter', description: 'View node details' },
  { key: 'Esc', description: 'Return to workflow detail' },
];