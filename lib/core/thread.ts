import { useThreadStore } from "../stores/thread-store";

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export enum InteractionType {
  MESSAGE = 'message',
  TASK = 'task',
  PLAN = 'plan',
  JUDGEMENT = 'judgement',
  TOOL_CALL = 'tool_call'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  BLOCKED = 'blocked'
}

export enum ThreadStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ARCHIVED = 'archived'
}

export interface AgentTask {
  step: number;
  instruction: string;
  tools?: (string | undefined)[];
  dependencies: string[];
  requiredAgent: string;
  reasoning: string;
}

export interface AgentPlan{
  goal: string;
  tasks: AgentTask[];
  reasoning: string;
}

export interface AgentToolCall {
  response: string
  execution: { 
    connectorName: string
    functionName: string
    parameters: Record<string, unknown>
  }      
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
  targetAgentId?: string;  // Made optional as not all interactions need a target
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
  status: TaskStatus;
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
  result: unknown;
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

  constructor(id: string, initiatingAgentId: string, metadata?: Record<string, unknown>) {
    super(id, metadata);
    this.initiatingAgentId = initiatingAgentId;
    this.status = ThreadStatus.ACTIVE;
  }

  addInteraction(interaction: Interaction): void {
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
  }

  getInteraction(id: string): Interaction | undefined {
    return this.interactions.find(interaction => interaction.id === id);
  }

  getInteractionsByType(type: InteractionType): Interaction[] {
    return this.interactions.filter(interaction => interaction.type === type);
  }

  getInteractionsByAgent(agentId: string): Interaction[] {
    return this.interactions.filter(interaction => 
      interaction.sourceAgentId === agentId || interaction.targetAgentId === agentId
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
      metadata: {}
    };
  } 
} 