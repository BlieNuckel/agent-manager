import type { GraphData, GraphNode, GraphEdge } from '../types';
import type { WorkflowExecutionState, Workflow } from '../types';
import type { Agent, ArtifactInfo } from '../types';

export function buildWorkflowGraph(
  workflow: Workflow,
  execution: WorkflowExecutionState,
  agents: Agent[],
  artifacts: ArtifactInfo[]
): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let yPosition = 0;
  const NODE_HEIGHT = 4;
  const NODE_SPACING = 2;

  // Create workflow root node
  nodes.push({
    id: `workflow-${workflow.id}`,
    type: 'workflow',
    label: workflow.name,
    position: { x: 20, y: yPosition },
    status: execution.status === 'running' ? 'active' :
            execution.status === 'completed' ? 'completed' :
            execution.status === 'cancelled' ? 'failed' : 'pending'
  });

  yPosition += NODE_HEIGHT + NODE_SPACING;

  // Create stage nodes
  workflow.stages.forEach((stage, index) => {
    const stageState = execution.stageStates[index];
    const stageNodeId = `stage-${workflow.id}-${index}`;

    nodes.push({
      id: stageNodeId,
      type: 'stage',
      label: stage.name,
      position: { x: 30, y: yPosition },
      status: stageState?.status === 'running' ? 'active' :
              stageState?.status === 'approved' || stageState?.status === 'skipped' ? 'completed' :
              stageState?.status === 'rejected' ? 'failed' : 'pending'
    });

    // Connect workflow to stage
    edges.push({
      from: `workflow-${workflow.id}`,
      to: stageNodeId,
      type: 'contains'
    });

    // Connect to previous stage if there's a dependency
    if (index > 0) {
      edges.push({
        from: `stage-${workflow.id}-${index - 1}`,
        to: stageNodeId,
        type: 'depends-on'
      });
    }

    // Add agent node if stage has an agent
    if (stageState?.agentId) {
      const agent = agents.find(a => a.id === stageState.agentId);
      if (agent) {
        const agentNodeId = `agent-${agent.id}`;

        nodes.push({
          id: agentNodeId,
          type: 'agent',
          label: agent.title.length > 30 ? agent.title.substring(0, 27) + '...' : agent.title,
          position: { x: 60, y: yPosition },
          status: agent.status === 'working' ? 'active' :
                  agent.status === 'done' ? 'completed' :
                  agent.status === 'error' ? 'failed' : 'pending'
        });

        edges.push({
          from: stageNodeId,
          to: agentNodeId,
          type: 'contains'
        });
      }
    }

    // Add artifact nodes related to this stage
    if (stageState?.artifactPath) {
      const artifact = artifacts.find(a => a.path === stageState.artifactPath);
      if (artifact) {
        const artifactNodeId = `artifact-${artifact.name}`;

        // Check if artifact node already exists
        if (!nodes.find(n => n.id === artifactNodeId)) {
          nodes.push({
            id: artifactNodeId,
            type: 'artifact',
            label: artifact.name.length > 25 ? artifact.name.substring(0, 22) + '...' : artifact.name,
            position: { x: 90, y: yPosition },
            status: 'completed'
          });
        }

        edges.push({
          from: stageNodeId,
          to: artifactNodeId,
          type: 'produces'
        });
      }
    }

    yPosition += NODE_HEIGHT + NODE_SPACING;
  });

  return { nodes, edges };
}