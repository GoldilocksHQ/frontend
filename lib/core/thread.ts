import { useThreadStore } from "../stores/thread-store";

export enum MessageRole {
  USER = "user",
  ASSISTANT = "assistant",
  SYSTEM = "system",
}

export enum InteractionType {
  MESSAGE = "message",
  TASK = "task",
  PLAN = "plan",
  JUDGEMENT = "judgement",
  TOOL_CALL = "tool_call",
}

export enum InteractionStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  SUCCESS = "success",
  FAILED = "failed",
  BLOCKED = "blocked",
}

export enum ThreadStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  FAILED = "failed",
  ARCHIVED = "archived",
}

export interface AgentTask {
  step: number;
  instruction: string;
  tools?: (string | undefined)[];
  dependencies: string[];
  requiredAgentId: string;
  reasoning: string;
}

export interface AgentPlan {
  goal: string;
  tasks: AgentTask[];
  reasoning: string;
}

export interface AgentToolCall {
  response?: string;
  execution: {
    connectorName: string;
    functionName: string;
    parameters: Record<string, unknown>;
  };
  output?: string;
}

export interface AgentJudgement {
  satisfied: boolean;
  score: number;
  analysis: {
    strengths: string[];
    weaknesses: string[];
    missing: string[];
  };
  feedback: string;
  taskId?: string;
}

export interface InteractionError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
  stack?: string;
}

/**
 * Common fields for all interactions in a thread
 */
export interface BaseEntity {
  id: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}

/**
 * Base interface for all interactions in a thread
 */
export interface Interaction extends BaseEntity {
  threadId: string;
  type: InteractionType;
  sourceAgentId?: string;
  targetAgentId?: string;
  status: InteractionStatus;
  error?: InteractionError;
}

/**
 * Represents a message interaction
 */
export interface Message extends Interaction {
  type: InteractionType.MESSAGE;
  role: MessageRole;
  content: string;
}

/**
 * Represents a task interaction
 */
export interface Task extends Interaction {
  type: InteractionType.TASK;
  instruction: string;
  planId?: string;
  step?: number;
  dependencies?: string[];
  result?: unknown;
}

/**
 * Represents a tool call interaction
 */
export interface ToolCall extends Interaction {
  type: InteractionType.TOOL_CALL;
  toolName: string;
  functionName: string;
  parameters: Record<string, unknown>;
  result?: unknown;
}

/**
 * Represents a plan interaction
 */
export interface Plan extends Interaction {
  type: InteractionType.PLAN;
  id: string;
  goal: string;
  tasks: Task[];
  reasoning: string;
  completedTaskIds: string[];
}

/**
 * Represents a judgement interaction
 */
export interface Judgement extends Interaction {
  type: InteractionType.JUDGEMENT;
  satisfied: boolean;
  score: number;
  analysis: {
    strengths: string[];
    weaknesses: string[];
    missing: string[];
  };
  feedback: string;
  taskId?: string;
}

/**
 * Updates that can be applied to a thread
 */
export interface ThreadUpdate {
  status?: ThreadStatus;
  activeAgentId?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Base class for thread entity management
 */
export class ThreadEntity implements BaseEntity {
  id: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;

  constructor(id: string, metadata?: Record<string, unknown>) {
    this.id = id;
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
    this.metadata = metadata;
  }

  protected update(metadata?: Record<string, unknown>): void {
    this.updatedAt = Date.now();
    if (metadata) {
      this.metadata = { ...this.metadata, ...metadata };
    }
  }
}

/**
 * Main thread management class for recording agent interactions and conversation flow.
 */
export class Thread extends ThreadEntity {
  status: ThreadStatus;
  initiatingAgentId: string;
  interactions: Interaction[] = [];
  messages: Message[] = [];
  tasks: Task[] = [];
  plans: Plan[] = [];
  judgements: Judgement[] = [];
  error?: string;
  lastErrorAt?: number;
  activeAgentId?: string;

  constructor(
    id: string,
    initiatingAgentId: string,
    metadata?: Record<string, unknown>
  ) {
    super(id, metadata);
    this.initiatingAgentId = initiatingAgentId;
    this.status = ThreadStatus.ACTIVE;
  }

  addInteraction(interaction: Interaction): Interaction {
    this.interactions.push(interaction);

    // Categorize interaction
    switch (interaction.type) {
      case InteractionType.MESSAGE:
        this.messages.push(interaction as Message);
        break;
      case InteractionType.TASK:
        this.tasks.push(interaction as Task);
        break;
      case InteractionType.PLAN:
        this.plans.push(interaction as Plan);
        break;
      case InteractionType.JUDGEMENT:
        this.judgements.push(interaction as Judgement);
        break;
    }

    this.update();
    useThreadStore.getState().updateThread(this.id, this);
    return this.interactions.at(-1) as Interaction;
  }

