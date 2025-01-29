import { Manager } from "../core/base-manager";
import { ErrorManager, ErrorSeverity } from "./error-manager";
import { ManagerStatus } from "../types";
import { BaseChain } from "langchain/chains";
import { ChatOpenAI } from "@langchain/openai";
import { BufferMemory } from "langchain/memory";
import { ConversationChain } from "../chains/conversation-chain";
import { JudgementChain } from "../chains/judgement-chain";
import { TaskExecutorChain } from "../chains/task-executor-chain";
import { TaskPlannerChain } from "../chains/task-planner-chain";
import { ToolDefinition, ToolManager } from "./tool-manager";
import { useChainStore } from "../stores/chain-store";
import { AgentJudgement, AgentPlan, AgentToolCall} from "../core/thread";
  
export enum ChainType {
  TASK_PLANNING = "task_planning",
  TASK_EXECUTION = "task_execution",
  CONVERSATION = "conversation",
  JUDGEMENT = "judgement"
}

export const models: ModelConfig[] = [
  { name: "gpt-4o-mini", provider: "openai", temperature: 0.7, maxTokens: 1000, contextWindow: 1000 },
  { name: "gpt-4o", provider: "openai", temperature: 0.7, maxTokens: 1000, contextWindow: 1000 },
  { name: "gpt-3.5-turbo", provider: "openai", temperature: 0.7, maxTokens: 1000, contextWindow: 1000 },
  { name: "claude-3-5-sonnet-20240620", provider: "anthropic", temperature: 0.7, maxTokens: 1000, contextWindow: 1000 },
  { name: "claude-3-5-opus-20240620", provider: "anthropic", temperature: 0.7, maxTokens: 1000, contextWindow: 1000 }
]

export interface ChainConfig {
  type: ChainType;
  model: ModelConfig;
  memory: boolean;
  tools?: string[];
}

export type ModelProvider = "local" | "openai" | "anthropic";

export interface ModelConfig {
  name: string;
  provider: ModelProvider;
  temperature?: number;
  maxTokens?: number;
  contextWindow?: number;
}

export interface Chain extends ChainConfig {
  id: string;
  chainInstance?: BaseChain;
  createdAt: number;
  updatedAt: number;
}

export interface ChainExecutionResult {
  success: boolean;
  error?: string;
  result?: string | AgentPlan | AgentJudgement | AgentToolCall | undefined;
  timestamp: number;
  executionTime: number;
  chainId: string;
}

export interface ChainResponse {
  conversationResponse?: string;
  agentPlan?: AgentPlan;
  agentToolCall?: AgentToolCall;
  agentJudgement?: AgentJudgement;
}

/**
 * ChainManager handles LangChain chain operations.
 * Dependencies:
 * - Uses ToolManager to get tools that can be used in chains
 * - Uses ErrorManager for error handling
 * - Chains are used by AgentManager to power agents
 * 
 * Key responsibilities:
 * - Chain creation and configuration
 * - Chain execution with proper tool integration
 * - Memory management for chains
 */
export class ChainManager extends Manager {
  private static instance: ChainManager | null = null;
  private toolManager: ToolManager;
  private errorManager: ErrorManager;
  private chains: Map<string, Chain>;

  private constructor() {
    super({ name: 'ChainManager' });
    this.toolManager = ToolManager.getInstance();
    this.errorManager = ErrorManager.getInstance();
    this.chains = new Map();
  }

