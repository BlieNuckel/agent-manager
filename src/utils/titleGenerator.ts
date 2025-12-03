import { debug } from './logger';
import { execSync } from 'child_process';

export async function generateTitle(prompt: string): Promise<string> {
  try {
    const truncatedPrompt = prompt.slice(0, 500);
    debug('generateTitle: Starting title generation');
    debug('generateTitle: Input prompt (first 200 chars):', prompt.slice(0, 200));

    const taskPrompt = `Generate a concise, descriptive title for this task or request. The title should be 3-8 words that capture the main action or goal. Do not use quotes, punctuation at the end, or explanatory text. Just output the title.

Task: ${truncatedPrompt}`;

    const escapedPrompt = taskPrompt.replace(/'/g, "'\\''").replace(/\n/g, '\\n');

    const command = `claude task --model haiku --prompt '${escapedPrompt}'`;

    debug('generateTitle: Executing Claude Code task with haiku model');

    const result = execSync(command, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000
    });

    debug('generateTitle: Task completed');
    debug('generateTitle: Raw result:', result);

    const cleanedTitle = result
      .trim()
      .replace(/^["'\[\(\{]+|["'\]\)\}]+$/g, '')
      .replace(/\n.*/g, '')
      .slice(0, 60);

    debug('generateTitle: Cleaned title:', cleanedTitle);

    if (!cleanedTitle || cleanedTitle.length < 3) {
      debug('generateTitle: Title too short, using fallback');
      const fallback = prompt.split('\n')[0].slice(0, 60).trim();
      debug('generateTitle: Fallback title:', fallback);
      return fallback || 'Untitled Task';
    }

    return cleanedTitle;
  } catch (error) {
    debug('generateTitle: ERROR occurred:', error);
    debug('generateTitle: Error details:', JSON.stringify(error, null, 2));
    const fallback = prompt.split('\n')[0].slice(0, 60).trim();
    debug('generateTitle: Using fallback due to error:', fallback);
    return fallback || 'Untitled Task';
  }
}
