import { ChainExecutionResult } from "../../chains/chain-manager";
import { 
  InteractionType, 
  InteractionStatus, 
  ToolCall, 
  Message, 
  Thread,
  Plan,
  Judgement,
  InteractionTarget,
  Task,
  AgentPlan,
} from "../../../core/entities/thread";
import { DependencyError } from "../../../core/managers/error-manager";
import { Agent } from "../../../agents/agent-manager";
import { OrchestrationManager } from "../../../orchestration/orchestration-manager";
import { TaskExecutionSquad } from "../plan-execution-state-manager";
import { BaseStep } from "./base-steps";





// export class LoggingPipelineStep implements BasePipelineStep<Interaction> {
//   async execute(result: ChainExecutionResult, interaction: Interaction, depth: number, context: {
//     thread: Thread
//     sourceAgent: Agent
//     targetAgent: Agent | InteractionTarget,
//     manager: OrchestrationManager
//   }) {
//     context.manager.logInteraction({
//       interactionType: interaction.type,
//       agentId: context.sourceAgent.id,
//       timestamp: Date.now(),
//       status: interaction.status,
//       duration: performance.now() - context.startTime
//     });
//   }

//   shouldExecute(type: InteractionType) {
//     return type !== InteractionType.JUDGEMENT; // Example filter: need to change
//   }
// }



export class TaskExecutionTaskValidationStep implements BaseStep<Task> {
  async execute(result: ChainExecutionResult, interaction: Task, context: {
    thread: Thread
    sourceAgent: Agent
    targetAgent: Agent | InteractionTarget,
    manager: OrchestrationManager
  }) {
    const task = interaction;

    if (!context.manager.planExecutionState.isTaskReady(task)) {
      throw new DependencyError(`Unmet dependencies for task ${task.id}`);
    }

    const agent = context.manager.agentManager.getAgent(task.targetAgentId!);
    if (!agent) throw new Error("Agent not found");
    if (!agent.chainId) throw new Error("No chain ID");
  }

  shouldExecute() {
    return true;
  }
}



export class TaskExecutionChainExecutionStep implements BaseStep<Task> {
  async execute(result: ChainExecutionResult, interaction: Task, context: {
    thread: Thread
    sourceAgent: Agent
    targetAgent: Agent | InteractionTarget,
    manager: OrchestrationManager
  }) {
    const task = interaction;
    task.status = InteractionStatus.IN_PROGRESS;

    const planContext = context.manager.getPlanContext(task);
    if (!planContext) throw new Error("Plan context not found");
    const taskSquad = planContext.taskSquad.get(task.id);
    if (!taskSquad) throw new Error("Task squad not found");
    
  
    const chainInteraction = await context.manager.handleChainResult(
      result,
      context.thread,
      context.targetAgent as Agent, //Task target is the sender of task response
      context.sourceAgent, //Task intiator is the receiver of task response
    );

    taskSquad.executorAgent = {
      id: context.sourceAgent.id,
      output: (() => {
        switch (chainInteraction.type) {
          case InteractionType.TOOL_CALL:
            const toolCall = chainInteraction as ToolCall;
            return toolCall.result;
          case InteractionType.PLAN:
            const plan = chainInteraction as Plan;
            return {
              goal: plan.goal,
              tasks: plan.tasks,
              reasoning: plan.reasoning
            }
          case InteractionType.JUDGEMENT:
            const judgement = chainInteraction as Judgement;
            return {
              satisfied: judgement.satisfied,
              score: judgement.score,
              analysis: judgement.analysis,
              feedback: judgement.feedback
            };
          case InteractionType.MESSAGE:
            const message = chainInteraction as Message;
            return message.content;
          default:
            return null;  
        }
      })()
    }
    
  }

  shouldExecute() {
    return true;
  }
}

export class TaskExecutionToolCallResponseStep implements BaseStep<Task> {
  async execute(result: ChainExecutionResult, interaction: Task, context: {
    thread: Thread
    sourceAgent: Agent
    targetAgent: Agent | InteractionTarget,
    manager: OrchestrationManager
  }) {
    const task = interaction;
    task.status = InteractionStatus.IN_PROGRESS;

    const planContext = context.manager.getPlanContext(task);
    if (!planContext) throw new Error("Plan context not found");
    const taskSquad = planContext.taskSquad.get(task.id);
    if (!taskSquad) throw new Error("Task squad not found");

    interaction.result = JSON.stringify((taskSquad.executorAgent.output, null, 2))

    interaction.status = InteractionStatus.SUCCESS;
  } 

  shouldExecute(resultType: InteractionType) {
    return resultType === InteractionType.TOOL_CALL;
  }
}

