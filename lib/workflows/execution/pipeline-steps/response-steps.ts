import { BaseStep } from "./base-steps";
import {
  Thread,
  Interaction,
  InteractionStatus,
  InteractionType,
  InteractionTarget,
  Message,
  MessageRole,
  Plan,
  ToolCall,
  AgentToolCall,
  AgentJudgement,
  AgentPlan,
  AgentMessage,
  Judgement,
} from "../../../core/entities/thread";
import { ChainExecutionResult } from "../../../workflows/chains/chain-manager";
import { Agent } from "../../../agents/agent-manager";
import { OrchestrationManager } from "../../../orchestration/orchestration-manager";
import { ValidationError } from "../../../core/managers/error-manager";

export class ToolCallReponseStep implements BaseStep<ToolCall> {
  async execute(
    result: ChainExecutionResult,
    interaction: ToolCall,
    context: {
      thread: Thread;
      sourceAgent: Agent;
      targetAgent: Agent | InteractionTarget;
      manager: OrchestrationManager;
    }
  ) {
    interaction.status = InteractionStatus.IN_PROGRESS;
    const toolCall = result.result as AgentToolCall;

    context.thread.appendToolCallInteractionConstruction(interaction, toolCall);

    try {
      const toolResult = await context.manager.executeToolCall(
        toolCall,
        context.sourceAgent.id
      );

      interaction.result = {
        ...toolCall,
        output: JSON.stringify(toolResult, null, 2),
      };
      interaction.status = InteractionStatus.SUCCESS;
    } catch (error) {
      interaction.status = InteractionStatus.FAILED;
      context.manager.errorHandler.handle(error, {
        interaction,
        chainType: context.manager.getChain(context.sourceAgent.chainId)!.type,
      });
    }
  }

  shouldExecute(type: InteractionType) {
    return type === InteractionType.TOOL_CALL;
  }
}

export class PlanResponseStep implements BaseStep<Plan> {
  async execute(
    result: ChainExecutionResult,
    interaction: Plan,
    context: {
      thread: Thread;
      sourceAgent: Agent;
      targetAgent: Agent | InteractionTarget;
      manager: OrchestrationManager;
    }
  ) {
    interaction.status = InteractionStatus.IN_PROGRESS;
    context.thread.appendPlanConstruction(
      interaction,
      result.result as AgentPlan,
      context.thread
    );

    // await context.manager.executePlan(
    //   interaction,
    //   context.thread,
    //   await context.manager.agentManager.createValidatorAgent(),
    //   await context.manager.agentManager.createSummaryAgent(),
    //   true
    // );
  }

  shouldExecute(type: InteractionType) {
    return type === InteractionType.PLAN;
  }
}

export class JudgementResponseStep implements BaseStep<Judgement> {
  async execute(
    result: ChainExecutionResult,
    interaction: Judgement,
    context: {
      thread: Thread;
      sourceAgent: Agent;
      targetAgent: Agent | InteractionTarget;
      manager: OrchestrationManager;
    }
  ) {
    interaction.status = InteractionStatus.IN_PROGRESS;
    const judgement = result.result as AgentJudgement;
    context.thread.appendJudgementConstruction(interaction, judgement);
    interaction.status = InteractionStatus.SUCCESS;
  }

  shouldExecute(type: InteractionType) {
    return type === InteractionType.JUDGEMENT;
  }
}

export class MessageResponseStep implements BaseStep<Message> {
  async execute(
    result: ChainExecutionResult,
    interaction: Message,
    context: {
      thread: Thread;
      sourceAgent: Agent;
      targetAgent: Agent | InteractionTarget;
      manager: OrchestrationManager;
    }
  ) {
    interaction.status = InteractionStatus.IN_PROGRESS;
    context.thread.appendMessageConstruction(interaction, {
      role:
        context.targetAgent === InteractionTarget.USER
          ? MessageRole.ASSISTANT
          : MessageRole.USER,
      content: result.result,
    } as AgentMessage);
    interaction.status = InteractionStatus.SUCCESS;
  }

  shouldExecute(type: InteractionType) {
    return type === InteractionType.MESSAGE;
  }
}

export class ResponseValidationStep implements BaseStep<Interaction> {
  async execute(
    result: ChainExecutionResult,
    interaction: Interaction,
    context: {
      thread: Thread;
      sourceAgent: Agent;
      targetAgent: Agent | InteractionTarget;
      manager: OrchestrationManager;
    }
  ) {
    if (!result.success) {
      throw new ValidationError("Invalid chain execution result");
    }

    // TODO: Need to incorporate into error into interaction
    if (interaction.type === InteractionType.TOOL_CALL) {
      const toolCall = result.result as AgentToolCall;
      if (!context.manager.validateToolCall(toolCall)) {
        throw new ValidationError("Invalid tool call format");
      }
    }
  }

  shouldExecute() {
    return true; // Applies to all interaction types
  }
}

export class ResponseErrorStep implements BaseStep<Interaction> {
  async execute(
    result: ChainExecutionResult,
    interaction: Interaction,
    context: {
      thread: Thread;
      sourceAgent: Agent;
      targetAgent: Agent | InteractionTarget;
      manager: OrchestrationManager;
    }
  ) {
    if (interaction.status === InteractionStatus.FAILED) {
      context.manager.errorHandler.handle(
        new Error(interaction.error?.message || "Unknown error"),
        {
          interaction,
          chainType: (() => {
            const agent = context.manager.agentManager.getAgent(
              interaction.sourceAgentId!
            );
            const chain = context.manager.chainManager.getChain(agent!.chainId);
            return chain?.type;
          })(),
        }
      );
    }
  }

  shouldExecute() {
    return true;
  }
}
