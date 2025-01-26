import { UUID } from "crypto";
import { Task, TaskList } from "./types";

export class AgentError extends Error {
  public readonly timestamp: number;

  constructor(
    message: string, 
    public readonly context?: {
      error?: unknown;
      agentName?: string;
      status?: number;
      taskChain?: Task[] | TaskList;
      mode?: string;
      depth?: number;
      currentTask?: Task;
      systemPrompt?: string;
      messageCount?: number;
      taskChainId?: string;
    }
  ) {
    super(message);
    this.name = 'AgentError';
    this.timestamp = Date.now();
  }
}

export class ErrorTracker {
  private static instance: ErrorTracker | null = null;
  private errors: Map<UUID, AgentError[]> = new Map();
  private maxErrors = 100;
  private logger: Console = console;

  private constructor() {}

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  recordError(agentId: UUID, error: unknown, contextMessage?: string): void {
    let agentErrors = this.errors.get(agentId) || [];
    
    // Create AgentError object
    const agentError: AgentError = {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
      context: {
        error,
        ...(contextMessage && { contextMessage })
      }
    } as AgentError;

    // Add stack trace if available
    if (error instanceof Error) {
      agentError.stack = error.stack;
    }

    // Add to beginning of array (most recent first)
    agentErrors.unshift(agentError);

    // Limit to maxErrors
    if (agentErrors.length > this.maxErrors) {
      agentErrors = agentErrors.slice(0, this.maxErrors);
    }

    // Store in localStorage and memory
    this.errors.set(agentId, agentErrors);
    try {
      localStorage.setItem(`agent_errors_${agentId}`, JSON.stringify(agentErrors));
    } catch (e) {
      this.logger.error('Failed to store errors in localStorage:', e);
    }
  }

  getErrors(agentId: UUID): AgentError[] {
    // Try to get from memory first
    let errors = this.errors.get(agentId);
    
    // If not in memory, try localStorage
    if (!errors) {
      try {
        const storedErrors = localStorage.getItem(`agent_errors_${agentId}`);
        if (storedErrors) {
          errors = JSON.parse(storedErrors) as AgentError[];
          this.errors.set(agentId, errors);
        } else {
          errors = [];
        }
      } catch (e) {
        this.logger.error('Failed to retrieve errors from localStorage:', e);
        errors = [];
      }
    }

    return errors;
  }

  clearErrors(agentId: UUID): void {
    this.errors.delete(agentId);
    try {
      localStorage.removeItem(`agent_errors_${agentId}`);
    } catch (e) {
      this.logger.error('Failed to clear errors from localStorage:', e);
    }
  }
} 