export class TaskExecutionPlanResponseStep implements BaseStep<Task> {
  async execute(result: ChainExecutionResult, interaction: Task, context: {
    thread: Thread
    sourceAgent: Agent
    targetAgent: Agent | InteractionTarget,
    manager: OrchestrationManager
  }) {
    const task = interaction;
    task.status = InteractionStatus.IN_PROGRESS;

    const planContext = context.manager.getPlanContext(task);
    if (!planContext) throw new Error("Plan context not found");
    const taskSquad = planContext.taskSquad.get(task.id);
    if (!taskSquad) throw new Error("Task squad not found");

    interaction.result = JSON.stringify(taskSquad.executorAgent.output, null, 2)
    const taskResult = taskSquad.executorAgent.output as ChainExecutionResult;

    // Execute the plan
    const plan = context.manager.interactionFactory.create(
      InteractionType.PLAN,
      context.thread,
      (context.targetAgent as Agent).id, // The agent that will create the plan
      context.sourceAgent.id, // The agent that will receive the plan response
    );
    context.manager.interactionFactory.appendSpecialization(plan, context.thread, taskResult.result as AgentPlan);

    await context.manager.executePlan(
      taskResult, 
      plan as Plan, 
      context.thread, 
      context.sourceAgent as Agent, 
      context.targetAgent,
    );

    // TODO: Should move to end of pipeline
    interaction.status = InteractionStatus.SUCCESS;
  }

  shouldExecute(resultType: InteractionType) {
    return resultType === InteractionType.PLAN;
  }
}

export class TaskExecutionMessageResponseStep implements BaseStep<Task> {
  async execute(result: ChainExecutionResult, interaction: Task, context: {
    thread: Thread
    sourceAgent: Agent
    targetAgent: Agent | InteractionTarget,
    manager: OrchestrationManager
  }) {
    const task = interaction;
    task.status = InteractionStatus.IN_PROGRESS;

    const planContext = context.manager.getPlanContext(task);
    if (!planContext) throw new Error("Plan context not found");
    const taskSquad = planContext.taskSquad.get(task.id);
    if (!taskSquad) throw new Error("Task squad not found");

    interaction.result = JSON.stringify(taskSquad.executorAgent.output, null, 2)

    interaction.status = InteractionStatus.SUCCESS;
  }

  shouldExecute(resultType: InteractionType) {
    return resultType === InteractionType.MESSAGE;
  }
}
    

export class TaskExecutionJudgementResponseStep implements BaseStep<Task> {
  async execute(result: ChainExecutionResult, interaction: Task, context: {
    thread: Thread
    sourceAgent: Agent
    targetAgent: Agent | InteractionTarget,
    manager: OrchestrationManager
  }) {
    const task = interaction;
    task.status = InteractionStatus.IN_PROGRESS;

    const planContext = context.manager.getPlanContext(task);
    if (!planContext) throw new Error("Plan context not found");
    const taskSquad = planContext.taskSquad.get(task.id);
    if (!taskSquad) throw new Error("Task squad not found");

    interaction.result = JSON.stringify(taskSquad.executorAgent.output, null, 2)

    interaction.status = InteractionStatus.SUCCESS;
  }

  shouldExecute(resultType: InteractionType) {
    return resultType === InteractionType.JUDGEMENT;
  }
}

export class TaskExecutionSummaryStep implements BaseStep<Task> {
  async execute(result: ChainExecutionResult, interaction: Task, context: {
    thread: Thread
    sourceAgent: Agent
    targetAgent: Agent | InteractionTarget,
    manager: OrchestrationManager
  }) {
    const task = interaction;
    // task.status = InteractionStatus.IN_PROGRESS;

    const planContext = context.manager.getPlanContext(task);
    if (!planContext) throw new Error("Plan context not found");
    const taskSquad = planContext.taskSquad.get(task.id);
    if (!taskSquad) throw new Error("Task squad not found");

    const validation = taskSquad.validatorAgent?.output as Judgement;
    let missing: string[] = [];
    if (validation && !validation.satisfied) {
      missing = validation.analysis.missing;
    }

    const taskResult = taskSquad.executorAgent.output as ChainExecutionResult;

    const summaryInput = this.summaryInput(task, taskResult, missing);
    const summaryAgent = await this.getSummaryAgent(context.manager, taskSquad);
    const summaryResult = await context.manager.handleChainExecution(context.thread, summaryInput, summaryAgent);
    const summaryInteraction = await context.manager.handleChainResult(
      summaryResult,
      context.thread,
      summaryAgent, // Summary agent is the sender of summary response
      context.manager.getAgent(taskSquad.executorAgent.id) as Agent, // Task initiator is the receiver of summary response
    ) as Message;

    // Update the task squad in the plan context
    context.manager.planExecutionState.updateTaskSquad(task, {
      ...taskSquad,
      summarizerAgent: {
        id: summaryAgent.id,
        output: summaryInteraction.content
      }
    });
    
    // task.status = InteractionStatus.SUCCESS;
  }