  static getInstance(): ChainManager {
    if (!ChainManager.instance) {
      ChainManager.instance = new ChainManager();
    }
    return ChainManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      this.setStatus(ManagerStatus.INITIALIZING);
      
    // Hydrate chains from store
    const storedChains = useChainStore.getState().chains;
    for (const [id, chain] of storedChains) {
      if (!this.chains.has(id)) {
        this.chains.set(id, {
          ...chain,
          chainInstance: this.createChainInstance(chain)
        });
      }
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

  async loadPersistedChain(chain: Omit<Chain, 'chainInstance'>): Promise<void> {
    const chainInstance = this.createChainInstance(chain);
    this.chains.set(chain.id, {
      ...chain,
      chainInstance: chainInstance
    });
  }

  createChain(config: ChainConfig): Chain {
    const chainInstance = this.createChainInstance(config);
    const chain: Chain = {
      id: crypto.randomUUID() as string,
      chainInstance: chainInstance,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      type: config.type,
      model: config.model,
      memory: config.memory,
      tools: config.tools
    };
    this.chains.set(chain.id, chain);
    useChainStore.getState().addChain(chain);
    return chain;
  }

  private createChainInstance(config: ChainConfig): BaseChain {
    try {
      const model = this.createModel(config);
      const memory = config.memory ? new BufferMemory() : undefined;
      const tools = config.tools ? config.tools.map(id => this.toolManager.getTool(id) as ToolDefinition) : [];

      switch (config.type) {
        case ChainType.TASK_PLANNING:
          return new TaskPlannerChain({ model, memory, tools });

        case ChainType.TASK_EXECUTION:
          return new TaskExecutorChain({ model, memory });

        case ChainType.CONVERSATION:
          return new ConversationChain({ model, memory });

        case ChainType.JUDGEMENT:
          return new JudgementChain({ model });

        default:
          throw new Error(`Unknown chain type: ${config.type}`);
      }
    } catch (error) {
      this.logger.error('Error creating chain:', error);
      throw new Error(`Failed to create chain: ${error}`);
    }
  }

  private createModel(config: ChainConfig): ChatOpenAI {
    return new ChatOpenAI({
      modelName: config.model.name,
      temperature: 0.7,
      maxTokens: 1000,
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY
    });
  }

  public getChainType(mode: string): ChainType {
    switch (mode) {
      case "task_planning":
        return ChainType.TASK_PLANNING;
      case "task_execution":
        return ChainType.TASK_EXECUTION;
      case "conversation":
        return ChainType.CONVERSATION;
      case "judgement":
        return ChainType.JUDGEMENT;
      default:
        throw new Error(`Unknown mode: ${mode}`);
    }
  }

  async executeChain(chainId: string, input: Record<string, unknown>): Promise<ChainExecutionResult> {
    const startTime = Date.now();
    try {
      const chain = this.chains.get(chainId);
      if (!chain) {
        throw new Error(`Chain not found: ${chainId}`);
      }

      if (!chain.chainInstance) {
        throw new Error(`Chain instance not found: ${chainId}`);
      }

      // Execute the chain and handle response based on chain type
      const result = await chain.chainInstance.invoke({input}) as ChainResponse;
      let response: string | AgentPlan | AgentJudgement | AgentToolCall;

      switch (chain.type) {
        case ChainType.CONVERSATION:
          if (!result.conversationResponse) {
            throw new Error('Conversation chain did not return a response');
          }
          response = result.conversationResponse;
          break;

        case ChainType.TASK_PLANNING:
          if (!result.agentPlan) {
            throw new Error('Task planning chain did not return a plan');
          }
          response = result.agentPlan;
          break;

        case ChainType.TASK_EXECUTION:
          if (!result.agentToolCall) {
            throw new Error('Task execution chain did not return a result');
          }
          response = result.agentToolCall;
          break;

        case ChainType.JUDGEMENT:
          if (!result.agentJudgement) {
            throw new Error('Judgement chain did not return a judgement');
          }
          response = result.agentJudgement;
          break;

        default:
          throw new Error(`Unknown chain type: ${chain.type}`);
      }

      return {
        success: true,
        result: response as string | AgentPlan | AgentJudgement | AgentToolCall | undefined,
        timestamp: Date.now(),
        executionTime: Date.now() - startTime,
        chainId: chainId,
      };

    } catch (error) {
      this.errorManager.logError(error as Error, {
        source: this.name,
        severity: ErrorSeverity.HIGH,
        metadata: { chainId, input }
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        chainId: chainId,
        timestamp: Date.now(),
        executionTime: Date.now() - startTime,
      };
    }
  }


  // Pass through Chain Management methods
  getChain(chainId: string): Chain | undefined {
    return this.chains.get(chainId);
  }

  getChains(): Chain[] {
    return Array.from(this.chains.values());
  }

  updateChain(chainId: string, newChainConfig: ChainConfig): Chain | undefined {
    const selectedChain = this.getChain(chainId);
    if (selectedChain) {
      const newChainInstance = this.createChainInstance(newChainConfig);
      const updatedChain : Chain = {
        id: chainId,
        updatedAt: Date.now(),
        chainInstance: newChainInstance,
        createdAt: selectedChain.createdAt,
        type: newChainConfig.type,
        model: newChainConfig.model,
        memory: newChainConfig.memory,
        tools: newChainConfig.tools
      }
      this.chains.set(chainId, updatedChain);
      useChainStore.getState().updateChain(updatedChain);
      return updatedChain;
    }
    return undefined;
  }

  async destroyChain(chainId: string): Promise<void> {
    const chain = this.chains.get(chainId);
    if (chain?.memory) {
      // Clear memory if needed
    }
    useChainStore.getState().removeChain(chainId);
    this.chains.delete(chainId);
  }

  getAvailableModels(): ModelConfig[] {
    return models;
  }

  getAvailableChainTypes(): ChainType[] {
    return Object.values(ChainType);
  }
} 
