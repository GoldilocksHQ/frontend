import { ErrorManager, ErrorSeverity,  DependencyError, ValidationError, ConcurrencyError  } from "../core/managers/error-manager";
import { Interaction, InteractionType, Task } from "../core/entities/thread";
import { ChainType } from "../workflows/chains/chain-manager";

type ErrorContext = {
  interaction?: Interaction;
  task?: Task;
  chainType?: ChainType;
  agentId?: string;
};

export class OrchestrationErrorHandler {
  private errorCodes = new Map<string, string>([
    ['EC-100', 'Tool execution timeout'],
    ['EC-101', 'Invalid tool parameters'],
    ['EC-102', 'Chain configuration error'],
    ['EC-103', 'Task dependency failure'],
    ['EC-104', 'Validation error'],
    ['EC-105', 'Concurrency limit exceeded']
  ]);

  constructor(private errorManager: ErrorManager) {}

  handle(error: unknown, context: ErrorContext) {
    const errorCode = this.determineErrorCode(error, context);
    
    const metadata = {
      errorCode,
      interactionType: context.interaction?.type,
      // chainType: context.chainType,
      agentId: context.agentId,
      taskId: context.task?.id,
      planId: context.task?.planId,
    };

    this.errorManager.logError(error instanceof Error ? error : new Error(String(error)), {
      source: 'Orchestration',
      severity: this.getSeverity(errorCode),
      metadata
    });

    return {
      code: errorCode,
      message: this.errorCodes.get(errorCode) || 'Unknown orchestration error',
      retryable: this.isRetryable(errorCode)
    };
  }

  private determineErrorCode(error: unknown, context: ErrorContext): string {
    if (context.interaction?.type === InteractionType.TOOL_CALL) return 'EC-101';
    if (context.chainType === ChainType.TASK_PLANNING) return 'EC-102';
    if (error instanceof DependencyError) return 'EC-103';
    if (error instanceof ValidationError) return 'EC-104';
    if (error instanceof ConcurrencyError) return 'EC-105';
    return 'EC-100';
  }

  private getSeverity(code: string): ErrorSeverity {
    return code.startsWith('EC-1') ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM;
  }

  private isRetryable(code: string): boolean {
    return !['EC-102'].includes(code);
  }
}
