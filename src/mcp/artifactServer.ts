import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { readFile, writeFile, appendFile, mkdir } from 'fs/promises';
import { resolve, join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';
import { debug } from '../utils/logger';

const ARTIFACTS_DIR = resolve(homedir(), '.agent-manager', 'artifacts');

// Strict validation for artifact names - only allow safe characters
const artifactNameSchema = z.string()
  .regex(/^[a-zA-Z0-9_\-\.]+$/, 'Artifact name can only contain letters, numbers, underscores, hyphens, and dots')
  .min(1, 'Artifact name cannot be empty')
  .max(255, 'Artifact name too long');

export function createArtifactMcpServer() {
  return createSdkMcpServer({
    name: 'artifacts',
    version: '1.0.0',
    tools: [
      tool(
        'Read',
        'Read an artifact file from the shared artifacts directory. Returns null if file does not exist.',
        {
          artifactName: z.string().describe('The artifact filename (e.g., "2024-03-15-auth-plan.md"). Do not include directory paths.')
        },
        async (args) => {
          debug('ArtifactRead called:', { artifactName: args.artifactName });

          // Validate artifact name
          const validation = artifactNameSchema.safeParse(args.artifactName);
          if (!validation.success) {
            throw new Error(`Invalid artifact name: ${validation.error.errors[0].message}`);
          }

          const artifactPath = join(ARTIFACTS_DIR, args.artifactName);

          try {
            const content = await readFile(artifactPath, 'utf-8');
            debug('Artifact read successfully:', { artifactName: args.artifactName, size: content.length });

            return {
              content: [{
                type: 'text' as const,
                text: content
              }]
            };
          } catch (error: any) {
            if (error.code === 'ENOENT') {
              debug('Artifact not found:', { artifactName: args.artifactName });
              return {
                content: [{
                  type: 'text' as const,
                  text: 'null'
                }]
              };
            }
            debug('Error reading artifact:', { artifactName: args.artifactName, error: error.message });
            throw new Error(`Failed to read artifact: ${error.message}`);
          }
        }
      ),

      tool(
        'Write',
        'Write content to an artifact file in the shared artifacts directory. Creates the directory if it does not exist.',
        {
          artifactName: z.string().describe('The artifact filename (e.g., "2024-03-15-auth-plan.md"). Do not include directory paths.'),
          content: z.string().describe('The content to write to the artifact file'),
          mode: z.enum(['overwrite', 'append']).default('overwrite').describe('Write mode: overwrite replaces the file, append adds to the end')
        },
        async (args) => {
          debug('ArtifactWrite called:', { artifactName: args.artifactName, mode: args.mode, contentLength: args.content.length });

          // Validate artifact name
          const validation = artifactNameSchema.safeParse(args.artifactName);
          if (!validation.success) {
            throw new Error(`Invalid artifact name: ${validation.error.errors[0].message}`);
          }

          // Ensure artifacts directory exists
          if (!existsSync(ARTIFACTS_DIR)) {
            await mkdir(ARTIFACTS_DIR, { recursive: true });
            debug('Created artifacts directory:', ARTIFACTS_DIR);
          }

          const artifactPath = join(ARTIFACTS_DIR, args.artifactName);

          try {
            if (args.mode === 'append') {
              await appendFile(artifactPath, args.content, 'utf-8');
              debug('Artifact appended successfully:', { artifactName: args.artifactName });
            } else {
              await writeFile(artifactPath, args.content, 'utf-8');
              debug('Artifact written successfully:', { artifactName: args.artifactName });
            }

            return {
              content: [{
                type: 'text' as const,
                text: `Successfully ${args.mode === 'append' ? 'appended to' : 'wrote'} artifact: ${args.artifactName}`
              }]
            };
          } catch (error: any) {
            debug('Error writing artifact:', { artifactName: args.artifactName, error: error.message });
            throw new Error(`Failed to write artifact: ${error.message}`);
          }
        }
      )
    ]
  });
}