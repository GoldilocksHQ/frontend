import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export interface ChatResponse {
  content: string;
  role: string;
}

export const modelOptions = [
  { value: "o1-mini", label: "GPT-o1 Mini", provider: "OpenAI" },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  { value: 'gpt-4', label: 'GPT-4', provider: 'OpenAI' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI' },
]

export class AIModel {
  private selectedModel: string;
  private selectedTools: Set<string>;

  constructor(selectedModel: string, selectedTools: Set<string> = new Set()) {
    this.selectedModel = selectedModel;
    this.selectedTools = selectedTools;
  }

  selectModel(model: string) {
    this.selectedModel = model;
  }

  setTools(tools: Set<string>) {
    this.selectedTools = tools;
  }

  async chat(messages: Array<ChatCompletionMessageParam>): Promise<ChatResponse> {
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model: this.selectedModel,
          selectedTools: Array.from(this.selectedTools)
        }),
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