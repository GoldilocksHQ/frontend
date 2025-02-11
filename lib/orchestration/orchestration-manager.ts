import { ErrorManager, ErrorSeverity} from "../core/managers/error-manager";
import { Manager, ManagerStatus } from "../core/managers/base-manager";
import { AgentManager } from "../agents/agent-manager";
import { ChainManager } from "../workflows/chains/chain-manager";
import {
  Thread,
  Interaction,
  MessageRole,
  AgentPlan,
  AgentJudgement,
  AgentToolCall,
  Plan,
  Task,
  InteractionStatus,
  InteractionType,
  AgentMessage,
  InteractionSource,
  InteractionTarget,
} from "../core/entities/thread";
import { ThreadStatus } from "../core/entities/thread";
import { ChainConfig, ChainExecutionResult, ChainType } from "../workflows/chains/chain-manager";
import { Agent } from "../agents/agent-manager";
import { useUIStore, type UIState } from "../stores/ui-store";
import { PlanExecutionStateManager, PlanExecutionContext } from "../workflows/execution/plan-execution-state-manager";
import { OrchestrationErrorHandler } from "./orchestration-error-handler";
import { InteractionResultPipeline, PlanExecutionPipeline, TaskExecutionPipeline } from "../workflows/execution/pipeline-manager";
import { ResponseValidationStep, ToolCallReponseStep, PlanResponseStep, JudgementResponseStep, MessageResponseStep, ResponseErrorStep } from "../workflows/execution/pipeline-steps/response-steps";
import { TaskExecutionTaskValidationStep, TaskExecutionChainExecutionStep, TaskExecutionMessageResponseStep, TaskExecutionPlanResponseStep, TaskExecutionSummaryStep, ExecutionValidationStep, TaskExecutionJudgementResponseStep, TaskExecutionErrorStep } from "../workflows/execution/pipeline-steps/task-execution-steps";
import { PlanExecutionSummaryStep, PlanExecutionTaskExecutionStep } from "../workflows/execution/pipeline-steps/plan-execution-steps";
import { PlanExecutionPlanValidationStep } from "../workflows/execution/pipeline-steps/plan-execution-steps";
import { PlanExecutionInitializationStep } from "../workflows/execution/pipeline-steps/plan-execution-steps";

/**
 * The OrchestrationManager class is responsible for orchestrating the execution of a thread.
 * It distributes work to other managers:
 * - AgentManager: responsible for managing the agents
 * - ChainManager: responsible for managing the chains
 * - UIState: responsible for managing the UI state
 * - PlanExecutionStateManager: responsible for managing the plan execution state
 * - OrchestrationErrorHandler: responsible for handling errors
 * 
 * It also has a pipeline of steps that are responsible for processing interactions.
 */ 
export class OrchestrationManager extends Manager {
  private static instance: OrchestrationManager | null = null;
  public errorManager: ErrorManager;
  public agentManager: AgentManager;
  public chainManager: ChainManager;
  private uiState: UIState;
  public planExecutionState: PlanExecutionStateManager;
  public errorHandler: OrchestrationErrorHandler;
  public pipelines: {
    interactionResult: InteractionResultPipeline,
    planExecution: PlanExecutionPipeline,
    taskExecution: TaskExecutionPipeline
  };

  // Strategy pattern for chain inputs
  public chainInputStrategies = {
    [ChainType.CONVERSATION]: (content: string) => ({ content: content }),
    [ChainType.TASK_PLANNING]: (content: string) => ({ request: content }),
    [ChainType.TASK_EXECUTION]: (content: string) => ({ task: content }),
    [ChainType.JUDGEMENT]: (content: string) => this.createJudgementInput(content)
  };

  // Factory pattern for interaction creation
  public interactionFactory = {
    create: (type: InteractionType, thread: Thread, sourceId: string, targetId: string) => {
      return thread.constructNewInteraction(type, sourceId, targetId);
    },
    appendSpecialization: (interaction: Interaction, thread: Thread, construct: AgentPlan | AgentJudgement | AgentToolCall | AgentMessage) => {
      if (interaction.type === InteractionType.PLAN) {
        thread.appendPlanConstruction(interaction, construct as AgentPlan, thread);
      } else if (interaction.type === InteractionType.JUDGEMENT) {
        thread.appendJudgementConstruction(interaction, construct as AgentJudgement);
      } else if (interaction.type === InteractionType.TOOL_CALL) {
        thread.appendToolCallInteractionConstruction(interaction, construct as AgentToolCall);
      } else if (interaction.type === InteractionType.MESSAGE) {
        thread.appendMessageConstruction(interaction, construct as AgentMessage);
      }
    }
  };

