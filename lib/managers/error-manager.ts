import { UUID } from "crypto";
import { Manager } from "../core/base-manager";
import { ManagerStatus } from "../types";

export interface ErrorContext {
  timestamp: number;
  source: string;
  severity: ErrorSeverity;
  metadata?: Record<string, unknown>;
}

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical"
}

export interface ErrorFilter {
  source?: string;
  severity?: ErrorSeverity;
  startTime?: number;
  endTime?: number;
}

export class ManagedError extends Error {
  readonly id: UUID;
  readonly context: ErrorContext;

  constructor(message: string, context: Partial<ErrorContext>) {
    super(message);
    this.name = 'ManagedError';
    this.id = crypto.randomUUID() as UUID;
    this.context = {
      timestamp: context.timestamp || Date.now(),
      source: context.source || 'unknown',
      severity: context.severity || ErrorSeverity.MEDIUM,
      metadata: context.metadata
    };
  }
}

export class ErrorManager extends Manager {
  private static instance: ErrorManager | null = null;
  private errors: Map<UUID, ManagedError> = new Map();
  private maxErrors: number = 1000;

  private constructor() {
    super({ name: 'ErrorManager' });
  }

  static getInstance(): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager();
    }
    return ErrorManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      this.setStatus(ManagerStatus.INITIALIZING);
      // Load any persisted errors from storage if needed
      this.setStatus(ManagerStatus.READY);
    } catch (error) {
      this.handleError(error as Error, { context: 'initialization' });
    }
  }

  logError(error: Error | string, context?: Partial<ErrorContext>): UUID {
    const managedError = new ManagedError(
      error instanceof Error ? error.message : error,
      context || {}
    );

    // Add to beginning of map (most recent first)
    this.errors.set(managedError.id, managedError);

    // Trim old errors if we exceed maxErrors
    if (this.errors.size > this.maxErrors) {
      const oldestKey = Array.from(this.errors.keys())[this.maxErrors];
      this.errors.delete(oldestKey);
    }

    // Log to console
    this.logger.error(
      `[${managedError.context.severity}] ${managedError.message}`,
      managedError.context
    );

    return managedError.id;
  }

  getError(id: UUID): ManagedError | undefined {
    return this.errors.get(id);
  }

  getErrors(filter?: ErrorFilter): ManagedError[] {
    let errors = Array.from(this.errors.values());

    if (filter) {
      errors = errors.filter(error => {
        const matchesSource = !filter.source || error.context.source === filter.source;
        const matchesSeverity = !filter.severity || error.context.severity === filter.severity;
        const matchesTimeRange = (!filter.startTime || error.context.timestamp >= filter.startTime) &&
                               (!filter.endTime || error.context.timestamp <= filter.endTime);
        
        return matchesSource && matchesSeverity && matchesTimeRange;
      });
    }

    return errors;
  }

  clearErrors(filter?: ErrorFilter): void {
    if (!filter) {
      this.errors.clear();
      return;
    }

    for (const [id, error] of this.errors.entries()) {
      const matchesSource = !filter.source || error.context.source === filter.source;
      const matchesSeverity = !filter.severity || error.context.severity === filter.severity;
      const matchesTimeRange = (!filter.startTime || error.context.timestamp >= filter.startTime) &&
                             (!filter.endTime || error.context.timestamp <= filter.endTime);
      
      if (matchesSource && matchesSeverity && matchesTimeRange) {
        this.errors.delete(id);
      }
    }
  }

  async handleError(error: Error | ManagedError, context?: Record<string, unknown>): Promise<void> {
    if (error instanceof ManagedError) {
      this.logError(error.message, error.context);
    } else {
      this.logError(error, { 
        severity: ErrorSeverity.HIGH,
        metadata: context
      });
    }
  }
} 