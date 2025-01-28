import { BaseChain } from "langchain/chains";
import { ChatOpenAI } from "@langchain/openai";
import { BufferMemory } from "langchain/memory";
import { ChainType, ChainConfig } from "../types";
import { TaskPlannerChain } from "./chains/task-planner-chain";
import { TaskExecutorChain } from "./chains/task-executor-chain";
import { ConversationChain } from "./chains/conversation-chain";
import { JudgementChain } from "./chains/judgement-chain";
import { ToolRegistry } from "../tools/tool-registry";

const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is not set');
}

export class ChainFactory {
  private static instance: ChainFactory | null = null;
  private toolRegistry: ToolRegistry;
  private logger: Console = console;

  private constructor() {
    this.toolRegistry = ToolRegistry.getInstance();
  }

  static getInstance(): ChainFactory {
    if (!ChainFactory.instance) {
      ChainFactory.instance = new ChainFactory();
    }
    return ChainFactory.instance;
  }

  createChain(config: ChainConfig): BaseChain {
    try {
      const model = this.createModel(config);
      const memory = config.memory ? new BufferMemory() : undefined;
      const tools = config.tools.map(toolName => this.toolRegistry.getTool(toolName));

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
      apiKey: OPENAI_API_KEY,
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
} 