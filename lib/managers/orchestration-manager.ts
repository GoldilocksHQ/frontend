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
      this.constructMessage(
        thread,
        MessageRole.USER,
        content,
        initiatingAgentId
      );

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
      const input = this.createChainInput(chainConfig, content);
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

        // If the output is a plan, execute it
        if (output.type === InteractionType.PLAN) {
          const plan = output as Plan;
          await this.executePlan(plan, thread);
        }

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
  ): Record<string, unknown> | Error {
    if (chainConfig.type === ChainType.CONVERSATION) {
      return { content: content };
    } else if (chainConfig.type === ChainType.TASK_PLANNING) {
      return { request: content };
    } else if (chainConfig.type === ChainType.TASK_EXECUTION) {
      return { task: content };
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
   * If to User is false, both the source and target agent needs to be set.
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
    const formattedResult = typeof result.result === 'string' ? 
      this.formatInteractionContent(result.result) : 
      JSON.stringify(result.result, null, 2);

    switch (resultType) {
      case InteractionType.TOOL_CALL:
        const agentToolCall = result.result as AgentToolCall;
        const toolCallResult = await this.executeToolCall(agentToolCall, sourceAgent.id);
        const formattedToolCall = JSON.stringify(toolCallResult, null, 2);
        
        this.constructToolCallInteraction(thread, agentToolCall, toolCallResult, sourceAgent.id);
        
        output = toUser ? 
          this.constructMessage(thread, MessageRole.ASSISTANT, formattedToolCall, sourceAgent.id) :
          toolCallResult;
        break;
  
      case InteractionType.PLAN:
        output = this.constructPlan(thread, result.result as AgentPlan, sourceAgent.id);
        break;
  
      case InteractionType.JUDGEMENT:
        const judgement = this.constructJudgement(
          thread,
          result.result as AgentJudgement,
          sourceAgent.id
        );
        
        output = toUser ?
          this.constructMessage(thread, MessageRole.ASSISTANT, JSON.stringify(judgement, null, 2), sourceAgent.id) :
          judgement;
        break;
  
      case InteractionType.MESSAGE:
        output = this.constructMessage(
          thread,
          MessageRole.ASSISTANT,
          formattedResult,
          sourceAgent.id,
          toUser ? undefined : targetAgent?.id
        );
        break;
  
      default:
        throw new Error("Invalid chain result");
    }
  
    return output as Interaction;
  }

    // if (resultType === InteractionType.TOOL_CALL) {
    //   // If the result is a tool call, execute the tool call then store the result
    //   const agentToolCall = result.result as AgentToolCall;
    //   const toolCallResult = await this.executeToolCall(
    //     agentToolCall,
    //     sourceAgent.id
    //   );
    //   this.constructToolCallInteraction(
    //     thread,
    //     agentToolCall,
    //     toolCallResult,
    //     sourceAgent.id
    //   );

    //   // Record the tool call result
    //   if (toUser) {
    //     output = this.constructMessage(
    //       thread,
    //       MessageRole.ASSISTANT,
    //       JSON.stringify(toolCallResult),
    //       sourceAgent.id
    //     );
    //   } else {
    //     output = toolCallResult;
    //   }
    //   return output as Interaction;
    // } else if (resultType === InteractionType.PLAN) {
    //   // If the result is a task list, record it as a plan
    //   const plan = this.constructPlan(
    //     thread,
    //     result.result as AgentPlan,
    //     sourceAgent.id
    //   );
    //   // Plan is not directly returned to the user, it is executed first and then the outcome is returned to the user
    //   output = plan;
    //   return output as Interaction;
    // } else if (resultType === InteractionType.JUDGEMENT) {
    //   // If the result is a judgement, record it as a judgement
    //   const judgement = this.constructJudgement(
    //     thread,
    //     result.result as AgentJudgement,
    //     sourceAgent.id
    //   );

    //   if (toUser) {
    //     output = this.constructMessage(
    //       thread,
    //       MessageRole.ASSISTANT,
    //       JSON.stringify(judgement),
    //       sourceAgent.id
    //     );
    //   } else {
    //     output = judgement;
    //   }
    //   return output as Interaction;
    // } else if (resultType === InteractionType.MESSAGE) {
    //   // Record the agent message
    //   if (toUser) {
    //     output = this.constructMessage(
    //       thread,
    //       MessageRole.ASSISTANT,
    //       JSON.stringify(result.result),
    //       sourceAgent.id
    //     );
    //   } else {
    //     output = this.constructMessage(
    //       thread,
    //       MessageRole.ASSISTANT,
    //       JSON.stringify(result.result),
    //       sourceAgent.id,
    //       targetAgent?.id
    //     );
    //   }
    //   return output as Interaction;
    // } else {
    //   throw new Error("Invalid chain result");
    // }
  // }

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
        step: taskInfo.step,
      };
      plan.tasks.push(task);
    }

    thread.addInteraction(plan);
    return plan;
  }

  private async executePlan(plan: Plan, thread: Thread): Promise<void> {
    // TODO: Insert Task in thread and update thread, create status for plan

    let previousTasks = "";
    for (const task of plan.tasks) {
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

      const taskMessage = 
      `Overall Goal: ${plan.goal}\n\n`+
      `${task.step && task.step > 1 ? `Previous Tasks: \n${previousTasks}\n` : ""}\n`+
      `Current Task: ${task.instruction}`;
      const decodedTaskMessage = decodeURIComponent(taskMessage);

      // Create input based on chain type
      const input = this.createChainInput(chainConfig, decodedTaskMessage);
      if (input instanceof Error) {
        throw input;
      }

      // Execute chain
      const result = await this.chainManager.executeChain(agent.chainId, input);

      if (result.success && result.result) {
        const executionOutput = await this.handleChainResult(
          result,
          thread,
          false,
          agent,
          agent
        );

        task.status = TaskStatus.COMPLETED;
        task.result = result.result;
        previousTasks += `\nCompleted Task ${task.step}: ${task.instruction} - Output: ${JSON.stringify(executionOutput)}\n`;
      } else {
        task.status = TaskStatus.FAILED;
        task.result = result.error;
      }
      
      // Update the thread with the completed task
      this.constructMessage(
        thread,
        MessageRole.ASSISTANT,
        JSON.stringify(previousTasks),
        agent.id
      );
    }

    // Return to user the outcome of the plan execution
    this.constructMessage(
      thread,
      MessageRole.ASSISTANT,
      JSON.stringify(previousTasks),
      plan.targetAgentId,
    );
  }

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
    const toolCallInteraction: ToolCall = {
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
    thread.addInteraction(toolCallInteraction);
    return toolCallInteraction;
  }

  constructJudgement(
    thread: Thread,
    result: AgentJudgement,
    agentId: string
  ): Judgement {
    const judgementInteraction: Judgement = {
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
    thread.addInteraction(judgementInteraction);
    return judgementInteraction;
  }

  // Utility functions for storing messages
  constructMessage(
    thread: Thread,
    role: MessageRole.USER | MessageRole.ASSISTANT,
    content: string,
    targetAgentId?: string,
    sourceAgentId?: string
  ): Message {
    const formattedContent = typeof content === 'string' ? 
    this.formatInteractionContent(content) : 
    JSON.stringify(content, null, 2);

    const messageInteraction: Message = {
      ...thread.createBaseEntity(),
      threadId: thread.id,
      type: InteractionType.MESSAGE,
      role: role,
      content: formattedContent,
      targetAgentId: targetAgentId,
      sourceAgentId: sourceAgentId,
    };
    thread.addInteraction(messageInteraction);
    return messageInteraction;
  }

  private formatInteractionContent(content: string): string {
    try {
      // Try to parse and re-stringify to ensure consistent formatting
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // If not valid JSON, return as-is
      return content;
    }
  }
}
