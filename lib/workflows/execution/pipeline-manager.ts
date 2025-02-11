import { ChainExecutionResult } from "../chains/chain-manager";
import { Interaction, Thread, InteractionStatus, InteractionTarget, Plan } from "../../core/entities/thread";
import { OrchestrationManager } from "../../orchestration/orchestration-manager";
import { Agent } from "../../agents/agent-manager";
import { BaseStep } from "./pipeline-steps/base-steps";

// Create a base pipeline class that can be extended by other pipelines.
export class BasePipeline {
  protected steps: BaseStep<Interaction>[] = [];

  registerStep<T extends Interaction>(step: BaseStep<T>) {
    this.steps.push(step as BaseStep<Interaction>);
  }
}

export class InteractionResultPipeline extends BasePipeline {

  async process(
    result: ChainExecutionResult,
    interaction: Interaction,
    context: {
      thread: Thread
      sourceAgent: Agent
      targetAgent: Agent | InteractionTarget
      manager: OrchestrationManager
    }
  ) {
    const executionContext = {
      ...context,
      startTime: performance.now(),
      originalResult: structuredClone(result)
    };

    try {
      for (const step of this.steps) {
        if (step.shouldExecute(interaction.type)) {
          await step.execute(result, interaction, executionContext);
        }
      }
    } catch (error) {
      interaction.status = InteractionStatus.FAILED;
      executionContext.manager.errorHandler.handle(error, {
        interaction,
        chainType: executionContext.manager.getChain(
          (executionContext.sourceAgent as Agent)?.chainId
        )!.type || undefined
      });
      throw error;
    }
  }
}

export class PlanExecutionPipeline extends BasePipeline {
  async process(
    result: ChainExecutionResult, 
    interaction: Plan, 
    context: {
      thread: Thread
      sourceAgent: Agent
      targetAgent: Agent | InteractionTarget
      manager: OrchestrationManager
    }
  ) {
    const executionContext = {
      ...context,
      startTime: performance.now(),
      originalResult: structuredClone(result)
    };

    try {
      for (const step of this.steps) {
        if (step.shouldExecute(interaction.type)) {
          await step.execute(result, interaction, executionContext);
        }
      }
    } catch (error) {
      interaction.status = InteractionStatus.FAILED;
      executionContext.manager.errorHandler.handle(error, {
        interaction,
        chainType: executionContext.manager.getChain(
          (executionContext.sourceAgent as Agent)?.chainId
        )!.type || undefined
      });
    }
  }
}


export class TaskExecutionPipeline extends BasePipeline {
  async process(
    result: ChainExecutionResult,
    interaction: Interaction,
    context: {
      thread: Thread
      sourceAgent: Agent
      targetAgent: Agent | InteractionTarget
      manager: OrchestrationManager
    }
  ) {
    const executionContext = {
      ...context,
      startTime: performance.now(),
      originalResult: structuredClone(result)
    };

  try {
      const resultType = context.manager.determineResultType(result);
      for (const step of this.steps) {
        if (step.shouldExecute(resultType)) {
          await step.execute(result, interaction, executionContext);
        }
      }
    } catch (error) {
      interaction.status = InteractionStatus.FAILED;
      executionContext.manager.errorHandler.handle(error, {
        interaction,
        // chainType: executionContext.manager.getChain(
        //   (executionContext.sourceAgent as Agent)?.chainId
        // )!.type || undefined
      });
      throw error;
    }
  }
}

