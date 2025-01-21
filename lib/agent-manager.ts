import { APIKeyManager } from "./api-key-manager";

export interface Message {
  content: string;
  role: string;
}

export interface ModelOption {
  value: string;
  label: string;
  provider: string;
}

export const modelOptions: ModelOption[] = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI' },
  { value: 'gpt-4', label: 'GPT-4', provider: 'OpenAI' },
  { value: "o1-mini", label: "GPT-o1 Mini", provider: "OpenAI" },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'OpenAI' },
]

export class AgentManager {
  private static instance: AgentManager | null = null;
  private apiKeyManager: APIKeyManager | null = null;
  private headers: HeadersInit | undefined;
  public agents: Agent[] = [];

  static async getInstance(): Promise<AgentManager> {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
      await AgentManager.instance.initialize();
    }
    return AgentManager.instance;
  }

  private async initialize() {
    this.apiKeyManager = await APIKeyManager.getInstance();
    this.headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKeyManager?.getKey()
    };
  }

  async createAgent(agent: Agent) {
    this.agents.push(agent);
  }

  async deleteAgent(agent: Agent) {
    this.agents = this.agents.filter(a => a !== agent);
  }

  async chat(agent: Agent): Promise<Message> {
    try {
      if (!this.apiKeyManager) {
        await this.initialize();
      }

      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          model: agent.selectedModel.value,
          messages: agent.messages,
          systemPrompt: agent.systemPrompt,
          selectedTools: Array.from(agent.selectedTools),
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

export class Agent {
  public agentName: string;
  public agentDescription: string;
  public selectedModel: ModelOption;
  public systemPrompt: string;
  public selectedTools: Set<string>;
  public messages: Array<{role: string, content: string}>;
  
  constructor(agentName: string, agentDescription: string, selectedModel: ModelOption, systemPrompt: string, selectedTools: Set<string>) {
    this.agentName = agentName;
    this.agentDescription = agentDescription;
    this.selectedModel = selectedModel;
    this.systemPrompt = systemPrompt;
    this.selectedTools = selectedTools;
    this.messages = [];
  }

  editName(name: string) {
    this.agentName = name;
  }

  editDescription(description: string) {
    this.agentDescription = description;
  }

  selectModel(model: ModelOption) {
    this.selectedModel = model;
  }

  setTools(tools: Set<string>) {
    this.selectedTools = tools;
  }

  setSystemPrompt(systemPrompt: string) {
    this.systemPrompt = systemPrompt;
  }

  addMessage(message: {role: string, content: string}) {
    this.messages.push(message);
  }
}