import { Manager } from "../core/base-manager";
import { ErrorManager, ErrorSeverity } from "./error-manager";
import { ManagerStatus } from "../core/base-manager";
import { AgentManager } from "./agent-manager";
import { ChainManager } from "./chain-manager";
import {
  Thread,
  Interaction,
  MessageRole,
  Message,
  AgentPlan,
  AgentTask,
  AgentJudgement,
  AgentToolCall,
  ToolCall,
  Plan,
  Judgement,
  Task,
  TaskStatus,
  InteractionType,
} from "../core/thread";
import { ThreadStatus } from "../core/thread";
import { ChainConfig, ChainExecutionResult, ChainType } from "./chain-manager";
import { Agent } from "./agent-manager";

export class OrchestrationManager extends Manager {
  private static instance: OrchestrationManager | null = null;
  private errorManager: ErrorManager;
  private agentManager: AgentManager;
  private chainManager: ChainManager;

  private constructor() {
    super({ name: "OrchestrationManager" });
    this.errorManager = ErrorManager.getInstance();
    this.agentManager = AgentManager.getInstance();
    this.chainManager = ChainManager.getInstance();
  }

  static getInstance(): OrchestrationManager {
    if (!OrchestrationManager.instance) {
      OrchestrationManager.instance = new OrchestrationManager();
    }
    return OrchestrationManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      this.setStatus(ManagerStatus.INITIALIZING);
      await this.agentManager.initialize();
      await this.chainManager.initialize();
      this.setStatus(ManagerStatus.READY);
    } catch (error) {
      this.errorManager.logError(error as Error, {
        source: this.name,
        severity: ErrorSeverity.HIGH,
      });
    }
  }

  async orchestrateThread(
    thread: Thread,
    content: string,
    initiatingAgentId: string
  ): Promise<void> {
    try {
      // Record user message
      const userMessage = this.constructMessage(
        thread,
        MessageRole.USER,
        content,
        initiatingAgentId
      );
      thread.addInteraction(userMessage);

      // Get target agent
      const targetAgent = this.agentManager.getAgent(initiatingAgentId);
      if (!targetAgent) {
        throw new Error("No agent assigned to target");
      }

      // Get target agent's chain
      if (!targetAgent.chainId) {
        throw new Error("No chain ID assigned to agent");
      }

      const chainConfig = this.chainManager.getChain(targetAgent.chainId);
      if (!chainConfig) {
        throw new Error("Chain not found");
      }

      // Create input based on chain type
      const input = this.createChainInput(chainConfig, content, targetAgent);
      if (input instanceof Error) {
        throw input;
      }

      // Execute chain
      const result = await this.chainManager.executeChain(
        targetAgent.chainId,
        input
      );

      // Handle chain result
      if (result.success && result.result) {
        const output = await this.handleChainResult(
          result,
          thread,
          true,
          targetAgent
        );
        thread.addInteraction(output);
      } else {
        thread.updateStatus(ThreadStatus.FAILED, result.error);
      }

      // Update thread status
      thread.updateStatus(ThreadStatus.COMPLETED);
    } catch (error) {
      thread.updateStatus(
        ThreadStatus.FAILED,
        error instanceof Error ? error.message : String(error)
      );
      this.errorManager.logError(error as Error, {
        source: this.name,
        severity: ErrorSeverity.HIGH,
        metadata: { threadId: thread.id },
      });
      throw error;
    }
  }

  createChainInput(
    chainConfig: ChainConfig,
    content: string,
    targetAgent: Agent
  ): Record<string, unknown> | Error {
    if (chainConfig.type === ChainType.CONVERSATION) {
      return { content: content };
    } else if (chainConfig.type === ChainType.TASK_PLANNING) {
      return { content: content };
    } else if (chainConfig.type === ChainType.TASK_EXECUTION) {
      const availableTools = targetAgent.toolIds?.map((toolId) =>
        this.agentManager.getTool(toolId)
      );
      return {
        task: content,
        available_tools: availableTools,
      };
    } else if (chainConfig.type === ChainType.JUDGEMENT) {
      const splitChars = ["\n", "?"];
      for (const char of splitChars) {
        const lines = content.split(char);
        if (lines.length > 1) {
          return {
            requirement: lines[0].replace('"', "-"),
            response: lines.slice(1).join("\n").replace('"', "-"),
          };
        }
      }
      return {
        requirement: content,
        response: "",
      };
    } else {
      return new Error("Invalid chain type");
    }
  }

  /**
   * Handle tool call, The agent that is responding is considered the source agent this point forward.
   * If the agent is responding to a user, the target agent should be left undefined.
   * If the agent is responding to another agent, the target agent should be the agent the responding agent is replying to.
   */
  private async handleChainResult(
    result: ChainExecutionResult,
    thread: Thread,
    toUser: boolean,
    sourceAgent: Agent,
    targetAgent?: Agent
  ): Promise<Interaction> {
    const resultType = this.determineResultType(result);
    if (resultType instanceof Error) {
      throw resultType;
    }

    let output: unknown;
    if (resultType === InteractionType.TOOL_CALL) {
      // If the result is a tool call, execute the tool call then store the result
      const agentToolCall = result.result as AgentToolCall;
      const toolCallResult = await this.executeToolCall(
        agentToolCall,
        sourceAgent.id
      );
      const toolCall = this.constructToolCallInteraction(
        thread,
        agentToolCall,
        toolCallResult,
        sourceAgent.id
      );
      thread.addInteraction(toolCall);

      // Record the tool call result
      if (toUser) {
        output = this.constructMessage(
          thread,
          MessageRole.ASSISTANT,
          JSON.stringify(toolCallResult, null, 2),
          sourceAgent.id
        );
      } else {
        output = toolCallResult;
      }
      return output as Interaction;
    } else if (resultType === InteractionType.PLAN) {
      // If the result is a task list, record it as a plan
      const plan = this.constructPlan(
        thread,
        result.result as AgentPlan,
        sourceAgent.id
      );
      thread.addInteraction(plan);

      if (toUser) {
        output = this.constructMessage(
          thread,
          MessageRole.ASSISTANT,
          JSON.stringify(plan, null, 2),
          sourceAgent.id
        );
      } else {
        output = plan;
      }
      return output as Interaction;
    } else if (resultType === InteractionType.JUDGEMENT) {
      // If the result is a judgement, record it as a judgement
      const judgement = this.constructJudgement(
        thread,
        result.result as AgentJudgement,
        sourceAgent.id
      );
      thread.addInteraction(judgement);

      if (toUser) {
        output = this.constructMessage(
          thread,
          MessageRole.ASSISTANT,
          JSON.stringify(judgement, null, 2),
          sourceAgent.id
        );
      } else {
        output = judgement;
      }
      return output as Interaction;
    } else if (resultType === InteractionType.MESSAGE) {
      // Record the agent message
      if (toUser) {
        output = this.constructMessage(
          thread,
          MessageRole.ASSISTANT,
          JSON.stringify(result.result, null, 2),
          sourceAgent.id
        );
      } else {
        output = this.constructMessage(
          thread,
          MessageRole.ASSISTANT,
          JSON.stringify(result.result, null, 2),
          sourceAgent.id,
          targetAgent?.id
        );
      }
      return output as Interaction;
    } else {
      throw new Error("Invalid chain result");
    }
  }

  private determineResultType(
    result: ChainExecutionResult
  ): InteractionType | Error {
    if (typeof result.result === "object" && "execution" in result.result) {
      return InteractionType.TOOL_CALL;
    } else if (typeof result.result === "object" && "goal" in result.result) {
      return InteractionType.PLAN;
    } else if (
      typeof result.result === "object" &&
      "satisfied" in result.result
    ) {
      return InteractionType.JUDGEMENT;
    } else if (typeof result.result === "string") {
      return InteractionType.MESSAGE;
    } else {
      return new Error("Invalid chain result");
    }
  }

  private constructPlan(
    thread: Thread,
    result: AgentPlan,
    agentId: string
  ): Plan {
    const plan: Plan = {
      ...thread.createBaseEntity(),
      threadId: thread.id,
      type: InteractionType.PLAN,
      goal: (result as AgentPlan).goal,
      reasoning: (result as AgentPlan).reasoning,
      tasks: [],
      completedTaskIds: [],
      sourceAgentId: agentId,
      targetAgentId: agentId,
    };

    for (const taskInfo of result.tasks) {
      const task: Task = {
        ...thread.createBaseEntity(),
        threadId: thread.id,
        type: InteractionType.TASK,
        instruction: (taskInfo as AgentTask).instruction,
        status: TaskStatus.PENDING,
        targetAgentId: (taskInfo as AgentTask).requiredAgent,
        dependencies: (taskInfo as AgentTask).dependencies.map((id) =>
          String(id)
        ),
        planId: plan.id,
      };
      plan.tasks.push(task);
    }

    return plan;
  }

  // private async executePlan(plan: Plan): Promise<void> {
  //   // Record each task from the plan
  //   for (const taskId of plan.taskIds) {
  //     const task = this.threads.get(plan.threadId)?.getInteraction(taskId) as Task;
  //     if (!task) {
  //       throw new Error(`Task not found: ${taskId}`);
  //     }
  //     task.status = TaskStatus.IN_PROGRESS;

  //     if (!task.targetAgentId) {
  //       throw new Error('No target agent ID assigned to task');
  //     }

  //     const agent = this.agentManager.getAgent(task.targetAgentId);
  //     if (!agent) {
  //       throw new Error('No agent assigned to task');
  //     }

  //     // Get agent's chain
  //     if (!agent.chainId) {
  //       throw new Error('No chain ID assigned to agent');
  //     }

  //     const chainConfig = this.chainManager.getChain(agent.chainId);
  //     if (!chainConfig) {
  //       throw new Error('Chain not found');
  //     }

  //     // Execute chain
  //     const result = await this.chainManager.executeChain(agent.chainId, {
  //       message: task.instruction,
  //       thread_history: this.threads.get(plan.threadId)?.messages
  //     });

  //     if (result.success && result.result) {
  //       task.status = TaskStatus.COMPLETED;
  //       task.result = result.result;
  //     } else {
  //       task.status = TaskStatus.FAILED;
  //       task.result = result.error;
  //     }
  //   }
  // }

  private async executeToolCall(
    toolCall: AgentToolCall,
    agentId: string
  ): Promise<unknown> {
    const agent = this.agentManager.getAgent(agentId);
    if (!agent) {
      throw new Error("No agent assigned to tool call");
    }
    const availableTools = agent.toolIds?.map((toolId) =>
      this.agentManager.getTool(toolId)
    );
    const tool = availableTools?.find(
      (tool) => tool?.name === toolCall.execution.connectorName
    );

    if (!tool) {
      throw new Error(`Tool not found: ${toolCall.execution.connectorName}`);
    }
    const executor = this.agentManager.getToolExecutor(tool.id);
    if (!executor) {
      throw new Error(`Executor not found: ${tool.id}`);
    }
    return await executor(
      toolCall.execution.functionName,
      toolCall.execution.parameters
    );
  }

  constructToolCallInteraction(
    thread: Thread,
    toolCall: AgentToolCall,
    toolCallResult: unknown,
    agentId: string
  ): ToolCall {
    return {
      ...thread.createBaseEntity(),
      threadId: thread.id,
      type: InteractionType.TOOL_CALL,
      toolName: toolCall.execution.connectorName,
      functionName: toolCall.execution.functionName,
      parameters: toolCall.execution.parameters,
      result: toolCallResult,
      sourceAgentId: agentId,
      targetAgentId: agentId,
    };
  }

  constructJudgement(
    thread: Thread,
    result: AgentJudgement,
    agentId: string
  ): Judgement {
    return {
      ...thread.createBaseEntity(),
      threadId: thread.id,
      type: InteractionType.JUDGEMENT,
      satisfied: result.satisfied,
      score: result.score,
      analysis: result.analysis,
      feedback: result.feedback,
      sourceAgentId: agentId,
      targetAgentId: agentId,
    };
  }

  // Utility functions for storing messages
  constructMessage(
    thread: Thread,
    role: MessageRole.USER | MessageRole.ASSISTANT,
    content: string,
    targetAgentId?: string,
    sourceAgentId?: string
  ): Message {
    return {
      ...thread.createBaseEntity(),
      threadId: thread.id,
      type: InteractionType.MESSAGE,
      role: role,
      content,
      targetAgentId: targetAgentId,
      sourceAgentId: sourceAgentId,
    };
  }
}
