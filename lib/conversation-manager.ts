import { UUID } from "crypto";
import { 
  Message, 
  Thread, 
  TaskList, 
  Task,
  Execution,
  ThreadStatus,
  TaskStatus,
  TaskListStatus
} from "./types";

export class ConversationManager {
  private static instance: ConversationManager | null = null;
  private threads: Map<UUID, Thread> = new Map();
  private logger: Console = console;

  private constructor() {}

  static getInstance(): ConversationManager {
    if (!ConversationManager.instance) {
      ConversationManager.instance = new ConversationManager();
    }
    return ConversationManager.instance;
  }

  // Thread Management
  createThread(): Thread {
    const threadId = crypto.randomUUID() as UUID;
    const thread: Thread = {
      id: threadId,
      messages: [],
      taskChains: [],
      status: ThreadStatus.ACTIVE,
      startTime: Date.now(),
      metadata: {}
    };
    this.threads.set(threadId, thread);
    return thread;
  }

  getThread(threadId: UUID): Thread | null {
    return this.threads.get(threadId) || null;
  }

  updateThreadStatus(threadId: UUID, status: ThreadStatus, endTime?: number): void {
    const thread = this.threads.get(threadId);
    if (thread) {
      thread.status = status;
      if (endTime) {
        thread.endTime = endTime;
      }
    }
  }

  // Message Management
  addMessage(message: Omit<Message, 'id'>, messageId?: UUID): Message {
    const thread = this.threads.get(message.threadId);
    if (!thread) {
      throw new Error(`Thread ${message.threadId} not found`);
    }

    const newMessage: Message = {
      ...message,
      id: messageId || crypto.randomUUID() as UUID,
    };

    thread.messages.push(newMessage);
    return newMessage;
  }

  getThreadMessages(threadId: UUID): Message[] {
    const thread = this.threads.get(threadId);
    return thread?.messages || [];
  }

  // Task Chain Management
  createTaskChain(threadId: UUID, sourceAgentId: UUID): UUID {
    const thread = this.threads.get(threadId);
    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }

    const taskChainId = crypto.randomUUID() as UUID;
    const taskChain: TaskList = {
      id: taskChainId,
      threadId,
      sourceAgentId,
      tasks: [],
      status: TaskListStatus.PENDING,
      startTime: Date.now(),
      executionFlow: [],
      metadata: {}
    };

    thread.taskChains.push(taskChain);
    return taskChainId;
  }

  addTask(chainId: UUID, task: Omit<Task, 'id' | 'chainId'>): UUID {
    const taskChain = this.findTaskChain(chainId);
    if (!taskChain) {
      throw new Error(`Task chain ${chainId} not found`);
    }

    const taskId = crypto.randomUUID() as UUID;
    const newTask: Task = {
      ...task,
      id: taskId,
      listId: chainId,
      status: TaskStatus.PENDING,
      startTime: Date.now(),
      metadata: {}
    };

    taskChain.tasks.push(newTask);
    return taskId;
  }

  updateTaskStatus(taskId: UUID, status: TaskStatus, result?: string, error?: string): void {
    const task = this.findTask(taskId);
    if (task) {
      task.status = status;
      if (result) task.result = result;
      if (error) task.error = error;
      if (status === TaskStatus.COMPLETED || status === TaskStatus.ERROR) {
        task.endTime = Date.now();
      }
    }
  }

  addExecution(taskId: UUID, execution: Omit<Execution, 'id' | 'taskId'>): UUID {
    const task = this.findTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const executionId = crypto.randomUUID() as UUID;
    const newExecution: Execution = {
      ...execution,
      id: executionId,
      taskId,
      timestamp: Date.now(),
      metadata: {}
    };

    const taskChain = this.findTaskChain(task.listId);
    if (taskChain) {
      taskChain.executionFlow.push(newExecution);
    }

    return executionId;
  }

  // Query Methods
  getTaskChainMessages(chainId: UUID): Message[] {
    const taskChain = this.findTaskChain(chainId);
    if (!taskChain) return [];

    return this.getThreadMessages(taskChain.threadId).filter(msg => 
      taskChain.tasks.some(task => 
        msg.taskId === task.id || 
        msg.sourceAgentId === task.sourceAgentId || 
        msg.targetAgentId === task.targetAgentId
      )
    );
  }

  getTaskMessages(taskId: UUID): Message[] {
    const task = this.findTask(taskId);
    if (!task) return [];

    return this.getThreadMessages(this.findTaskChainThread(task.listId)?.id as UUID)
      .filter(msg => msg.taskId === taskId);
  }

  // Helper Methods
  private findTaskChain(chainId: UUID): TaskList | undefined {
    for (const thread of this.threads.values()) {
      const chain = thread.taskChains.find(tc => tc.id === chainId);
      if (chain) return chain;
    }
    return undefined;
  }

  private findTask(taskId: UUID): Task | undefined {
    for (const thread of this.threads.values()) {
      for (const chain of thread.taskChains) {
        const task = chain.tasks.find(t => t.id === taskId);
        if (task) return task;
      }
    }
    return undefined;
  }

  private findTaskChainThread(chainId: UUID): Thread | undefined {
    return Array.from(this.threads.values()).find(thread => 
      thread.taskChains.some(tc => tc.id === chainId)
    );
  }

  // Utility Methods
  clearStore(): void {
    this.threads.clear();
  }

  clearThread(threadId: UUID): void {
    const thread = this.threads.get(threadId);
    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }

    thread.messages = [];
    thread.taskChains = [];
  }

  deleteThread(threadId: UUID): void {
    this.threads.delete(threadId);
  }
}