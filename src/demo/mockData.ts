import type { Agent, HistoryEntry, PermissionRequest, OutputLine } from '../types';

const toOutputLine = (text: string, isSubagent: boolean = false, subagentType?: string): OutputLine => ({
  text,
  isSubagent,
  subagentType
});

export const createMockPermissionRequest = (toolName: 'Write' | 'Bash' = 'Write'): PermissionRequest => {
  if (toolName === 'Write') {
    return {
      toolName: 'Write',
      toolInput: {
        file_path: '/Users/demo/project/src/components/Example.tsx',
        content: 'export const Example = () => { return <div>Hello</div>; };'
      },
      suggestions: [{ type: 'addRules', rules: [{ toolName: 'Write' }], behavior: 'allow', destination: 'localSettings' }],
      resolve: (result: { allowed: boolean; alwaysAllowInRepo?: boolean }) => {
        console.log(`Permission ${result.allowed ? 'granted' : 'denied'} for Write tool${result.alwaysAllowInRepo ? ' (saved to repo)' : ''}`);
      }
    };
  } else {
    return {
      toolName: 'Bash',
      toolInput: {
        command: 'npm install && npm run build'
      },
      suggestions: [{ type: 'addRules', rules: [{ toolName: 'Bash' }], behavior: 'allow', destination: 'localSettings' }],
      resolve: (result: { allowed: boolean; alwaysAllowInRepo?: boolean }) => {
        console.log(`Permission ${result.allowed ? 'granted' : 'denied'} for Bash tool${result.alwaysAllowInRepo ? ' (saved to repo)' : ''}`);
      }
    };
  }
};

export const mockAgents: Agent[] = [
  {
    id: 'agent-1',
    title: 'Refactor authentication system',
    status: 'waiting',
    prompt: 'Please refactor the authentication system to use JWT tokens instead of sessions. Make sure to:\n- Update the login endpoint\n- Add token refresh logic\n- Update middleware\n- Add tests',
    output: [
      '[i] Agent will create git worktree as first action',
      '🌿 Created worktree at: /Users/demo/project-refactor-auth',
      '📝 Analyzing current authentication implementation...',
      '🔍 Found session-based auth in src/auth/session.ts',
      '🔍 Found login endpoint in src/routes/auth.ts',
      '📊 Reading authentication middleware...',
      '✅ Analysis complete. Planning JWT implementation...',
      '',
      'I need to write the new JWT utilities file.'
    ].map(line => toOutputLine(line)),
    createdAt: new Date(Date.now() - 300000),
    updatedAt: new Date(Date.now() - 5000),
    workDir: '/Users/demo/project',
    worktreeName: 'refactor-auth',
    sessionId: 'session-123',
    pendingPermission: createMockPermissionRequest(),
    agentType: 'normal',
    permissionMode: 'default',
  },
  {
    id: 'agent-2',
    title: 'Add dark mode support',
    status: 'waiting',
    prompt: 'Add dark mode toggle to the application',
    output: [
      '🔍 Searching for theme configuration...',
      '📝 Found styles in src/styles/',
      '✏️  Creating theme context...',
      '✅ Created ThemeContext.tsx',
      '✏️  Updating App.tsx to use theme provider...',
      '✅ Updated App.tsx',
      '🔄 Now running build to verify changes...',
    ].map(line => toOutputLine(line)),
    createdAt: new Date(Date.now() - 600000),
    updatedAt: new Date(Date.now() - 2000),
    workDir: '/Users/demo/project',
    sessionId: 'session-456',
    pendingPermission: createMockPermissionRequest('Bash'),
    agentType: 'auto-accept',
    permissionMode: 'acceptEdits',
  },
  {
    id: 'agent-3',
    title: 'Fix TypeScript errors in utils',
    status: 'idle',
    prompt: 'Fix all TypeScript errors in the utils directory',
    output: [
      '🔍 Running TypeScript compiler...',
      '📊 Found 12 errors in utils/',
      '✏️  Fixing type definitions in utils/helpers.ts...',
      '✅ Fixed 5 errors',
      '✏️  Fixing type definitions in utils/formatters.ts...',
      '✅ Fixed 4 errors',
      '✏️  Fixing type definitions in utils/validators.ts...',
      '✅ Fixed 3 errors',
      '🧪 Running tests...',
      '✅ All tests pass',
      '✅ All TypeScript errors resolved!',
      '',
      '✨ Task completed - waiting for follow-up'
    ].map(line => toOutputLine(line)),
    createdAt: new Date(Date.now() - 1200000),
    updatedAt: new Date(Date.now() - 60000),
    workDir: '/Users/demo/project',
    sessionId: 'session-789',
    agentType: 'normal',
    permissionMode: 'default',
  },
  {
    id: 'agent-4',
    title: 'Implement user profile page',
    status: 'error',
    prompt: 'Create a new user profile page with edit functionality',
    output: [
      '🔍 Analyzing existing user components...',
      '📝 Creating UserProfile.tsx...',
      '✅ Created component structure',
      '✏️  Adding form validation...',
      '[x] Error: Cannot find module \'yup\'',
      '[x] Error: Missing dependency. Please run npm install yup',
      '',
      '❌ Task failed due to missing dependencies'
    ].map(line => toOutputLine(line)),
    createdAt: new Date(Date.now() - 900000),
    updatedAt: new Date(Date.now() - 120000),
    workDir: '/Users/demo/project',
    agentType: 'normal',
    permissionMode: 'default',
  },
  {
    id: 'agent-5',
    title: 'Optimize database queries',
    status: 'working',
    prompt: 'Review and optimize slow database queries in the user service',
    output: [
      '🔍 Analyzing database queries...',
      '📊 Found **15 queries** in `src/services/userService.ts`',
      '⚠️  Query on line 45 has N+1 problem',
      '⚠️  Query on line 78 missing index',
      '✏️  Refactoring query with joins...',
      '',
      '## Optimization Strategy',
      '',
      '1. **Use JOIN instead of multiple queries**: This will reduce the number of database round-trips',
      '2. *Add indexes* on frequently queried columns',
      '3. Implement `query caching` for static data',
      '',
      'Here is the proposed SQL:',
      '```sql',
      'SELECT u.*, p.* FROM users u',
      'LEFT JOIN profiles p ON u.id = p.user_id',
      'WHERE u.active = true',
      '```',
      '',
      'This query is **50% faster** than the original implementation!',
    ].map(line => toOutputLine(line)),
    createdAt: new Date(Date.now() - 180000),
    updatedAt: new Date(Date.now() - 1000),
    workDir: '/Users/demo/backend',
    worktreeName: 'optimize-queries',
    agentType: 'planning',
    permissionMode: 'default',
  },
];

