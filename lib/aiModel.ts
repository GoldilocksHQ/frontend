import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export interface ChatResponse {
  content: string;
  role: string;
}

export class AIModel {
  async chat(messages: Array<ChatCompletionMessageParam>, model: string = "o1-mini"): Promise<ChatResponse> {
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages, model }),
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      return await response.json();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Chat request failed');
    }
  }
}