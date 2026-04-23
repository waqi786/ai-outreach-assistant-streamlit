import Anthropic from '@anthropic-ai/sdk';
import type { ClaudeMessage } from '../types';

export class ClaudeService {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateResponse({
    systemPrompt,
    history,
    userInput,
  }: {
    systemPrompt: string;
    history: ClaudeMessage[];
    userInput: string;
  }): Promise<string> {
    const response = await this.client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...history.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        {
          role: 'user',
          content: userInput,
        },
      ],
    });

    const text = response.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('\n')
      .trim();

    if (!text) {
      throw new Error('Claude returned an empty response.');
    }

    return text;
  }
}
