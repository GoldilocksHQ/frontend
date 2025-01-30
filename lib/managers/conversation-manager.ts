import { Manager } from "../core/base-manager";
import { 
  Thread, 
  ThreadStatus, 
  MessageRole, 
  InteractionType, 
  Message,
  Task,
  TaskStatus,
  Plan,
  Interaction,
  AgentToolCall
} from "../core/thread";
import { Agent, AgentManager } from "./agent-manager";
import { ChainManager, ChainType } from "./chain-manager";
import { ErrorManager, ErrorSeverity } from "./error-manager";
import { ManagerStatus, PlanResult } from "../types";
import { useThreadStore } from "../stores/thread-store";

/**
 * ConversationManager orchestrates the conversation flow and manages threads.
 * It coordinates between agents and chains, recording all interactions.
 * 
 * Key responsibilities:
 * - Creates and manages threads
 * - Coordinates agent interactions
 * - Records all interactions in threads
 * - Delegates chain execution to ChainManager
 * - Routes messages between agents
 */
export class ConversationManager extends Manager {
  private static instance: ConversationManager | null = null;
  private errorManager: ErrorManager;
  private agentManager: AgentManager;
  private chainManager: ChainManager;
  private threads: Map<string, Thread> = new Map();

  private constructor() {
    super({ name: 'ConversationManager' });
    this.errorManager = ErrorManager.getInstance();
    this.agentManager = AgentManager.getInstance();
    this.chainManager = ChainManager.getInstance();
  }

