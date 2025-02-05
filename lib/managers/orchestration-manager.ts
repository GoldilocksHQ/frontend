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
  Task,
  InteractionStatus,
  InteractionType,
  Judgement,
} from "../core/thread";
import { ThreadStatus } from "../core/thread";
import { ChainConfig, ChainExecutionResult, ChainType } from "./chain-manager";
import { Agent } from "./agent-manager";
import { models } from "./chain-manager";
import { useUIStore, type UIState } from "../stores/ui-store";

export class OrchestrationManager extends Manager {
  private static instance: OrchestrationManager | null = null;
  private errorManager: ErrorManager;
  private agentManager: AgentManager;
  private chainManager: ChainManager;
  private uiState: UIState;

  // Handler registry pattern
  private interactionHandlers = {
    [InteractionType.TOOL_CALL]: this.handleToolCallInteraction.bind(this),
    [InteractionType.PLAN]: this.handlePlanInteraction.bind(this),
    [InteractionType.JUDGEMENT]: this.handleJudgementInteraction.bind(this),
    [InteractionType.MESSAGE]: this.handleMessageInteraction.bind(this)
  };

  // Strategy pattern for chain inputs
  private chainInputStrategies = {
    [ChainType.CONVERSATION]: (content: string) => ({ content: content }),
    [ChainType.TASK_PLANNING]: (content: string) => ({ request: content }),
    [ChainType.TASK_EXECUTION]: (content: string) => ({ task: content }),
    [ChainType.JUDGEMENT]: (content: string) => this.createJudgementInput(content)
  };

  // Factory pattern for interaction creation
  private interactionFactory = {
    create: (type: InteractionType, thread: Thread, sourceId: string, targetId?: string) => {
      return thread.constructNewInteraction(type, sourceId, targetId);
    }
  };

