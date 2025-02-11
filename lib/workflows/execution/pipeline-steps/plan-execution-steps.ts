// Create a pipeline for plan execution. Take reference from orchestration manager.

import { AgentMessage, InteractionStatus, InteractionTarget, InteractionType, Judgement, Message, MessageRole, Plan, Thread } from "@/lib/core/entities/thread";
import { BaseStep } from "./base-steps";
import { OrchestrationManager } from "@/lib/orchestration/orchestration-manager";
import { Agent } from "@/lib/agents/agent-manager";
import { ChainExecutionResult, ChainType } from "../../chains/chain-manager";
import { Task } from "../../../core/entities/thread";

export class PlanExecutionPlanValidationStep implements BaseStep<Plan> {
  async execute(result: ChainExecutionResult, interaction: Plan, context: {
    thread: Thread
    sourceAgent: Agent
    targetAgent: Agent | InteractionTarget
    manager: OrchestrationManager
  }) {
    if (!interaction.sourceAgentId) {
      throw new Error("Plan source agent ID not found");
    }
    const planInitiatingAgent = context.manager.getAgent(interaction.sourceAgentId);
    if (!planInitiatingAgent) {
      throw new Error("Plan initiating agent not found");
    }
  }

  shouldExecute() {
    return true;
  }
} 

export class PlanExecutionInitializationStep implements BaseStep<Plan> {
  async execute(result: ChainExecutionResult, interaction: Plan, context: {
    thread: Thread
    sourceAgent: Agent
    targetAgent: Agent | InteractionTarget
    manager: OrchestrationManager
  }) {
    context.manager.planExecutionState.createContext(interaction);
    context.manager.planExecutionState.initializeTaskStates(interaction.id);
    
    // Send initial plan goal
    context.manager.setUIWorkingStatus(`Start Executing Plan: ${interaction.goal}\n`);
  }
  
  shouldExecute() {
    return true;
  }
}

export class PlanExecutionTaskExecutionStep implements BaseStep<Plan> {
  async execute(result: ChainExecutionResult, interaction: Plan, context: {
    thread: Thread
    sourceAgent: Agent
    targetAgent: Agent | InteractionTarget
    manager: OrchestrationManager
  }) {
    // Execute the tasks in order
    for (const task of interaction.tasks) {
      // Update status with current task
      context.manager.appendUIWorkingStatus(
        `Processing Task ${task.step}: ${task.instruction}\n`
      );

      const agent = context.manager.getAgent(task.targetAgentId!);
      if (!agent) throw new Error("Agent not found");

      // Get the plan context
      const planContext = context.manager.planExecutionState.getPlanContext(interaction.id);
      if (!planContext) throw new Error("Plan context not found");

      const agentChain = context.manager.getChain(agent.chainId!);
      if (!agentChain) throw new Error("Agent chain not found");

      let resultApproved: boolean = false;
      let attempts: number = 0;
      let missing: string[] = [];

      // Get the dependencies
      const dependencies = planContext.taskStates.get(task.id)?.dependencies || [];
      const prevTasks = context.manager.getPreviousTasks(dependencies, planContext);

      while (!resultApproved && attempts < 3) {

        // Prepare the task input
        const input  = this.prepareTaskInput(interaction, task, agentChain!.type, prevTasks, missing);
        const formattedInput = context.manager.chainInputStrategies[agentChain!.type](input);
        
        // Execute the task
        await context.manager.executeTask(task, context.thread, agentChain.id, formattedInput);

        // Get the result
        interaction.tasks.find(t => t.id === task.id)!.result = context.manager.planExecutionState.getTaskResult(task);

        // Get the validation result
        const validationResult = planContext.taskSquad.get(task.id)?.validatorAgent?.output as Judgement;
        resultApproved = validationResult?.satisfied || false;
        
        if (!resultApproved) {
          attempts = context.manager.planExecutionState.getTaskAttempts(task);
          missing = !validationResult?.satisfied ? validationResult.analysis.missing : [];
        }
      }

      if (task.status === InteractionStatus.FAILED) {
        break;
      }
    }
  }

