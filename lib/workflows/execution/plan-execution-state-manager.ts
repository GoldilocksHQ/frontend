// lib/managers/execution-state-manager.ts
import { Plan, Task, InteractionStatus } from "../../core/entities/thread";
import { Semaphore } from "../../utils/semaphore";
import { ConcurrencyError } from "../../core/managers/error-manager";

interface TaskState {
  step: number;
  status: InteractionStatus;
  attempts: number;
  lastError?: string;
  instruction: string;
  dependencies: string[];
  output?: unknown;
}

export interface TaskExecutionSquad {
  executorAgent: {
    id: string,
    output?: unknown
  },
  validatorAgent?: {
    id: string,
    output?: unknown
  },
  summarizerAgent?: {
    id: string,
    output?: unknown
  }
}

// This class is used to store the state of a plan execution.
export class PlanExecutionContext {
  constructor(
    public plan: Plan,
    public taskQueue: Task[] = [],
    public dependencies: Map<string, string[]> = new Map(),
    public results: Map<string, unknown> = new Map(),
    public taskStates: Map<string, TaskState> = new Map(),
    public taskSquad: Map<string, TaskExecutionSquad> = new Map()
  ) {}
}

// This class is used to manage the state of a plan execution.
export class PlanExecutionStateManager {
  private contexts = new Map<string, PlanExecutionContext>();
  private semaphore = new Semaphore(3);
  
  createContext(plan: Plan) {
    const context = new PlanExecutionContext(plan, plan.tasks);
    this.contexts.set(plan.id, context);
    return context;
  }

  getTaskDependencies(taskId: string): string[] {
    return this.contexts.get(taskId)?.dependencies.get(taskId) || [];
  }

  recordTaskResult(task: Task, result: unknown) {
    const context = this.contexts.get(task.planId);
    if (context) {
      context.results.set(task.id, result);
      const state = context.taskStates.get(task.id);
      if (state) {
        state.status = InteractionStatus.SUCCESS;
        state.output = result;
      }
      task.status = InteractionStatus.SUCCESS;
    }
  }

  getPlanContext(planId: string): PlanExecutionContext | undefined {
    return this.contexts.get(planId);
  }

  serializeContext(planId: string): string {
    const context = this.contexts.get(planId);
    return JSON.stringify({
      plan: structuredClone(context?.plan),
      taskQueue: structuredClone(context?.taskQueue),
      dependencies: Array.from(context?.dependencies.entries() || []),
      results: Array.from(context?.results.entries() || []),
      taskStates: Array.from(context?.taskStates.entries() || []),
      squad: Array.from(context?.taskSquad.entries() || [])
    });
  }

  restoreContext(planId: string, snapshot: string) {
    const data = JSON.parse(snapshot);
    this.contexts.set(planId, new PlanExecutionContext(
      data.plan,
      data.taskQueue,
      new Map(data.dependencies),
      new Map(data.results),
      new Map(data.taskStates),
      new Map(data.squad)
    ));
  }

  // This function is used to execute a task with concurrency limit and timeout.
  async executeWithConcurrency<T>(taskId: string, func: () => Promise<T>): Promise<T> {
    await this.semaphore.acquire();
    try {
      return await Promise.race([
        func(),
        new Promise<T>((_, reject) => 
          setTimeout(() => reject(new ConcurrencyError('Task timeout')), 120000)
        )
      ]);
    } finally {
      this.semaphore.release();
    }
  }

  // This function is used to validate the dependencies of a task.
  validateDependencies(task: Task): boolean {
    const context = this.getPlanContext(task.planId);
    const deps = context?.dependencies.get(task.id) || [];
    
    return deps.every(depId => {
      const depState = context?.taskStates.get(depId);
      return depState?.status === InteractionStatus.SUCCESS && 
             !depState.lastError;
    });
  }

  // This function is used to record an error for a task.
  recordTaskError(task: Task, error: Error) {
    const context = this.getPlanContext(task.planId);
    const state = context?.taskStates.get(task.id);
    if (context && state) {
      context.taskStates.set(task.id, {
        ...state,
        attempts: state.attempts + 1,
        lastError: error.message
      });
    }
  }

  // This function is used to get the result of a task.
  getTaskResult(task: Task): unknown {
    return this.getPlanContext(task.planId)?.results.get(task.id);
  }

  // This function is used to check if a task is ready to be executed.
  isTaskReady(task: Task): boolean {
    return this.validateDependencies(task) && 
      (this.getTaskAttempts(task) < 3);
  }

  // This function is used to get the number of attempts for a task.
  getTaskAttempts(task: Task): number {
    return this.getPlanContext(task.planId)?.taskStates.get(task.id)?.attempts || 0;
  }

  // This function is used to initialize the task states within a plan.
  initializeTaskStates(planId: string) {
    const context = this.getPlanContext(planId);
    if (context) {
      for (const task of context.plan.tasks) {
        context.taskStates.set(task.id, {
          step: task.step,
          status: InteractionStatus.PENDING,
          attempts: 0,
          instruction: task.instruction,
          dependencies: task.dependencies || [],
          output: undefined
        });
        context.taskSquad.set(task.id, {
          executorAgent: {
            id: task.targetAgentId,
            output: undefined
          },
          validatorAgent: undefined,
          summarizerAgent: undefined
        });
      }
    }
  }

  getTaskSquad(task: Task) {
    return this.getPlanContext(task.planId)?.taskSquad.get(task.id);
  }

  updateTaskSquad(task: Task, update: Partial<TaskExecutionSquad>) {
    const planContext = this.getPlanContext(task.planId);
    if (!planContext) return;

    const existing = planContext.taskSquad.get(task.id);
    if (existing) {
      planContext.taskSquad.set(task.id, { ...existing, ...update });
    }
  }
}