  private errorService = {
    handleInteractionError: (interaction: Interaction, error: unknown, thread: Thread) => {
      thread.appendErrorInteractionConstruction(interaction, error);
      interaction.status = InteractionStatus.FAILED;
    },
    logOrchestrationError: (error: Error, metadata?: Record<string, unknown>) => {
      this.errorManager.logError(error, {
        source: this.name,
        severity: ErrorSeverity.HIGH,
        metadata
      });
    },
    handleExecutionError: (task: Task, error: unknown, thread: Thread) => {
      thread.appendErrorInteractionConstruction(task, error);
      return `Task ${task.step}: ${task.instruction}\nStatus: Failed\nError: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  };

  private constructor() {
    super({ name: "OrchestrationManager" });
    this.errorManager = ErrorManager.getInstance();
    this.agentManager = AgentManager.getInstance();
    this.chainManager = ChainManager.getInstance();
    this.uiState = useUIStore.getState();
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
      const userMessage = thread.constructNewInteraction(
        InteractionType.MESSAGE,
        undefined,
        initiatingAgentId
      ) as Message;
      thread.appendMessageConstruction(userMessage, MessageRole.USER, content);
      
      // Get the initiating agent
      const initiatingAgent = this.agentManager.getAgent(initiatingAgentId);
      if (!initiatingAgent) {
        throw new Error("Initiating agent not found");
      }

      // Execute the chain
      const result = await this.handleChainExecution(thread, content, initiatingAgent);

      // Handle the chain result
      const interaction = await this.handleChainResult(result, thread, true, initiatingAgent);

      // If the result is a plan, execute it
      if (interaction.type === InteractionType.PLAN) {
        await this.executePlan(interaction as Plan, thread, true);
      } else {
        this.finalizeInteraction(interaction, thread, true, initiatingAgent);
      }

      // Update the thread status
      thread.updateStatus(ThreadStatus.COMPLETED);
    } catch (error) {
      this.handleOrchestrationFailure(error, thread);
    }
  }


  // ----------- Core Handlers -----------

  private async handleChainExecution(
    thread: Thread,
    content: string,
    targetAgent: Agent
  ): Promise<ChainExecutionResult> {
    if (!targetAgent.chainId) {
      throw new Error("No chain ID assigned to agent");
    }
  
    const chainConfig = this.chainManager.getChain(targetAgent.chainId);
    if (!chainConfig) {
      throw new Error("Chain not found");
    }
  
    const input = this.createChainInput(chainConfig, content);
    if (input instanceof Error) {
      throw input;
    }
  
    return this.chainManager.executeChain(targetAgent.chainId, input);
  }
  
  private async handleChainResult(
    result: ChainExecutionResult,
    thread: Thread,
    toUser: boolean,
    sourceAgent: Agent,
    targetAgent?: Agent
  ): Promise<Interaction> {
    const resultType = this.determineResultType(result);
    const handler = this.interactionHandlers[resultType as keyof typeof this.interactionHandlers];
    if (!handler) throw new Error(`No handler for result type: ${resultType}`);
    try {
      return await handler(result, thread, sourceAgent, targetAgent);
    } catch (error) {
      return this.handleHandlerError(resultType, error, thread, sourceAgent);
    }
  }

  // ----------- Interaction Handlers -----------
  private async handleToolCallInteraction(
    result: ChainExecutionResult,
    thread: Thread,
    sourceAgent: Agent,
    targetAgent?: Agent
  ): Promise<Interaction> {
    const interaction = this.interactionFactory.create(
      InteractionType.TOOL_CALL,
      thread,
      sourceAgent.id,
      targetAgent?.id
    ) as ToolCall;
    
    interaction.status = InteractionStatus.IN_PROGRESS;
    const agentToolCall = result.result as AgentToolCall;
    
    thread.appendToolCallInteractionConstruction(interaction, agentToolCall);
    const toolResult = await this.executeToolCall(agentToolCall, sourceAgent.id);
    
    interaction.result = JSON.stringify(toolResult, null, 2);
    interaction.status = InteractionStatus.SUCCESS;
    
    return interaction;
  }

  private handlePlanInteraction(
    result: ChainExecutionResult,
    thread: Thread,
    sourceAgent: Agent,
    targetAgent?: Agent
  ): Interaction {
    const plan = this.interactionFactory.create(
      InteractionType.PLAN,
      thread,
      sourceAgent.id,
      targetAgent?.id
    ) as Plan;
    
    thread.appendPlanConstruction(plan, result.result as AgentPlan, thread);
    return plan;
  }

  private async handleJudgementInteraction(
    result: ChainExecutionResult,
    thread: Thread,
    sourceAgent: Agent,
    targetAgent?: Agent
  ): Promise<Interaction> {
    const interaction = this.interactionFactory.create(
      InteractionType.JUDGEMENT,
      thread,
      sourceAgent.id,
      targetAgent?.id
    ) as Judgement;
    
    try {
      const judgement = result.result as AgentJudgement;
      interaction.status = InteractionStatus.SUCCESS;
      thread.appendJudgementConstruction(interaction, judgement);
    } catch (error) {
      this.errorService.handleInteractionError(interaction, error, thread);
    }
    return interaction;
  }
  
  private async handleMessageInteraction(
    result: ChainExecutionResult,
    thread: Thread,
    sourceAgent: Agent,
    targetAgent?: Agent
  ): Promise<Interaction> {
    const interaction = this.interactionFactory.create(
      InteractionType.MESSAGE,
      thread,
      sourceAgent.id,
      targetAgent?.id
    ) as Message;
    
    try {
      interaction.status = InteractionStatus.SUCCESS;
      thread.appendMessageConstruction(
        interaction,
        MessageRole.ASSISTANT,
        result.result as string
      );
    } catch (error) {
      this.errorService.handleInteractionError(interaction, error, thread);
    }
    return interaction;
  }

  private finalizeInteraction(
    interaction: Interaction,
    thread: Thread,
    toUser: boolean,
    sourceAgent: Agent
  ): Interaction {
    if (toUser && interaction.type !== InteractionType.MESSAGE) {
      const message = this.interactionFactory.create(
        InteractionType.MESSAGE,
        thread,
        sourceAgent.id
      ) as Message;
      thread.appendMessageConstruction(
        message,
        MessageRole.ASSISTANT,
        JSON.stringify(interaction, null, 2)
      );
      return message;
    }
    return interaction;
  }
  
  // ----------- Plan Execution Service -----------
  private async executePlan(
    plan: Plan,
    thread: Thread,
    fromUser: boolean
  ): Promise<Interaction> {
    const judgementAgent = await this.createJudgementAgent(thread);
    const previousTasks: string[] = [];
    
    // Send initial plan goal
    this.uiState.setWorkingStatus(
      `Start Executing Plan: ${plan.goal}\n`
    );

    // Execute the tasks in order
    for (const task of plan.tasks) {
      // Update status with current task
      this.uiState.appendWorkingStatus(
        `Processing Task ${task.step}: ${task.instruction}\n`
      );

      previousTasks.push(await this.executeTask(task, plan, thread, previousTasks, judgementAgent));
    }

    const summary = this.createPlanExecutionSummary(plan, previousTasks);
    const summaryMessage = thread.constructNewInteraction(
      InteractionType.MESSAGE,
      plan.sourceAgentId,
      fromUser ? undefined : plan.targetAgentId
    ) as Message;
    const outputMessage = thread.appendMessageConstruction(
      summaryMessage,
      MessageRole.ASSISTANT,
      summary
    ) as Message;
    return outputMessage;
  }

  private async executeTask(
    task: Task,
    plan: Plan,
    thread: Thread,
    previousTasks: string[],
    judgementAgent: Agent
  ): Promise<string> {
    const executor = this.createTaskExecutor();
    try {
      task.status = InteractionStatus.IN_PROGRESS;

      const agent = executor.validateTask(task);

      let missing: string[] = [];
      let resultApproved: boolean = false;
      let taskExecutionCount: number = 0;
      let newResult: unknown = null;

      while (!resultApproved && taskExecutionCount < 3) {
        const input = executor.prepareTaskInput(plan, previousTasks, task, missing);
        const agentChain = this.chainManager.getChain(agent.chainId!);
        const formattedInput = this.chainInputStrategies[agentChain!.type](input);
        const result = await this.chainManager.executeChain(agent.chainId!, formattedInput);
        
        if (result.success && result.result) {
          const chainInteraction = await this.handleChainResult(
            result,
            thread,
            false,
            agent
          );

          newResult =  result as ChainExecutionResult
          if (chainInteraction.type === InteractionType.TOOL_CALL) {
            (newResult as ChainExecutionResult).result = { 
              ...(result.result as AgentToolCall), 
              output: JSON.stringify((
                chainInteraction as ToolCall).result, 
                null, 
                2
              )
            }
          } else if (chainInteraction.type === InteractionType.PLAN) {
            // If the chain interaction is a plan, execute the plan
            const outputMessage = await this.executePlan(chainInteraction as Plan, thread, false);
            (newResult as ChainExecutionResult).result = JSON.stringify({
              goal: (chainInteraction as Plan).goal,
              tasks: (chainInteraction as Plan).tasks,
              output: (outputMessage as Message).content,
            }, null, 2)
          } else {
            (newResult as ChainExecutionResult).result = chainInteraction.type === InteractionType.JUDGEMENT ? JSON.stringify({satisfied: (chainInteraction as Judgement).satisfied, feedback: (chainInteraction as Judgement).feedback}, null, 2)
            : chainInteraction.type === InteractionType.MESSAGE ? JSON.stringify({content: (chainInteraction as Message).content}, null, 2)
            : "No previous results"
          }

          // Execute the judgement chain
          const judgementInteraction = await this.executeJudgement(
            chainInteraction.type,
            judgementAgent,
            newResult as ChainExecutionResult,
            thread,
            task);
          
          if (judgementInteraction.satisfied) {
            resultApproved = true;
          } else {
            missing = judgementInteraction.analysis.missing;
          }
        }  
        taskExecutionCount++;
      }

      if (resultApproved) {
        return executor.handleTaskResult(newResult as ChainExecutionResult, task);
      } else {
        throw new Error((newResult as ChainExecutionResult).error);
      }
    } catch (error) {
      return this.errorService.handleExecutionError(task, error, thread);
    }
  }

  private createTaskExecutor() {
    return {
      validateTask: (task: Task) => {
        if (!task.targetAgentId) throw new Error("No target agent ID");
        const agent = this.agentManager.getAgent(task.targetAgentId);
        if (!agent) throw new Error("Agent not found");
        if (!agent.chainId) throw new Error("No chain ID");
        return agent;
      },

      prepareTaskInput: (plan: Plan, previousTasks: string[], task: Task, missing: string[]) => {
        const taskMessage = `Overall Goal: ${plan.goal}\n\n
          Previous Tasks:\n${previousTasks.join("\n")}\n\n
          Current Task: ${task.instruction}
        ` + (missing ? `Missing: ${missing.map((m) => "["+m+"]").join(", ")}` : "");
        const decodedTaskMessage = decodeURIComponent(taskMessage);
        return decodedTaskMessage;
      },

      handleTaskResult: (result: ChainExecutionResult, task: Task) => {
        task.status = InteractionStatus.SUCCESS;
        task.result = result.result;
        return `Task ${task.step}: ${task.instruction}\n
        Status: Completed\n
        Result: ${JSON.stringify(result.result, null, 2)}`;
      }
    };
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
    const result = await executor(
      toolCall.execution.functionName,
      toolCall.execution.parameters || {}
    );
    return result;
  }

  private async createJudgementAgent(thread: Thread): Promise<Agent> {
    const judgementAgent = await this.agentManager.createAgent({
      name: `Judgement Agent ${thread.id.slice(0, 8)}`,
      description: "A judgement agent that is responsible for judging the quality of the task",
      chainType: ChainType.JUDGEMENT,
      modelName: models[0].name,
      toolIds: [],
      linkedAgentIds: [],
    });

    return judgementAgent;
  }
  
  private async executeJudgement(type: InteractionType, judgementAgent: Agent, result: ChainExecutionResult, thread: Thread, task: Task): Promise<Judgement> {
    let judgementInput = "";
    if (type === InteractionType.PLAN){
      judgementInput = `Is the plan directly and comprehensively addressing the task in instruction?
        Instruction: ${JSON.stringify(task.instruction, null, 2)}
        Plan: ${JSON.stringify(result.result, null, 2)}`
    } else {
      judgementInput = `Does the result fulfil the instruction?
        Instruction: ${JSON.stringify(task.instruction, null, 2)}
        Result: ${JSON.stringify(result.result, null, 2)}`  
    }
    const judgementResult = await this.handleChainExecution(thread, judgementInput, judgementAgent);
    const judgementInteraction = await this.handleChainResult(
      judgementResult,
      thread,
      false,
      judgementAgent
    ) as Judgement;
    return judgementInteraction;
  }

  // ----------- Utility Services -----------
  private createJudgementInput(content: string) {
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
    return { requirement: content, response: "" };
  }

  private createChainInput(
    chainConfig: ChainConfig,
    content: string
  ): Record<string, unknown> {
    const strategy = this.chainInputStrategies[chainConfig.type];
    if (!strategy) throw new Error("Invalid chain type");
    return strategy(content);
  }

  private determineResultType(result: ChainExecutionResult): InteractionType {
    if (typeof result.result === 'object') {
      if ('execution' in result.result) return InteractionType.TOOL_CALL;
      if ('goal' in result.result) return InteractionType.PLAN;
      if ('satisfied' in result.result) return InteractionType.JUDGEMENT;
    }
    return InteractionType.MESSAGE;
  }

  private createPlanExecutionSummary(plan: Plan, previousTasks: string[]): string {
    const summary = `Overall Goal: ${plan.goal}\n\n
      Previous Tasks:\n${previousTasks.join("\n")}\n\n
    `;
    return summary;
  }


  // ----------- Error Handling -----------
  private handleOrchestrationFailure(error: unknown, thread: Thread) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    thread.updateStatus(ThreadStatus.FAILED, errorMessage);
    this.errorService.logOrchestrationError(error as Error, {
      threadId: thread.id
    });
  }

  private handleHandlerError(
    resultType: InteractionType,
    error: unknown,
    thread: Thread,
    sourceAgent: Agent
  ): Interaction {
    const errorInteraction = this.interactionFactory.create(
      resultType,
      thread,
      sourceAgent.id
    );
    this.errorService.handleInteractionError(errorInteraction, error, thread);
    return errorInteraction;
  }
}





//   {    // Get target agent
//       const targetAgent = this.agentManager.getAgent(initiatingAgentId);
//       if (!targetAgent) {
//         throw new Error("No agent assigned to target");
//       }

//       // Get target agent's chain
//       if (!targetAgent.chainId) {
//         throw new Error("No chain ID assigned to agent");
//       }

//       const chainConfig = this.chainManager.getChain(targetAgent.chainId);
//       if (!chainConfig) {
//         throw new Error("Chain not found");
//       }

//       // Create input based on chain type
//       const input = this.createChainInput(chainConfig, content);
//       if (input instanceof Error) {
//         throw input;
//       }

//       // Execute chain
//       const result = await this.chainManager.executeChain(
//         targetAgent.chainId,
//         input
//       );

//       // Handle chain result
//       if (result.success && result.result) {
//         const output = await this.handleChainResult(
//           result,
//           thread,
//           true,
//           targetAgent
//         );

//         // If the output is a plan, execute it
//         if (output.type === InteractionType.PLAN) {
//           const plan = output as Plan;
//           await this.executePlan(plan, thread, true);
//         }
//       } else {
//         thread.updateStatus(ThreadStatus.FAILED, result.error);
//       }

//       // Update thread status
//       thread.updateStatus(ThreadStatus.COMPLETED);
//     } catch (error) {
//       thread.updateStatus(
//         ThreadStatus.FAILED,
//         error instanceof Error ? error.message : String(error)
//       );
//       this.errorManager.logError(error as Error, {
//         source: this.name,
//         severity: ErrorSeverity.HIGH,
//         metadata: { threadId: thread.id },
//       });
//       throw error;
//     }
//   }

//   createChainInput(
//     chainConfig: ChainConfig,
//     content: string
//   ): Record<string, unknown> | Error {
//     if (chainConfig.type === ChainType.CONVERSATION) {
//       return { content: content };
//     } else if (chainConfig.type === ChainType.TASK_PLANNING) {
//       return { request: content };
//     } else if (chainConfig.type === ChainType.TASK_EXECUTION) {
//       return { task: content };
//     } else if (chainConfig.type === ChainType.JUDGEMENT) {
//       const splitChars = ["\n", "?"];
//       for (const char of splitChars) {
//         const lines = content.split(char);
//         if (lines.length > 1) {
//           return {
//             requirement: lines[0].replace('"', "-"),
//             response: lines.slice(1).join("\n").replace('"', "-"),
//           };
//         }
//       }
//       return {
//         requirement: content,
//         response: "",
//       };
//     } else {
//       return new Error("Invalid chain type");
//     }
//   }






//   /**
//    * Handle tool call, The agent that is responding is considered the source agent this point forward.
//    * If the agent is responding to a user, the target agent should be left undefined.
//    * If the agent is responding to another agent, the target agent should be the agent the responding agent is replying to.
//    * If to User is false, both the source and target agent needs to be set.
//    */
//   private async handleChainResult(
//     result: ChainExecutionResult,
//     thread: Thread,
//     toUser: boolean,
//     sourceAgent: Agent,
//     targetAgent?: Agent
//   ): Promise<Interaction> {
//     const resultType = this.determineResultType(result);
//     if (resultType instanceof Error) {
//       throw resultType;
//     }

//     let output: Interaction;
//     const formattedResult: unknown =
//       typeof result.result === "string"
//         ? this.formatInteractionContent(result.result)
//         : result.result;

//     switch (resultType) {
//       case InteractionType.TOOL_CALL:
//         // Create an empty new tool call interaction
//         const toolCallInteraction = thread.constructNewInteraction(
//           InteractionType.TOOL_CALL,
//           sourceAgent.id,
//           sourceAgent.id
//         ) as ToolCall;
//         try {
//           // Add tool call properties to the interaction
//           toolCallInteraction.status = InteractionStatus.IN_PROGRESS;
//           const agentToolCall = formattedResult as AgentToolCall;
//           thread.appendToolCallInteractionConstruction(
//             toolCallInteraction,
//             agentToolCall
//           );

//           // Execute the tool call and store the result to the interaction
//           const toolCallResult = await this.executeToolCall(
//             agentToolCall,
//             sourceAgent.id
//           );

//           if (toolCallResult instanceof Error) {
//             throw toolCallResult;
//           }
//           const formattedToolCall = JSON.stringify(toolCallResult, null, 2);
//           (toolCallInteraction as ToolCall).result = formattedToolCall;
//           (toolCallInteraction as ToolCall).status = InteractionStatus.SUCCESS;

//           // Return the tool call result to the user or store it as a tool call interaction
//           output = toUser
//             ? (() => {
//                 const message = thread.constructNewInteraction(
//                   InteractionType.MESSAGE,
//                   sourceAgent.id
//                 ) as Message;
//                 thread.appendMessageConstruction(
//                   message,
//                   MessageRole.ASSISTANT,
//                   JSON.stringify(toolCallInteraction, null, 2)
//                 );
//                 return message as Message;
//               })()
//             : toolCallInteraction;
//         } catch (error) {
//           thread.appendErrorInteractionConstruction(toolCallInteraction, error);
//           output = toolCallInteraction;
//         }

//         break;

//       case InteractionType.PLAN:
//         const plan = thread.constructNewInteraction(
//           InteractionType.PLAN,
//           sourceAgent.id,
//           sourceAgent.id
//         ) as Plan;
//         try {
//           thread.appendPlanConstruction(
//             plan,
//             formattedResult as AgentPlan,
//             thread
//           );
//         } catch (error) {
//           thread.appendErrorInteractionConstruction(plan, error);
//         } finally {
//           output = plan;
//         }
//         break;

//       case InteractionType.JUDGEMENT:
//         const judgement = thread.constructNewInteraction(
//           InteractionType.JUDGEMENT,
//           sourceAgent.id,
//           sourceAgent.id
//         ) as Judgement;
//         try {
//           thread.appendJudgementConstruction(
//             judgement,
//             formattedResult as AgentJudgement
//           );
//           output = toUser
//             ? (() => {
//                 const message = thread.constructNewInteraction(
//                   InteractionType.MESSAGE,
//                   sourceAgent.id
//                 ) as Message;
//                 thread.appendMessageConstruction(
//                   message,
//                   MessageRole.ASSISTANT,
//                   JSON.stringify(judgement, null, 2)
//                 );
//                 return message as Message;
//               })()
//             : judgement;
//         } catch (error) {
//           thread.appendErrorInteractionConstruction(judgement, error);
//           output = judgement;
//         }
//         break;

//       case InteractionType.MESSAGE:
//         const message = thread.constructNewInteraction(
//           InteractionType.MESSAGE,
//           sourceAgent.id,
//           toUser ? undefined : targetAgent?.id
//         ) as Message;
//         try {
//           thread.appendMessageConstruction(
//             message,
//             MessageRole.ASSISTANT,
//             formattedResult as string
//           );
//         } catch (error) {
//           thread.appendErrorInteractionConstruction(message, error);
//         } finally {
//           output = message;
//         }
//         break;

//       default:
//         throw new Error("Invalid chain result");
//     }

//     return output as Interaction;
//   }

//   private determineResultType(
//     result: ChainExecutionResult
//   ): InteractionType | Error {
//     if (typeof result.result === "object" && "execution" in result.result) {
//       return InteractionType.TOOL_CALL;
//     } else if (typeof result.result === "object" && "goal" in result.result) {
//       return InteractionType.PLAN;
//     } else if (
//       typeof result.result === "object" &&
//       "satisfied" in result.result
//     ) {
//       return InteractionType.JUDGEMENT;
//     } else if (typeof result.result === "string") {
//       return InteractionType.MESSAGE;
//     } else {
//       return new Error("Invalid chain result");
//     }
//   }

//   private async executePlan(
//     plan: Plan,
//     thread: Thread,
//     fromUser: boolean
//   ): Promise<void> {
//     const previousTasks: string[] = [];

//     for (const task of plan.tasks) {
//       try {
//         task.status = InteractionStatus.IN_PROGRESS;

//         if (!task.targetAgentId) {
//           throw new Error("No target agent ID assigned to task");
//         }

//         const agent = this.agentManager.getAgent(task.targetAgentId);
//         if (!agent) {
//           throw new Error("No agent assigned to task");
//         }

//         // Get agent's chain
//         if (!agent.chainId) {
//           throw new Error("No chain ID assigned to agent");
//         }

//         // Get agent's chain config
//         const chainConfig = this.chainManager.getChain(agent.chainId);
//         if (!chainConfig) {
//           throw new Error("Chain not found");
//         }

//         // Create a input summary message of the plan and previous tasks
//         const taskMessage =
//           `Overall Goal: ${plan.goal}\n\n` +
//           `Previous Tasks:\n${previousTasks.join("\n")}\n\n` +
//           `Current Task: ${task.instruction}`;
//         const decodedTaskMessage = decodeURIComponent(taskMessage);

//         // Create input based on chain type
//         const input = this.createChainInput(chainConfig, decodedTaskMessage);
//         if (input instanceof Error) {
//           throw input;
//         }

//         // Execute chain
//         const result = await this.chainManager.executeChain(
//           agent.chainId,
//           input
//         );

//         if (result.success && result.result) {
//           const executionOutput = await this.handleChainResult(
//             result,
//             thread,
//             false,
//             agent,
//             agent
//           );

//           task.status = InteractionStatus.SUCCESS;
//           task.result = result.result;
//           previousTasks.push(this.formatTaskOutput(task, executionOutput));

//           if (executionOutput.type === InteractionType.PLAN) {
//             await this.executePlan(executionOutput as Plan, thread, fromUser);
//           }
//         } else {
//           thread.appendErrorInteractionConstruction(task, result.error);
//           previousTasks.push(
//             `Task ${task.step}: ${task.instruction}\nStatus: Failed\nError: ${result.error}`
//           );
//         }

//         // // Update the thread with the completed task
//         // const message = this.constructNewInteraction(
//         //   thread,
//         //   InteractionType.MESSAGE,
//         //   agent.id
//         // );
//         // this.appendMessageConstruction(
//         //   message,
//         //   MessageRole.ASSISTANT,
//         //   JSON.stringify(previousTasks, null, 2)
//         // );
//       } catch (error) {
//         thread.appendErrorInteractionConstruction(task, error);
//       }
//     }

//     // Return to user the outcome of the plan execution
//     const summaryMessage = thread.constructNewInteraction(
//       InteractionType.MESSAGE,
//       plan.targetAgentId,
//       fromUser ? undefined : plan.sourceAgentId
//     ) as Message;

//     const formattedSummary =
//       `Plan Execution Summary\n` +
//       `====================\n` +
//       `Goal: ${plan.goal}\n\n` +
//       previousTasks.join("\n\n");

//     thread.appendMessageConstruction(
//       summaryMessage,
//       MessageRole.ASSISTANT,
//       formattedSummary
//     );
//   }

//   private formatTaskOutput(task: Task, executionOutput: Interaction): string {
//     let formattedOutput = `Task ${task.step}: ${task.instruction}\n`;
//     formattedOutput += "----------------------------------------\n";

//     if (executionOutput.type === InteractionType.TOOL_CALL) {
//       const toolCall = executionOutput as ToolCall;
//       formattedOutput += `Tool: ${toolCall.toolName}.${toolCall.functionName}\n`;

//       try {
//         // Parse and format the result if it's JSON
//         const result = JSON.parse(toolCall.result as string);
//         formattedOutput += "Result:\n" + JSON.stringify(result, null, 2);
//       } catch {
//         formattedOutput += `Result: ${toolCall.result}`;
//       }
//     } else if (executionOutput.type === InteractionType.MESSAGE) {
//       const message = executionOutput as Message;
//       formattedOutput += `Response: ${message.content}`;
//     }

//     return formattedOutput;
//   }

//   private async executeToolCall(
//     toolCall: AgentToolCall,
//     agentId: string
//   ): Promise<unknown> {
//     const agent = this.agentManager.getAgent(agentId);
//     if (!agent) {
//       throw new Error("No agent assigned to tool call");
//     }
//     const availableTools = agent.toolIds?.map((toolId) =>
//       this.agentManager.getTool(toolId)
//     );
//     const tool = availableTools?.find(
//       (tool) => tool?.name === toolCall.execution.connectorName
//     );

//     if (!tool) {
//       throw new Error(`Tool not found: ${toolCall.execution.connectorName}`);
//     }
//     const executor = this.agentManager.getToolExecutor(tool.id);
//     if (!executor) {
//       throw new Error(`Executor not found: ${tool.id}`);
//     }
//     const result = await executor(
//       toolCall.execution.functionName,
//       toolCall.execution.parameters
//     );
//     return result;
//   }

//   private formatInteractionContent(content: string): string {
//     try {
//       // Try to parse and re-stringify to ensure consistent formatting
//       const parsed = JSON.parse(content);
//       return JSON.stringify(parsed, null, 2);
//     } catch {
//       // If not valid JSON, return as-is
//       return content;
//     }
//   }
// }

