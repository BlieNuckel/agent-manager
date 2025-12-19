import type { GraphNode } from '../types';

export function findNextNode(
  nodes: GraphNode[],
  currentNode: GraphNode | null,
  direction: 'up' | 'down' | 'left' | 'right'
): GraphNode | null {
  if (!currentNode) {
    return nodes.length > 0 ? nodes[0] : null;
  }

  let candidateNodes: GraphNode[] = [];

  switch (direction) {
    case 'down':
      candidateNodes = nodes
        .filter(n => n.position.y > currentNode.position.y)
        .sort((a, b) => {
          // First sort by vertical distance
          const aDist = a.position.y - currentNode.position.y;
          const bDist = b.position.y - currentNode.position.y;
          if (aDist !== bDist) return aDist - bDist;
          // Then by horizontal distance for nodes at same level
          return Math.abs(a.position.x - currentNode.position.x) -
                 Math.abs(b.position.x - currentNode.position.x);
        });
      break;

    case 'up':
      candidateNodes = nodes
        .filter(n => n.position.y < currentNode.position.y)
        .sort((a, b) => {
          // First sort by vertical distance
          const aDist = currentNode.position.y - a.position.y;
          const bDist = currentNode.position.y - b.position.y;
          if (aDist !== bDist) return aDist - bDist;
          // Then by horizontal distance for nodes at same level
          return Math.abs(a.position.x - currentNode.position.x) -
                 Math.abs(b.position.x - currentNode.position.x);
        });
      break;

    case 'right':
      candidateNodes = nodes
        .filter(n =>
          n.position.x > currentNode.position.x &&
          Math.abs(n.position.y - currentNode.position.y) < 5
        )
        .sort((a, b) => a.position.x - b.position.x);
      break;

    case 'left':
      candidateNodes = nodes
        .filter(n =>
          n.position.x < currentNode.position.x &&
          Math.abs(n.position.y - currentNode.position.y) < 5
        )
        .sort((a, b) => b.position.x - a.position.x);
      break;
  }

  return candidateNodes[0] || null;
}

export function getNodeDescription(node: GraphNode): string {
  const typeLabel = node.type === 'workflow' ? 'Workflow' :
                    node.type === 'stage' ? 'Stage' :
                    node.type === 'agent' ? 'Agent' :
                    node.type === 'artifact' ? 'Artifact' : 'Node';

  const statusLabel = node.status ? ` (${node.status})` : '';

  return `${typeLabel}: ${node.label}${statusLabel}`;
}