  shouldExecute() {
    return true;
  }

  private prepareTaskInput(plan: Plan, task: Task, chainType: ChainType, previousTasks?: Record<string, string>[], missing?: string[], ) {
    const taskMessage = 
      (chainType === ChainType.TASK_PLANNING 
        ? `` 
        : `Overall Goal: ${plan.goal}\n\n`) +
      `Current Task: ${task.instruction}` + 
      (task.keyInputs && task.keyInputs.length > 0 
        ? `\nKey Inputs:\n${task.keyInputs.join("\n")}` 
        : "") +
      (missing && missing.length > 0 
        ? `\nDon't miss the following: ${missing.map((m) => "["+m+"]").join(", ")}` 
        : "")+
      (previousTasks && previousTasks.length > 0 
        ? `Previous Tasks:\n${previousTasks.map((t) => `Instruction: ${t.instruction}\nResult: ${t.result}`).join("\n")}\n\n` 
        : "") ;
    const decodedTaskMessage = decodeURIComponent(taskMessage);
    return decodedTaskMessage;
  }
}

export class PlanExecutionSummaryStep implements BaseStep<Plan> {
  async execute(result: ChainExecutionResult, interaction: Plan, context: {
    thread: Thread
    sourceAgent: Agent
    targetAgent: Agent | InteractionTarget
    manager: OrchestrationManager
  }) {
    const planContext = context.manager.planExecutionState.getPlanContext(interaction.id);
    if (!planContext) {
      throw new Error("Plan context not found");
    }

    const summaryText = this.createPlanExecutionSummary(interaction);
    const summaryAgent = await context.manager.createSpecialisedAgent("summarizer");
    const summaryContent = await this.executeSummary(context.manager, summaryText, summaryAgent, context.sourceAgent, context.thread);
    await this.createFinalSummaryMessage(summaryContent, context.sourceAgent, context.targetAgent, context.thread); 
  }
  
  shouldExecute() {
    return true;
  }

  private createPlanExecutionSummary(plan: Plan): string {
    const allTaskResults = Array.from(plan.tasks).map(task => {
      return {
        step: task.step,
        instruction: task.instruction,
        result: task.result,
        status: task.status
      }
    });
    const structuredOutput = JSON.stringify({
        goal: plan.goal,
        tasks: allTaskResults
    });
    return structuredOutput;
  }
  // private createPlanExecutionSummary(plan: Plan, results: string[]): string {
  //   const summary = `Overall Goal: ${plan.goal}\n\n
  //     Previous Tasks:\n${results.join("\n")}\n\n
  //   `;
  //   return summary;
  // }

  private async executeSummary(manager: OrchestrationManager, planSummary: string, sourceAgent: Agent, targetAgent: Agent, thread: Thread): Promise<string> {
    const summaryInput = 
    `Provide a direct concise answer to the goal. If plan execution failed, then provide a concise explanation of the failure.\n`+
    `Then summarise the plan and final outputs in the end.\n\n${planSummary}`;
    const summaryResult = await manager.handleChainExecution(thread, summaryInput, sourceAgent);
    const summaryInteraction = await manager.handleChainResult(
      summaryResult,
      thread,
      sourceAgent,
      targetAgent
    ) as Message;
    return JSON.parse(summaryInteraction.content);
  }

  private async createFinalSummaryMessage(summaryContent: string, sourceAgent: Agent, targetAgent: Agent | InteractionTarget, thread: Thread): Promise<Message> {
    const summaryMessage = thread.constructNewInteraction(
      InteractionType.MESSAGE,
      sourceAgent.id,
      targetAgent === InteractionTarget.USER ? InteractionTarget.USER : targetAgent.id
    ) as Message;
    const outputMessage = thread.appendMessageConstruction(
      summaryMessage, {
        role: MessageRole.ASSISTANT,
        content: summaryContent
      } as AgentMessage
    ) as Message;
    return outputMessage;
  }
}