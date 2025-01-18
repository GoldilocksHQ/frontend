import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export interface ChatResponse {
  content: string;
  role: string;
}

export const modelOptions = [
  { value: "o1-mini", label: "o1-mini", provider: "OpenAI" },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  { value: 'gpt-4', label: 'GPT-4', provider: 'OpenAI' },
]

export class AIModel {
  private selectedModel: string;

  constructor(selectedModel: string) {
    this.selectedModel = selectedModel;
  }

  selectModel(model: string) {
    this.selectedModel = model;
  }

  async chat(messages: Array<ChatCompletionMessageParam>): Promise<ChatResponse> {
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages, model: this.selectedModel}),
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