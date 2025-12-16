import { describe, it, expect } from 'vitest';
import { createArtifactMcpServer } from './artifactServer';

describe('createArtifactMcpServer', () => {
  it('should create a valid MCP server object', () => {
    const server = createArtifactMcpServer();
    expect(server).toBeDefined();
    expect(typeof server).toBe('object');
    // MCP servers are expected to be objects with internal structure
    // The actual testing of the tools is done via integration tests
  });
});