  getInteraction(id: string): Interaction | undefined {
    return this.interactions.find((interaction) => interaction.id === id);
  }

  getInteractionsByType(type: InteractionType): Interaction[] {
    return this.interactions.filter((interaction) => interaction.type === type);
  }

  getInteractionsByAgent(agentId: string): Interaction[] {
    return this.interactions.filter(
      (interaction) =>
        interaction.sourceAgentId === agentId ||
        interaction.targetAgentId === agentId
    );
  }

  updateStatus(status: ThreadStatus, error?: string): void {
    this.status = status;
    if (error) {
      this.error = error;
      this.lastErrorAt = Date.now();
    }
    this.update();
    useThreadStore.getState().updateThread(this.id, this);
  }

  applyUpdate(update: ThreadUpdate): void {
    if (update.status !== undefined) {
      this.status = update.status;
    }
    if (update.activeAgentId !== undefined) {
      this.activeAgentId = update.activeAgentId;
    }
    if (update.error !== undefined) {
      this.error = update.error;
      this.lastErrorAt = Date.now();
    }

    this.update(update.metadata);
    useThreadStore.getState().updateThread(this.id, this);
  }

  createBaseEntity(): BaseEntity {
    return {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {},
    };
  }

  // Utility functions for constructing new interactions
  constructNewInteraction(
    interactionType: InteractionType,
    sourceAgentId?: string,
    targetAgentId?: string
  ): Interaction {
    const interaction: Interaction = {
      ...this.createBaseEntity(),
      threadId: this.id,
      status: InteractionStatus.PENDING,
      type: interactionType,
      sourceAgentId: sourceAgentId,
      targetAgentId: targetAgentId,
    };
    this.addInteraction(interaction);
    return interaction;
  }

  appendPlanConstruction(
    interaction: Interaction,
    result: AgentPlan,
    thread: Thread
  ): Plan {
    // Validate the plan structure
    if (!result || typeof result !== "object") {
      throw new Error("Invalid plan structure: result must be an object");
    }

    if (!result.goal || typeof result.goal !== "string") {
      throw new Error("Invalid plan structure: goal must be a string");
    }

    if (!Array.isArray(result.tasks)) {
      throw new Error("Invalid plan structure: tasks must be an array");
    }

    // Construct the plan
    (interaction as Plan).goal = result.goal;
    (interaction as Plan).reasoning = result.reasoning || "";
    (interaction as Plan).tasks = [];
    (interaction as Plan).completedTaskIds = [];
    (interaction as Plan).status = InteractionStatus.PENDING;

    // Process each task
    for (const taskInfo of result.tasks) {
      if (!taskInfo || typeof taskInfo !== "object") {
        throw new Error("Invalid task structure in plan");
      }

      const task = {
        ...thread.createBaseEntity(),
        threadId: thread.id,
        type: InteractionType.TASK,
        instruction: taskInfo.instruction || "",
        status: InteractionStatus.PENDING,
        targetAgentId: taskInfo.requiredAgentId,
        dependencies: Array.isArray(taskInfo.dependencies)
          ? taskInfo.dependencies.map(String)
          : [],
        planId: interaction.id,
        step: taskInfo.step || 0,
      };

      (interaction as Plan).tasks.push(task as Task);
    }

    return interaction as Plan;
  }

  appendToolCallInteractionConstruction(
    interaction: Interaction,
    toolCall: AgentToolCall
  ): ToolCall {
    (interaction as ToolCall).toolName = toolCall.execution.connectorName;
    (interaction as ToolCall).functionName = toolCall.execution.functionName;
    (interaction as ToolCall).parameters = toolCall.execution.parameters;
    return interaction as ToolCall;
  }

  appendJudgementConstruction(
    interaction: Interaction,
    result: AgentJudgement
  ): Judgement {
    (interaction as Judgement).satisfied = result.satisfied;
    (interaction as Judgement).score = result.score;
    (interaction as Judgement).analysis = result.analysis;
    (interaction as Judgement).feedback = result.feedback;
    return interaction as Judgement;
  }

  appendMessageConstruction(
    interaction: Message,
    role: MessageRole,
    content: string
  ): Message {
    (interaction as Message).role = role;
    (interaction as Message).content = content;
    return interaction as Message;
  }

  appendErrorInteractionConstruction(
    interaction: Interaction,
    error: unknown
  ): Message {
    const interactionError: InteractionError = {
      code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
      message:
        error instanceof Error ? error.message : "An unknown error occurred",
      details:
        error instanceof Error
          ? { stack: JSON.stringify(error.stack) }
          : undefined,
      timestamp: Date.now(),
    };
    (interaction as Interaction).error = interactionError;
    (interaction as Interaction).status = InteractionStatus.FAILED;
    return interaction as Message;
  }
}