  private constructor() {
    super({ name: "OrchestrationManager" });
    this.errorManager = ErrorManager.getInstance();
    this.agentManager = AgentManager.getInstance();
    this.chainManager = ChainManager.getInstance();
    this.uiState = useUIStore.getState();
    this.planExecutionState = new PlanExecutionStateManager();
    this.errorHandler = new OrchestrationErrorHandler(this.errorManager);
    this.pipelines = {
      interactionResult: new InteractionResultPipeline(),
      planExecution: new PlanExecutionPipeline(),
      taskExecution: new TaskExecutionPipeline(),
    };
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
      this.initializePipelines();

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

    thread.updateStatus(ThreadStatus.ACTIVE);

    try {
      // Get the initiating agent
      const initiatingAgent = this.agentManager.getAgent(initiatingAgentId);
      if (!initiatingAgent) {
        throw new Error("Initiating agent not found");
      }

      // Record user message. The initiating agent is the target agent for this message.
      this.createUserInputInteraction(thread, content, initiatingAgent);

      // Execute the chain
      const result = await this.handleChainExecution(thread, content, initiatingAgent);

      // Handle the chain result, sourceAgent is the agent that created this chain result
      const interaction = await this.handleChainResult(result, thread, initiatingAgent, InteractionTarget.USER);

      // If the result is a plan, execute it
      if (interaction.type === InteractionType.PLAN) {
        await this.executePlan(result, interaction as Plan, thread, initiatingAgent, InteractionTarget.USER);
      } else {
        this.finalizeInteraction(interaction, thread, initiatingAgent);
      }

      // Update the thread status
      thread.updateStatus(ThreadStatus.COMPLETED);
    } catch (error) {
      // Update the thread status
      const errorMessage = error instanceof Error ? error.message : String(error);
      thread.updateStatus(ThreadStatus.FAILED, errorMessage);

      this.errorHandler.handle(error, {
        interaction: thread.interactions[thread.interactions.length - 1],
        chainType: ChainType.TASK_PLANNING
      });
    }
  }


  // ----------- Core Handlers -----------

