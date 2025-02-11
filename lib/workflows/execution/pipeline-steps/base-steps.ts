import { Interaction, Thread, InteractionTarget, InteractionType } from "@/lib/core/entities/thread";
import { ChainExecutionResult } from "@/lib/workflows/chains/chain-manager";
import { OrchestrationManager } from "@/lib/orchestration/orchestration-manager";
import { Agent } from "@/lib/agents/agent-manager";

export interface BaseStep<T extends Interaction> {
  execute: (
    result: ChainExecutionResult,
    interaction: T,
    context: {
      thread: Thread
      sourceAgent: Agent
      targetAgent: Agent | InteractionTarget
      manager: OrchestrationManager
    }
  ) => Promise<void>
  shouldExecute: (interactionType: InteractionType) => boolean
}