import type { Agent, HistoryEntry, PermissionRequest } from '../types';

export const createMockPermissionRequest = (): PermissionRequest => ({
  toolName: 'Write',
  toolInput: {
    file_path: '/Users/demo/project/src/components/Example.tsx',
    content: 'export const Example = () => { return <div>Hello</div>; };'
  },
  resolve: (allowed: boolean) => {
    console.log(`Permission ${allowed ? 'granted' : 'denied'} for Write tool`);
  }
});

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
    ],
    createdAt: new Date(Date.now() - 300000),
    updatedAt: new Date(Date.now() - 5000),
    workDir: '/Users/demo/project',
    worktreeName: 'refactor-auth',
    sessionId: 'session-123',
    pendingPermission: createMockPermissionRequest(),
    agentType: 'normal',
    autoAcceptPermissions: false,
  },
  {
    id: 'agent-2',
    title: 'Add dark mode support',
    status: 'working',
    prompt: 'Add dark mode toggle to the application',
    output: [
      '🔍 Searching for theme configuration...',
      '📝 Found styles in src/styles/',
      '✏️  Creating theme context...',
      '✅ Created ThemeContext.tsx',
      '✏️  Updating App.tsx to use theme provider...',
      '✅ Updated App.tsx',
      '🔄 Now adding toggle component...',
    ],
    createdAt: new Date(Date.now() - 600000),
    updatedAt: new Date(Date.now() - 2000),
    workDir: '/Users/demo/project',
    sessionId: 'session-456',
    agentType: 'auto-accept',
    autoAcceptPermissions: true,
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
    ],
    createdAt: new Date(Date.now() - 1200000),
    updatedAt: new Date(Date.now() - 60000),
    workDir: '/Users/demo/project',
    sessionId: 'session-789',
    agentType: 'normal',
    autoAcceptPermissions: false,
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
    ],
    createdAt: new Date(Date.now() - 900000),
    updatedAt: new Date(Date.now() - 120000),
    workDir: '/Users/demo/project',
    agentType: 'normal',
    autoAcceptPermissions: false,
  },
  {
    id: 'agent-5',
    title: 'Optimize database queries',
    status: 'working',
    prompt: 'Review and optimize slow database queries in the user service',
    output: [
      '🔍 Analyzing database queries...',
      '📊 Found 15 queries in src/services/userService.ts',
      '⚠️  Query on line 45 has N+1 problem',
      '⚠️  Query on line 78 missing index',
      '✏️  Refactoring query with joins...',
    ],
    createdAt: new Date(Date.now() - 180000),
    updatedAt: new Date(Date.now() - 1000),
    workDir: '/Users/demo/backend',
    worktreeName: 'optimize-queries',
    agentType: 'planning',
    autoAcceptPermissions: false,
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
  output: ['Mock output line 1', 'Mock output line 2'],
  createdAt: new Date(),
  updatedAt: new Date(),
  workDir: '/Users/demo/project',
  agentType: 'normal',
  autoAcceptPermissions: false,
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