export const mockHistory: HistoryEntry[] = [
  {
    id: 'hist-1',
    title: 'Add user authentication',
    prompt: 'Implement user authentication with email and password',
    date: new Date(Date.now() - 86400000),
    workDir: '/Users/demo/project',
  },
  {
    id: 'hist-2',
    title: 'Setup CI/CD pipeline',
    prompt: 'Create GitHub Actions workflow for CI/CD',
    date: new Date(Date.now() - 172800000),
    workDir: '/Users/demo/project',
  },
  {
    id: 'hist-3',
    title: 'Add unit tests for API',
    prompt: 'Write comprehensive unit tests for all API endpoints',
    date: new Date(Date.now() - 259200000),
    workDir: '/Users/demo/backend',
  },
  {
    id: 'hist-4',
    title: 'Refactor component structure',
    prompt: 'Reorganize React components into feature-based folders',
    date: new Date(Date.now() - 345600000),
    workDir: '/Users/demo/project',
  },
  {
    id: 'hist-5',
    title: 'Update dependencies',
    prompt: 'Update all npm dependencies to latest stable versions',
    date: new Date(Date.now() - 432000000),
    workDir: '/Users/demo/project',
  },
];

export const createMockAgent = (overrides?: Partial<Agent>): Agent => ({
  id: `agent-${Date.now()}`,
  title: 'Mock Agent',
  status: 'working',
  prompt: 'This is a mock agent for testing',
  output: ['Mock output line 1', 'Mock output line 2'].map(line => toOutputLine(line)),
  createdAt: new Date(),
  updatedAt: new Date(),
  workDir: '/Users/demo/project',
  agentType: 'normal',
  permissionMode: 'default',
  ...overrides,
});

export const createMockHistoryEntry = (overrides?: Partial<HistoryEntry>): HistoryEntry => ({
  id: `hist-${Date.now()}`,
  title: 'Mock History Entry',
  prompt: 'This is a mock prompt',
  date: new Date(),
  workDir: '/Users/demo/project',
  ...overrides,
});
