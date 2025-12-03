import Anthropic from '@anthropic-ai/sdk';
import { debug } from './logger';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateTitle(prompt: string): Promise<string> {
  try {
    debug('Generating title for prompt:', prompt.slice(0, 100));

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: `Extract a short, descriptive title (max 60 characters) for this task. Return ONLY the title, nothing else:\n\n${prompt}`
      }]
    });

    const text = message.content[0]?.type === 'text' ? message.content[0].text : '';
    const title = text.trim().slice(0, 60);

    debug('Generated title:', title);
    return title || 'Untitled Task';
  } catch (error) {
    debug('Error generating title:', error);
    const fallback = prompt.split('\n')[0].slice(0, 60);
    return fallback || 'Untitled Task';
  }
}