  public async handleChainExecution(
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
  
  public async handleChainResult(
    result: ChainExecutionResult,
    thread: Thread,
    sourceAgent: Agent,
    targetAgent: Agent | InteractionTarget
  ): Promise<Interaction> {
    const interaction = this.interactionFactory.create(
      this.determineResultType(result),
      thread,
      sourceAgent.id, // The source agent is the agent that created the chain result
      targetAgent === InteractionTarget.USER ? InteractionTarget.USER : targetAgent.id // The target agent is the agent that will receive the chain result
    );
    
    await this.pipelines.interactionResult.process(result, interaction, {
      thread,
      sourceAgent,
      targetAgent,
      manager: this
    });

    return interaction;
  }

  private createUserInputInteraction(
    thread: Thread,
    userMessage: string,
    initiatingAgent: Agent
  ): void {
    const interaction = this.interactionFactory.create(
      InteractionType.MESSAGE,
      thread,
      InteractionSource.USER,
      initiatingAgent.id
    );
    this.interactionFactory.appendSpecialization(
      interaction, 
      thread, {
        role: MessageRole.USER, 
        content: userMessage
      } as AgentMessage
    );
  }

  private finalizeInteraction(
    interaction: Interaction,
    thread: Thread,
    initiatingAgent: Agent
  ): void {
    if (interaction.type !== InteractionType.MESSAGE) {
      const message = this.interactionFactory.create(
        InteractionType.MESSAGE,
        thread,
        initiatingAgent.id,
        InteractionTarget.USER
      );
      this.interactionFactory.appendSpecialization(
        message,
        thread, {
          role: MessageRole.ASSISTANT,
          content: JSON.stringify(interaction, null, 2)
        } as AgentMessage
      );
    }
  }
  
  // ----------- Plan Execution Service -----------
  // sequenceDiagram
  // participant P as Pipeline
  // participant S as StateManager
  // participant O as OrchestrationManager
  
  // O->>P: process(interaction)
  // P->>S: getTaskAttempts()
  // S-->>P: 2 attempts
  // P->>P: validate/execute
  // P->>S: recordTaskResult()
  // P->>S: updateTaskStatus()
  // S->>O: notifyStateChange()


  // ----------- Plan Execution Service -----------
  async executePlan(
    result: ChainExecutionResult,
    plan: Plan,
    thread: Thread,
    sourceAgent: Agent,
    targetAgent: Agent | InteractionTarget
  ): Promise<void> {
    
    await this.pipelines.planExecution.process(result, plan, {
      thread,
      sourceAgent,
      targetAgent,
      manager: this
    });
  }

  // ----------- Task Execution Service -----------
  async executeTask(
    task: Task,
    thread: Thread,
    chainId: string,
    input: Record<string, unknown>
  ): Promise<ChainExecutionResult> {

    return await this.planExecutionState.executeWithConcurrency(task.id, async () => {

        // Execute chain
        const result = await this.executeChain(chainId, input);

        if (result.success && result.result) {
          // Process the result
          await this.pipelines.taskExecution.process(result, task, {
            thread: thread,
            sourceAgent: this.getAgent(task.sourceAgentId!)!,
            targetAgent: this.getAgent(task.targetAgentId!)!,
            manager: this
          });
        }

        return result;
      });
  }

  public async executeChain(chainId: string, input: Record<string, unknown>) {
    return this.chainManager.executeChain(chainId, input);
  }

  public getPreviousTasks(dependencies: string[], context: PlanExecutionContext): Record<string, string>[] {
    return dependencies
      .map((dependency) => {
        const prevTask = Array.from(context.taskStates.values()).find(task => String(task.step) === dependency);
        return prevTask ? {
          instruction: prevTask.instruction,
          result: JSON.stringify(prevTask.output)
        } : null;
      })
      .filter((task): task is NonNullable<typeof task> => task !== null);
  }

  async executeToolCall(
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

  
  // ----------- Utility Services -----------
  public getChain(chainId: string) {
    return this.chainManager.getChain(chainId);
  }


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

  public determineResultType(result: ChainExecutionResult): InteractionType {
    if (typeof result.result === 'object') {
      if ('execution' in result.result) return InteractionType.TOOL_CALL;
      if ('goal' in result.result) return InteractionType.PLAN;
      if ('satisfied' in result.result) return InteractionType.JUDGEMENT;
    }
    return InteractionType.MESSAGE;
  }

  public async createSpecialisedAgent(agentCharacter: string, modelName?: string): Promise<Agent> {
    switch (agentCharacter) {
      case "validator":
        return await this.agentManager.createValidatorAgent(modelName);
      case "summarizer":
        return await this.agentManager.createSummaryAgent(modelName);
      default:
        throw new Error(`Invalid agent character: ${agentCharacter}`);
    }
  }

  

  // TODO: Need to incorporate into error into interaction and pipeline step
  validateToolCall(toolCall: AgentToolCall): boolean {
    const tool = this.agentManager.getToolByName(toolCall.execution.connectorName);
    if (!tool) {
      return false;
    }
    const executor = this.agentManager.getToolExecutor(tool.id);
    if (!executor) {
      return false;
    }
    return true;
  }

  getAgent(agentId: string) {
    return this.agentManager.getAgent(agentId);
  }

  getPlanContext(task: Task) {
    return this.planExecutionState.getPlanContext(task.planId);
  }


  // ----------- UI State -----------

  setUIWorkingStatus(status: string) {
    this.uiState.setWorkingStatus(status);
  }

  appendUIWorkingStatus(status: string) {
    this.uiState.appendWorkingStatus(status);
  }


  // ----------- Error Handling -----------
  private handleInteractionError(interaction: Interaction, error: unknown) {
    const result = this.errorHandler.handle(error, {
      interaction,
      agentId: interaction.sourceAgentId
    });
    
    interaction.status = InteractionStatus.FAILED;
    interaction.error = {
      code: result.code,
      message: result.message,
      timestamp: Date.now()
    };
  }

  private initializePipelines() {
    // Interaction Result Pipeline
    this.pipelines.interactionResult.registerStep(new ResponseValidationStep());
    this.pipelines.interactionResult.registerStep(new ToolCallReponseStep());
    this.pipelines.interactionResult.registerStep(new PlanResponseStep());
    this.pipelines.interactionResult.registerStep(new JudgementResponseStep());
    this.pipelines.interactionResult.registerStep(new MessageResponseStep());
    // this.pipelines.interactionResult.registerStep(new LoggingPipelineStep());
    this.pipelines.interactionResult.registerStep(new ResponseErrorStep());

    // Plan Execution Pipeline
    this.pipelines.planExecution.registerStep(new PlanExecutionPlanValidationStep());
    this.pipelines.planExecution.registerStep(new PlanExecutionInitializationStep());
    this.pipelines.planExecution.registerStep(new PlanExecutionTaskExecutionStep());
    this.pipelines.planExecution.registerStep(new PlanExecutionSummaryStep());

    // Task Execution Pipeline
    this.pipelines.taskExecution.registerStep(new TaskExecutionTaskValidationStep());
    this.pipelines.taskExecution.registerStep(new TaskExecutionChainExecutionStep());
    this.pipelines.taskExecution.registerStep(new TaskExecutionPlanResponseStep());
    this.pipelines.taskExecution.registerStep(new TaskExecutionMessageResponseStep());
    this.pipelines.taskExecution.registerStep(new TaskExecutionJudgementResponseStep());
    this.pipelines.taskExecution.registerStep(new TaskExecutionSummaryStep());
    this.pipelines.taskExecution.registerStep(new ExecutionValidationStep());
    this.pipelines.taskExecution.registerStep(new TaskExecutionErrorStep());
  }
}