  shouldExecute() {
    return true;
  }

  private summaryInput(interaction: Task, result: ChainExecutionResult, missing?: string[]): string {
    return `Summarise the result and directly address the task in instruction.
      If task requires detail answer, then be comprehensive and detailed.
      If there are any errors, explain them

      Task: ${interaction.instruction}
      Result: ${JSON.stringify(result)}`+
      (missing && missing.length > 0 
        ? `\nDon't miss covering the following points: ${missing.map((m) => "["+m+"]").join(", ")}` 
        : "")
  }

  private async getSummaryAgent(manager: OrchestrationManager, taskSquad: TaskExecutionSquad): Promise<Agent> {
    if (!taskSquad?.summarizerAgent) {
      const agent = await manager.createSpecialisedAgent("summarizer");
      if (!agent.chainId) {
        throw new Error("Summarizer agent missing chain ID");
      }
      return agent;
    }
    const existingAgent = manager.getAgent(taskSquad.summarizerAgent.id);
    return existingAgent || await manager.createSpecialisedAgent("summarizer");
  }
}

export class ExecutionValidationStep implements BaseStep<Task> {
  async execute(result: ChainExecutionResult, interaction: Task, context: {
    thread: Thread
    sourceAgent: Agent
    targetAgent: Agent | InteractionTarget,
    manager: OrchestrationManager
  }) {
    const task = interaction;

    const planContext = context.manager.getPlanContext(task);
    if (!planContext) throw new Error("Plan context not found");
    const taskSquad = planContext.taskSquad.get(task.id);
    if (!taskSquad) throw new Error("Task squad not found");
    const taskResult = taskSquad.summarizerAgent?.output as ChainExecutionResult;
    
    const validatorInput = this.validatorInput(task, taskResult, context);
    const validatorAgent = await this.getValidatorAgent(context.manager, taskSquad);
    const validatorResult = await context.manager.handleChainExecution(context.thread, validatorInput, validatorAgent);

    // This calls another pipeline to handle the result
    await context.manager.handleChainResult(
      validatorResult,
      context.thread,
      validatorAgent, // Validator agent is the sender of validator response  
      context.manager.getAgent(taskSquad.executorAgent.id) as Agent, // Task initiator is the receiver of validator response
    ) as Judgement;

    // Update the task squad in the plan context
    context.manager.planExecutionState.updateTaskSquad(task, {
      ...taskSquad,
      validatorAgent: {
        id: validatorAgent.id,
        output: validatorResult.result
      }
    });

    // task.status = InteractionStatus.SUCCESS;
  }

  shouldExecute() {
    return true;
  }

  private validatorInput(interaction: Task, result: ChainExecutionResult, context: {
    manager: OrchestrationManager
  }): string {
    const resultInteractionType = context.manager.determineResultType(result);
    switch (resultInteractionType) { 
      case InteractionType.PLAN:
        return `Is the plan directly and comprehensively addressing the task in instruction?
          Instruction: ${JSON.stringify(interaction.instruction, null, 2)}
          Plan: ${JSON.stringify(result, null, 2)}`
      default:
        return `Does the result directly and sufficiently fulfil the task in instruction?
          Task: ${JSON.stringify(interaction.instruction, null, 2)}
          Result: ${JSON.stringify(result, null, 2)}`
    }
  }

  private async getValidatorAgent(manager: OrchestrationManager, taskSquad: TaskExecutionSquad): Promise<Agent> {

    if (!taskSquad?.validatorAgent) {
      return await manager.createSpecialisedAgent("validator");
    }
    return manager.getAgent(taskSquad.validatorAgent?.id) as Agent;
  }
}

export class TaskExecutionErrorStep implements BaseStep<Task> {
  async execute(result: ChainExecutionResult, interaction: Task, context: {
    thread: Thread
    sourceAgent: Agent
    targetAgent: Agent | InteractionTarget,
    manager: OrchestrationManager
  }) {
    const task = interaction;

    const planContext = context.manager.getPlanContext(task);
    if (!planContext) throw new Error("Plan context not found");
    const taskSquad = planContext.taskSquad.get(task.id);
    if (!taskSquad) throw new Error("Task squad not found");

    if (taskSquad.validatorAgent?.output as Judgement) {
      const judgement = taskSquad.validatorAgent!.output as Judgement;
      if (!judgement.satisfied) {
        context.manager.planExecutionState.recordTaskError(task, new Error("Task failed"));
        task.status = InteractionStatus.FAILED;
      } else {
        const taskResult = taskSquad.executorAgent.output;
        context.manager.planExecutionState.recordTaskResult(task, taskResult);
        task.status = InteractionStatus.SUCCESS;
      }
    }
    
  }

  shouldExecute() {
    return true;
  }
}