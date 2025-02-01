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
  AgentJudgement,
  AgentToolCall,
  ToolCall,
  Plan,
  Judgement,
  Task,
  InteractionStatus,
  InteractionType,
  InteractionError,
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
      // Record user message. The initiating agent is the target agent for this message.
      const userMessage = this.constructNewInteraction(
        thread,
        InteractionType.MESSAGE,
        undefined,
        initiatingAgentId
      );
      this.appendMessageConstruction(userMessage, MessageRole.USER, content);

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
    content: string
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

    let output: Interaction;
    const formattedResult: unknown =
      typeof result.result === "string"
        ? this.formatInteractionContent(result.result)
        : result.result;

    switch (resultType) {
      case InteractionType.TOOL_CALL:
        // Create an empty new tool call interaction
        const toolCallInteraction = this.constructNewInteraction(
          thread,
          InteractionType.TOOL_CALL,
          sourceAgent.id,
          sourceAgent.id
        );
        try {
          // Add tool call properties to the interaction
          toolCallInteraction.status = InteractionStatus.IN_PROGRESS;
          const agentToolCall = formattedResult as AgentToolCall;
          this.appendToolCallInteractionConstruction(
            toolCallInteraction,
            agentToolCall
          );

          // Execute the tool call and store the result to the interaction
          const toolCallResult = await this.executeToolCall(
            agentToolCall,
            sourceAgent.id
          );
          if (toolCallResult instanceof Error) {
            throw toolCallResult;
          }
          const formattedToolCall = JSON.stringify(toolCallResult, null, 2);
          (toolCallInteraction as ToolCall).result = formattedToolCall;
          (toolCallInteraction as ToolCall).status = InteractionStatus.SUCCESS;

          // Return the tool call result to the user or store it as a tool call interaction
          output = toUser
            ? (() => {
                const message = this.constructNewInteraction(
                  thread,
                  InteractionType.MESSAGE,
                  sourceAgent.id
                );
                this.appendMessageConstruction(
                  message,
                  MessageRole.ASSISTANT,
                  JSON.stringify(toolCallInteraction, null, 2)
                );
                return message as Message;
              })()
            : toolCallInteraction;
        } catch (error) {
          this.appendErrorInteractionConstruction(toolCallInteraction, error);
          output = toolCallInteraction;
        }

        break;

      case InteractionType.PLAN:
        const plan = this.constructNewInteraction(
          thread,
          InteractionType.PLAN,
          sourceAgent.id,
          sourceAgent.id
        );
        try {
          this.appendPlanConstruction(
            plan,
            formattedResult as AgentPlan,
            thread
          );
        } catch (error) {
          this.appendErrorInteractionConstruction(plan, error);
        } finally {
          output = plan;
        }
        break;

      case InteractionType.JUDGEMENT:
        const judgement = this.constructNewInteraction(
          thread,
          InteractionType.JUDGEMENT,
          sourceAgent.id,
          sourceAgent.id
        );
        try {
          this.appendJudgementConstruction(
            judgement,
            formattedResult as AgentJudgement
          );
          output = toUser
            ? (() => {
                const message = this.constructNewInteraction(
                  thread,
                  InteractionType.MESSAGE,
                  sourceAgent.id
                );
                this.appendMessageConstruction(
                  message,
                  MessageRole.ASSISTANT,
                  JSON.stringify(judgement, null, 2)
                );
                return message as Message;
              })()
            : judgement;
        } catch (error) {
          this.appendErrorInteractionConstruction(judgement, error);
          output = judgement;
        }
        break;

      case InteractionType.MESSAGE:
        const message = this.constructNewInteraction(
          thread,
          InteractionType.MESSAGE,
          sourceAgent.id,
          toUser ? undefined : targetAgent?.id
        );
        try {
          this.appendMessageConstruction(
            message,
            MessageRole.ASSISTANT,
            formattedResult as string
          );
        } catch (error) {
          this.appendErrorInteractionConstruction(message, error);
        } finally {
          output = message;
        }
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

  private appendPlanConstruction(
    interaction: Interaction,
    result: AgentPlan,
    thread: Thread
  ): Plan {
    // Validate the plan structure
    if (!result || typeof result !== "object") {
      throw new Error("Invalid plan structure: result must be an object");
    }

    if (!result.goal || typeof result.goal !== "string") {
      throw new Error("Invalid plan structure: goal must be a string");
    }

    if (!Array.isArray(result.tasks)) {
      throw new Error("Invalid plan structure: tasks must be an array");
    }

    // Construct the plan
    (interaction as Plan).goal = result.goal;
    (interaction as Plan).reasoning = result.reasoning || "";
    (interaction as Plan).tasks = [];
    (interaction as Plan).completedTaskIds = [];
    (interaction as Plan).status = InteractionStatus.PENDING;

    // Process each task
    for (const taskInfo of result.tasks) {
      if (!taskInfo || typeof taskInfo !== "object") {
        throw new Error("Invalid task structure in plan");
      }

      const task = {
        ...thread.createBaseEntity(),
        threadId: thread.id,
        type: InteractionType.TASK,
        instruction: taskInfo.instruction || "",
        status: InteractionStatus.PENDING,
        targetAgentId: taskInfo.requiredAgentId,
        dependencies: Array.isArray(taskInfo.dependencies)
          ? taskInfo.dependencies.map(String)
          : [],
        planId: interaction.id,
        step: taskInfo.step || 0,
      };

      (interaction as Plan).tasks.push(task as Task);
    }

    return interaction as Plan;
  }

  // private constructNewPlan(
  //   thread: Thread,
  //   result: AgentPlan,
  //   agentId: string
  // ): Plan {
  //   const plan: Plan = {
  //     ...thread.createBaseEntity(),
  //     status: InteractionStatus.PENDING,
  //     threadId: thread.id,
  //     type: InteractionType.PLAN,
  //     goal: (result as AgentPlan).goal,
  //     reasoning: (result as AgentPlan).reasoning,
  //     tasks: [],
  //     completedTaskIds: [],
  //     sourceAgentId: agentId,
  //     targetAgentId: agentId,
  //   };

  //   for (const taskInfo of result.tasks) {
  //     const task: Task = {
  //       ...thread.createBaseEntity(),
  //       threadId: thread.id,
  //       type: InteractionType.TASK,
  //       instruction: (taskInfo as AgentTask).instruction,
  //       status: InteractionStatus.PENDING,
  //       targetAgentId: (taskInfo as AgentTask).requiredAgent,
  //       dependencies: (taskInfo as AgentTask).dependencies.map((id) =>
  //         String(id)
  //       ),
  //       planId: plan.id,
  //       step: taskInfo.step,
  //     };
  //     plan.tasks.push(task);
  //   }

  //   thread.addInteraction(plan);
  //   return plan;
  // }

  private async executePlan(plan: Plan, thread: Thread): Promise<void> {
    const previousTasks: string[] = [];

    for (const task of plan.tasks) {
      try {
        task.status = InteractionStatus.IN_PROGRESS;

        if (!task.targetAgentId) {
          throw new Error("No target agent ID assigned to task");
        }

        const agent = this.agentManager.getAgent(task.targetAgentId);
        if (!agent) {
          throw new Error("No agent assigned to task");
        }

        // Get agent's chain
        if (!agent.chainId) {
          throw new Error("No chain ID assigned to agent");
        }

        // Get agent's chain config
        const chainConfig = this.chainManager.getChain(agent.chainId);
        if (!chainConfig) {
          throw new Error("Chain not found");
        }

        // Create a input summary message of the plan and previous tasks
        const taskMessage =
          `Overall Goal: ${plan.goal}\n\n` +
          `Previous Tasks:\n${previousTasks.join('\n')}\n\n` +
          `Current Task: ${task.instruction}`;
        const decodedTaskMessage = decodeURIComponent(taskMessage);

        // Create input based on chain type
        const input = this.createChainInput(chainConfig, decodedTaskMessage);
        if (input instanceof Error) {
          throw input;
        }

        // Execute chain
        const result = await this.chainManager.executeChain(
          agent.chainId,
          input
        );

        if (result.success && result.result) {
          const executionOutput = await this.handleChainResult(
            result,
            thread,
            false,
            agent,
            agent
          );

          task.status = InteractionStatus.SUCCESS;
          task.result = result.result;
          previousTasks.push(this.formatTaskOutput(task, executionOutput));
        } else {
          this.appendErrorInteractionConstruction(task, result.error);
          previousTasks.push(
            `Task ${task.step}: ${task.instruction}\nStatus: Failed\nError: ${result.error}`
          );
        }

        // Update the thread with the completed task
        const message = this.constructNewInteraction(
          thread,
          InteractionType.MESSAGE,
          agent.id
        );
        this.appendMessageConstruction(
          message,
          MessageRole.ASSISTANT,
          JSON.stringify(previousTasks, null, 2)
        );
      } catch (error) {
        this.appendErrorInteractionConstruction(task, error);
      }

      // Return to user the outcome of the plan execution
      const summaryMessage = this.constructNewInteraction(
        thread,
        InteractionType.MESSAGE,
        plan.targetAgentId
      );

      const formattedSummary = 
      `Plan Execution Summary\n` +
      `====================\n` +
      `Goal: ${plan.goal}\n\n` +
      previousTasks.join('\n\n');

      this.appendMessageConstruction(
        summaryMessage, 
        MessageRole.ASSISTANT, 
        formattedSummary
      );
    }
  }

  private formatTaskOutput(task: Task, executionOutput: Interaction): string {
    let formattedOutput = `Task ${task.step}: ${task.instruction}\n`;
    formattedOutput += '----------------------------------------\n';
    
    if (executionOutput.type === InteractionType.TOOL_CALL) {
      const toolCall = executionOutput as ToolCall;
      formattedOutput += `Tool: ${toolCall.toolName}.${toolCall.functionName}\n`;
      
      try {
        // Parse and format the result if it's JSON
        const result = JSON.parse(toolCall.result as string);
        formattedOutput += 'Result:\n' + JSON.stringify(result, null, 2);
      } catch {
        formattedOutput += `Result: ${toolCall.result}`;
      }
    } else if (executionOutput.type === InteractionType.MESSAGE) {
      const message = executionOutput as Message;
      formattedOutput += `Response: ${message.content}`;
    }
    
    return formattedOutput;
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

  constructNewInteraction(
    thread: Thread,
    interactionType: InteractionType,
    sourceAgentId?: string,
    targetAgentId?: string
  ): Interaction {
    const interaction: Interaction = {
      ...thread.createBaseEntity(),
      threadId: thread.id,
      status: InteractionStatus.PENDING,
      type: interactionType,
      sourceAgentId: sourceAgentId,
      targetAgentId: targetAgentId,
    };
    thread.addInteraction(interaction);
    return interaction;
  }

  appendToolCallInteractionConstruction(
    interaction: Interaction,
    toolCall: AgentToolCall
  ): Interaction {
    (interaction as ToolCall).toolName = toolCall.execution.connectorName;
    (interaction as ToolCall).functionName = toolCall.execution.functionName;
    (interaction as ToolCall).parameters = toolCall.execution.parameters;
    return interaction;
  }

  // constructNewToolCallInteraction(
  //   thread: Thread,
  //   toolCall: AgentToolCall,
  //   agentId: string
  // ): ToolCall {
  //   const toolCallInteraction: ToolCall = {
  //     ...thread.createBaseEntity(),
  //     status: InteractionStatus.PENDING,
  //     threadId: thread.id,
  //     type: InteractionType.TOOL_CALL,
  //     toolName: toolCall.execution.connectorName,
  //     functionName: toolCall.execution.functionName,
  //     parameters: toolCall.execution.parameters,
  //     sourceAgentId: agentId,
  //     targetAgentId: agentId,
  //   };
  //   thread.addInteraction(toolCallInteraction);
  //   return toolCallInteraction;
  // }

  appendJudgementConstruction(
    interaction: Interaction,
    result: AgentJudgement
  ): Judgement {
    (interaction as Judgement).satisfied = result.satisfied;
    (interaction as Judgement).score = result.score;
    (interaction as Judgement).analysis = result.analysis;
    (interaction as Judgement).feedback = result.feedback;
    return interaction as Judgement;
  }

  // // Utility functions for storing messages
  // constructMessage(
  //   thread: Thread,
  //   role: MessageRole.USER | MessageRole.ASSISTANT,
  //   content: string,
  //   targetAgentId?: string,
  //   sourceAgentId?: string
  // ): Message {
  //   const formattedContent = typeof content === 'string' ?
  //   this.formatInteractionContent(content) :
  //   JSON.stringify(content, null, 2);

  //   const messageInteraction: Message = {
  //     ...thread.createBaseEntity(),
  //     threadId: thread.id,
  //     type: InteractionType.MESSAGE,
  //     role: role,
  //     content: formattedContent,
  //     targetAgentId: targetAgentId,
  //     sourceAgentId: sourceAgentId,
  //   };
  //   thread.addInteraction(messageInteraction);
  //   return messageInteraction;
  // }

  appendMessageConstruction(
    interaction: Interaction,
    role: MessageRole,
    content: string
  ): Message {
    (interaction as Message).role = role;
    (interaction as Message).content = content;
    return interaction as Message;
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

  private appendErrorInteractionConstruction(
    interaction: Interaction,
    error: unknown
  ): Interaction {
    const interactionError: InteractionError = {
      code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
      message:
        error instanceof Error ? error.message : "An unknown error occurred",
      details:
        error instanceof Error
          ? { stack: JSON.stringify(error.stack) }
          : undefined,
      timestamp: Date.now(),
    };
    (interaction as Interaction).error = interactionError;
    (interaction as Interaction).status = InteractionStatus.FAILED;
    return interaction;
  }
}
