import { Manager } from "../core/base-manager";
import { ErrorManager, ErrorSeverity } from "./error-manager";
import { ManagerStatus } from "../core/base-manager";
import { ChainManager, ChainConfig, ChainType, ModelConfig, Chain } from "./chain-manager";
import { ToolDefinition, ToolManager } from "./tool-manager";
import { useAgentStore } from "../stores/agent-store";

export interface AgentConfig {
  name: string;
  description: string;
  chainType: ChainType;
  modelName: string;
  toolIds: string[];
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  chainId: string;
  toolIds: string[];
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export type AgentJSON = {
  id: string;
  name: string;
  description: string;
  chainId: string;
  toolIds: string[];
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

/**
 * AgentManager handles the lifecycle of AI agents.
 * Dependencies:
 * - Uses ChainManager to get chains that power agent behavior
 * - Uses ToolManager to get tools that agents can use
 * - Used by ConversationManager to handle agent interactions
 * 
 * Key responsibilities:
 * - Agent creation and configuration
 * - Agent state management
 * - Tool and chain validation for agents
 */
export class AgentManager extends Manager {
  private static instance: AgentManager | null = null;
  private errorManager: ErrorManager;
  private chainManager: ChainManager;
  private toolManager: ToolManager;
  private agents: Map<string, Agent> = new Map();

  private constructor(toolManager?: ToolManager) {
    super({ name: 'AgentManager' });
    this.errorManager = ErrorManager.getInstance();
    this.chainManager = ChainManager.getInstance();
    this.toolManager = toolManager ? toolManager : ToolManager.getInstance();
  }

  static getInstance(toolManager?: ToolManager): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager(toolManager);
    }
    return AgentManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      this.setStatus(ManagerStatus.INITIALIZING);
      // Initialize dependencies
      await this.chainManager.initialize();
      await this.toolManager.initialize();

      // Hydrate agents from store
      const storedAgents = useAgentStore.getState().agents;
      for (const agent of storedAgents) {
        this.agents.set(agent.id, agent);
      }
      
      this.setStatus(ManagerStatus.READY);
    } catch (error) {
      this.errorManager.logError(error as Error, {
        source: this.name,
        severity: ErrorSeverity.HIGH
      });
      this.handleError(error as Error, { context: 'initialization' });
    }
  }

  async createAgent(config: AgentConfig): Promise<Agent> {
    try {
      // Validate chain if provided
      const model = this.chainManager.getAvailableModels().find(m => m.name === config.modelName);
      if (!model) {
        throw new Error(`Model not found: ${config.modelName}`);
      }

      // Validate tools if provided
      if (config.toolIds?.length) {
        for (const toolId of config.toolIds) {
          if (!this.toolManager.getTool(toolId)) {
            throw new Error(`Tool not found: ${toolId}`);
          }
        }
      }

      const chain = this.chainManager.createChain({
        type: config.chainType,
        model: model,
        memory: true,
        tools: config.toolIds
      });


      const agentId = crypto.randomUUID();
      const agent: Agent = {
        id: agentId,
        name: config.name,
        description: config.description,
        chainId: chain.id,
        toolIds: config.toolIds,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      this.agents.set(agentId, agent);
      useAgentStore.getState().addAgent(agent);
      this.logger.info(`Agent created: ${config.name} (${agentId})`);
      return agent;
    } catch (error) {
      this.errorManager.logError(error as Error, {
        source: this.name,
        severity: ErrorSeverity.HIGH,
        metadata: { agentName: config.name }
      });
      throw error;
    }
  }

  fromJSON(agent: AgentJSON): Agent {
    return agent as Agent;
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  async updateAgent(agentId: string, newAgentConfig?: AgentConfig, newChainConfig?: ChainConfig): Promise<Agent> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Validate chain if being updated
    if (newChainConfig) {
      this.updateChain(agent.chainId, newChainConfig);
    }
        
    // Validate tools if being updated
    if (newAgentConfig && newAgentConfig.toolIds?.length) {
      for (const toolId of newAgentConfig.toolIds) {
        if (!this.toolManager.getTool(toolId)) {
          throw new Error(`Tool not found: ${toolId}`);
        }
      }
    }

    const updatedAgent: Agent = {
      ...agent,
      ...newAgentConfig,
      updatedAt: Date.now()
    };

    this.agents.set(agentId, updatedAgent);
    useAgentStore.getState().updateAgent(updatedAgent);
    this.logger.info(`Agent updated: ${updatedAgent.name} (${agentId})`);
    return updatedAgent;
  }

  async deleteAgent(id: string): Promise<void> {
    const agent = this.agents.get(id);
    if (!agent) {
      throw new Error(`Agent not found: ${id}`);
    }

    this.agents.delete(id);
    this.chainManager.destroyChain(agent.chainId);
    useAgentStore.getState().removeAgent(id);
    this.logger.info(`Agent deleted: ${agent.name} (${id})`);
      }

  validateAgent(agent: Agent): void {
    if (!agent.name?.trim()) {
      throw new Error('Agent name is required');
    }
    if (!agent.description?.trim()) {
      throw new Error('Agent description is required');
    }
    if (agent.chainId && !this.chainManager.getChain(agent.chainId)) {
      throw new Error(`Chain not found: ${agent.chainId}`);
    }
    if (agent.toolIds?.length) {
      for (const toolId of agent.toolIds) {
        if (!this.toolManager.getTool(toolId)) {
          throw new Error(`Tool not found: ${toolId}`);
    }
  }
    }
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  // Tool Management
  getAllAvailableTools(): ToolDefinition[] {
    return this.toolManager.getAllAvailableTools();
  }

  getTool(id: string): ToolDefinition | undefined {
    return this.toolManager.getTool(id);
  }

  getToolExecutor(id: string): (functionName: string, params: Record<string, unknown>) => Promise<unknown> | undefined {
    return this.toolManager.getExecutor(id);
  }

  // Chain Management
  loadChain(chain: Omit<Chain, 'chainInstance'>): void {
    this.chainManager.loadPersistedChain(chain);
  }

  getChains(): Chain[] {
    return this.chainManager.getChains();
  }

  getChain(id: string): Chain | undefined {
    return this.chainManager.getChain(id);
  }

  updateChain(chainId: string, newChainConfig: ChainConfig): Chain | undefined {
    return this.chainManager.updateChain(chainId, newChainConfig);
  }

  getAvailableModels(): ModelConfig[] {
    return this.chainManager.getAvailableModels();
  }

  getAvailableChainTypes(): ChainType[] {
    return this.chainManager.getAvailableChainTypes();
  }
} 