  static getInstance(): ConversationManager {
    if (!ConversationManager.instance) {
      ConversationManager.instance = new ConversationManager();
    }
    return ConversationManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      this.setStatus(ManagerStatus.INITIALIZING);
      await this.agentManager.initialize();
      await this.chainManager.initialize();

      // Hydrate threads from store
      const storedThreads = useThreadStore.getState().threads;
      for (const [id, thread] of storedThreads) {
        const rehydratedThread = this.rehydrateThread(thread);
        this.threads.set(id, rehydratedThread);
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

  private rehydrateThread(thread: Thread): Thread {
    // Create a new Thread instance with the base properties
    const rehydratedThread = new Thread(
      thread.id,
      thread.initiatingAgentId,
      thread.metadata
    );
    
    // Restore thread state
    rehydratedThread.status = thread.status || ThreadStatus.ACTIVE;
    rehydratedThread.error = thread.error;
    rehydratedThread.lastErrorAt = thread.lastErrorAt;
    rehydratedThread.activeAgentId = thread.activeAgentId;
    
    // Initialize arrays
    rehydratedThread.interactions = [];
    rehydratedThread.messages = [];
    rehydratedThread.tasks = [];
    rehydratedThread.plans = [];
    rehydratedThread.judgements = [];
    
    // Add each interaction using the proper method to maintain categorization
    thread.interactions?.forEach(interaction => {
      rehydratedThread.addInteraction(interaction);
    });
    
    return rehydratedThread;
  }

  async createThread(initiatingAgentId: string): Promise<string> {
    try {
      const threadId = crypto.randomUUID() as string;
      const thread = new Thread(threadId, initiatingAgentId);
      this.threads.set(threadId, thread);
      useThreadStore.getState().addThread(thread);
      return threadId;
    } catch (error) {
      this.errorManager.logError(error as Error, {
        source: this.name,
        severity: ErrorSeverity.HIGH
      });
      throw error;
    }
  }

  async handleUserMessage(targetAgentId: string, threadId: string, content: string): Promise<void> {
    const thread = this.getThread(threadId);
      if (!thread) {
        throw new Error(`Thread not found: ${threadId}`);
      }

    try {
      // Record user message
      const userMessage: Message = {
        id: crypto.randomUUID() as string,
        threadId,
        type: InteractionType.MESSAGE,
        role: MessageRole.USER,
        content,
        targetAgentId: targetAgentId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      thread.addInteraction(userMessage);

      // Get target agent
      const targetAgent = this.agentManager.getAgent(targetAgentId);
      if (!targetAgent) {
        throw new Error('No agent assigned to target');
      }

      // Get target agent's chain
      if (!targetAgent.chainId) {
        throw new Error('No chain ID assigned to agent');
      }

      const chainConfig = this.chainManager.getChain(targetAgent.chainId);
      if (!chainConfig) {
        throw new Error('Chain not found');
      }

      // Create input based on chain type
      let input: Record<string, unknown>;
      if (chainConfig.type === ChainType.CONVERSATION) {
        input = { content: content };
      }else if (chainConfig.type === ChainType.TASK_PLANNING) {
        input = { content: content };
      } else if (chainConfig.type === ChainType.TASK_EXECUTION) {
        const availableTools = targetAgent.toolIds?.map(toolId => this.agentManager.getTool(toolId));
        input = {
          task: content,
          available_tools: availableTools
        };
      } else if (chainConfig.type === ChainType.JUDGEMENT) {
        input = {
          requirement: content,
          response: content
        };
      } else {
        throw new Error('Invalid chain type');
      }

      // Execute chain
      const result = await this.chainManager.executeChain(targetAgent.chainId, input);

      // Handle chain result
      if (result.success && result.result) {
        if (typeof result.result === 'object' && 'execution' in result.result) {
          // If the result is a tool call, execute it
          const toolCallResult = await this.executeToolCall(result.result as AgentToolCall, targetAgent);

          // Record the tool call result
          const toolCallResultMessage: Message = {
            id: crypto.randomUUID() as string,
            threadId,
            type: InteractionType.MESSAGE,
            role: MessageRole.ASSISTANT,
            content: JSON.stringify(toolCallResult),
            sourceAgentId: targetAgent.id,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          thread.addInteraction(toolCallResultMessage);

          console.log(toolCallResult);
        } else if (this.isTaskList(result.result)) {
          // If the result is a task list, record it as a plan
          const plan = await this.constructPlan(result.result as PlanResult, threadId, targetAgent);
          thread.addInteraction(plan);
          await this.executePlan(plan);
    }
        // If it's a regular response, record it as a message
        else {
          const agentMessage: Message = {
            id: crypto.randomUUID() as string,
          threadId,
          type: InteractionType.MESSAGE,
          role: MessageRole.ASSISTANT,
          content: JSON.stringify(result.result),
          sourceAgentId: targetAgent.id,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
          thread.addInteraction(agentMessage);
      }
      } else {
        thread.updateStatus(ThreadStatus.FAILED, result.error);
      }

    } catch (error) {
      thread.updateStatus(ThreadStatus.FAILED, error instanceof Error ? error.message : String(error));
      this.errorManager.logError(error as Error, {
        source: this.name,
        severity: ErrorSeverity.HIGH,
        metadata: { threadId }
      });
      throw error;
    }
  }

  private async executeToolCall(toolCall: AgentToolCall, agent: Agent): Promise<unknown> {
    const availableTools = agent.toolIds?.map(toolId => this.agentManager.getTool(toolId));
    const tool = availableTools?.find(tool => tool?.name === toolCall.execution.connectorName);

    if (!tool) {
      throw new Error(`Tool not found: ${toolCall.execution.connectorName}`);
    }
    const executor = this.agentManager.getToolExecutor(tool.id);
    if (!executor) {
      throw new Error(`Executor not found: ${tool.id}`);
    }
    return await executor(toolCall.execution.functionName, toolCall.execution.parameters);
  }

  private async constructPlan(result: PlanResult, threadId: string, agent: Agent): Promise<Plan> {
    const plan: Plan = {
      id: crypto.randomUUID() as string,
      threadId,
      type: InteractionType.PLAN,
      goal: result.goal,
      reasoning: result.reasoning,
      taskIds: [],
      completedTaskIds: [],
      sourceAgentId: agent.id,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    for (const taskInfo of result.tasks) {
      const task: Task = {
        id: crypto.randomUUID() as string,
        threadId,
        type: InteractionType.TASK,
        instruction: taskInfo.instruction,
        status: TaskStatus.PENDING,
        sourceAgentId: agent.id,
        targetAgentId: taskInfo.requiredAgent,
        dependencies: taskInfo.dependencies.map(id => String(id)),  
        planId: plan.id,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      plan.taskIds.push(task.id);
    }

    return plan;
  }


  private async executePlan(plan: Plan): Promise<void> {
    // Record each task from the plan
    for (const taskId of plan.taskIds) {
      const task = this.threads.get(plan.threadId)?.getInteraction(taskId) as Task;
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }
      task.status = TaskStatus.IN_PROGRESS;

      if (!task.targetAgentId) {
        throw new Error('No target agent ID assigned to task');
      }

      const agent = this.agentManager.getAgent(task.targetAgentId);
      if (!agent) {
        throw new Error('No agent assigned to task');
      }

      // Get agent's chain
      if (!agent.chainId) {
        throw new Error('No chain ID assigned to agent');
      }

      const chainConfig = this.chainManager.getChain(agent.chainId);
      if (!chainConfig) {
        throw new Error('Chain not found');
      }

      // Execute chain
      const result = await this.chainManager.executeChain(agent.chainId, {
        message: task.instruction,
        thread_history: this.threads.get(plan.threadId)?.messages
      });

      if (result.success && result.result) {
        task.status = TaskStatus.COMPLETED;
        task.result = result.result;
      } else {
        task.status = TaskStatus.FAILED;
        task.result = result.error;
      }
    }
  } 

  private isTaskList(result: unknown): result is PlanResult {
    const taskList = result as {
      goal: unknown;
      reasoning: unknown;
      tasks: Array<{
        step: unknown;
        instruction: unknown;
        tools?: unknown;
        dependencies: unknown;
        requiredAgent: unknown;
        reasoning: unknown;
      }>
    };

    return (
      taskList &&
      typeof taskList.goal === 'string' &&
      typeof taskList.reasoning === 'string' &&
      Array.isArray(taskList.tasks) &&
      taskList.tasks.every(task =>
        typeof task.step === 'number' &&
        typeof task.instruction === 'string' &&
        (task.tools === undefined || Array.isArray(task.tools)) &&
        Array.isArray(task.dependencies) &&
        task.dependencies.every(d => typeof d === 'number') &&
        typeof task.requiredAgent === 'string' &&
        typeof task.reasoning === 'string'
      )
    );
  }

  getThread(id: string): Thread | undefined {
    return this.threads.get(id);
  }

  getThreads(): Thread[] {
    return Array.from(this.threads.values());
  }

  getThreadsByAgent(agentId: string): Thread[] {
    return Array.from(this.threads.values()).filter(thread => thread.getInteractionsByAgent(agentId).length > 0);
  }

  getInteractionsByAgent(agentId: string): Interaction[] {
    return Array.from(this.threads.values()).flatMap(thread => thread.getInteractionsByAgent(agentId));
  }

  async deleteThread(id: string): Promise<void> {
    const thread = this.threads.get(id);
    if (!thread) {
      throw new Error(`Thread not found: ${id}`);
    }

    this.threads.delete(id);
    useThreadStore.getState().deleteThread(id);
    this.logger.info(`Thread deleted: ${id}`);
  }
} 