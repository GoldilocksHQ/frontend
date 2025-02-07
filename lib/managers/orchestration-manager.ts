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
        const judgementAgent = await this.createJudgementAgent(thread);
        const summaryAgent = await this.createSummaryAgent(thread);
        await this.executePlan(interaction as Plan, thread, judgementAgent, summaryAgent, true);
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
      const errorInteraction = this.interactionFactory.create(
        resultType,
        thread,
        sourceAgent.id
      );
      this.errorService.handleInteractionError(errorInteraction, error, thread);
      return errorInteraction;
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
    
    try {
    
      interaction.status = InteractionStatus.IN_PROGRESS;
      const agentToolCall = result.result as AgentToolCall;
      
      thread.appendToolCallInteractionConstruction(interaction, agentToolCall);
      const toolResult = await this.executeToolCall(agentToolCall, sourceAgent.id);
    
      if (toolResult instanceof Error) {
        throw toolResult;
      }
      (interaction as ToolCall).result = JSON.stringify(toolResult, null, 2);
      interaction.status = InteractionStatus.SUCCESS;
      
      return interaction;
    } catch (error) {
      (interaction as ToolCall).status = InteractionStatus.FAILED;
      // return this.handleHandlerError(InteractionType.TOOL_CALL, error, thread, sourceAgent);
      this.errorService.handleInteractionError(interaction, error, thread);
    }
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
    judgementAgent: Agent,
    summaryAgent: Agent,
    fromUser: boolean
  ): Promise<Interaction> {
    
    if (!plan.sourceAgentId) {
      throw new Error("Plan source agent ID not found");
    }
    const planInitiatingAgent = this.agentManager.getAgent(plan.sourceAgentId);
    if (!planInitiatingAgent) {
      throw new Error("Plan initiating agent not found");
    }
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

      previousTasks.push(await this.executeTask(task, plan, thread, previousTasks, judgementAgent, summaryAgent));

      if (task.status === InteractionStatus.FAILED) {
        break;
      }
    }

    const summaryText = this.createPlanExecutionSummary(plan, previousTasks);
    const summaryContent = await this.executeSummary(summaryText, summaryAgent, planInitiatingAgent!, thread);
    const summaryMessage = thread.constructNewInteraction(
      InteractionType.MESSAGE,
      plan.sourceAgentId,
      fromUser ? undefined : plan.targetAgentId
    ) as Message;
    const outputMessage = thread.appendMessageConstruction(
      summaryMessage,
      MessageRole.ASSISTANT,
      summaryContent
    ) as Message;
    return outputMessage;
  }

  private async executeTask(
    task: Task,
    plan: Plan,
    thread: Thread,
    previousTasks: string[],
    judgementAgent: Agent,
    summaryAgent: Agent
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
        const agentChain = this.chainManager.getChain(agent.chainId!);

        const input = executor.prepareTaskInput(plan, previousTasks, task, missing, agentChain!.type);
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
            const outputMessage = await this.executePlan(chainInteraction as Plan, thread, judgementAgent, summaryAgent, false);
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

      prepareTaskInput: (plan: Plan, previousTasks: string[], task: Task, missing: string[], chainType: ChainType) => {
        const taskMessage = 
          (chainType === ChainType.TASK_PLANNING ? `` : `Overall Goal: ${plan.goal}\n\n`) +
          (previousTasks.length > 0 ? `Previous Tasks:\n${previousTasks.join("\n")}\n\n` : "") +
          `Current Task: ${task.instruction}` + 
          (task.keyInputs ? `\nKey Inputs: ${task.keyInputs.join("\n")}` : "") +
          (missing 
            ? `\nDon't miss the following: ${missing.map((m) => "["+m+"]").join(", ")}` 
            : "");
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

  private async createSummaryAgent(thread: Thread): Promise<Agent> {
    const summaryAgent = await this.agentManager.createAgent({
      name: `Summary Agent ${thread.id.slice(0, 8)}`,
      description: "A summary agent that is responsible for summarizing plan and output",
      chainType: ChainType.CONVERSATION,
      modelName: models[0].name,
      toolIds: [],
      linkedAgentIds: [],
    });
    return summaryAgent;
  }

  private async executeSummary(planSummary: string, summaryAgent: Agent, planInitiatingAgent: Agent, thread: Thread): Promise<string> {
    const summaryInput = 
    `Provide a direct concise answer to the goal, be comprehensive if necessary.`+
    `Then summarise the plan and final outputs in the end.\n\n${planSummary}`;
    const summaryResult = await this.handleChainExecution(thread, summaryInput, summaryAgent);
    const summaryInteraction = await this.handleChainResult(
      summaryResult,
      thread,
      false,
      summaryAgent,
      planInitiatingAgent
    ) as Message;
    return JSON.parse(summaryInteraction.content);
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
}

