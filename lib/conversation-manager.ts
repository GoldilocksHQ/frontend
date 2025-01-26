import { UUID } from "crypto";
import { 
  Message, 
  Thread, 
  TaskList, 
  Task,
  Execution,
  ThreadStatus,
  TaskStatus,
  TaskListStatus,
  AgentMessage
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
      taskLists: [],
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
  addMessageToThread(messageData: Omit<Message, 'id'>): Message {
    const message: Message = {
      id: crypto.randomUUID() as UUID,
      ...messageData
    };
    
    const thread = this.threads.get(messageData.threadId);
    if (!thread) {
      throw new Error(`Thread ${messageData.threadId} not found`);
    }

    thread.messages.push(message);
    return message;
  }

  getMessage(messageId: string): Message | null {
    for (const thread of this.threads.values()) {
      const message = thread.messages.find(msg => msg.id === messageId);
      if (message) return message;
    }
    return null;
  }

  getThreadMessages(threadId: UUID): Message[] {
    const thread = this.threads.get(threadId);
    return thread?.messages || [];
  }

  // Task List Management
  createTaskList(threadId: UUID, sourceAgentId: UUID, metadata: Record<string, unknown>): TaskList {
    const thread = this.threads.get(threadId);
    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }

    const taskListId = crypto.randomUUID() as UUID;
    const taskList: TaskList = {
      id: taskListId,
      threadId,
      sourceAgentId,
      tasks: [],
      status: TaskListStatus.PENDING,
      startTime: Date.now(),
      executionFlow: [],
      metadata: metadata
    };

    thread.taskLists.push(taskList);
    return taskList;
  }

  addTask(listId: UUID, task: Omit<Task, 'id' | 'listId'>): Task {
    const taskList = this.findTaskList(listId);
    if (!taskList) {
      throw new Error(`Task list ${listId} not found`);
    }

    const taskId = crypto.randomUUID() as UUID;
    const newTask: Task = {
      ...task,
      id: taskId,
      listId: listId,
      status: TaskStatus.PENDING,
      startTime: Date.now(),
      metadata: {}
    };

    taskList.tasks.push(newTask);
    return newTask;
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

    const taskList = this.findTaskList(task.listId);
    if (taskList) {
      taskList.executionFlow.push(newExecution);
    }

    return executionId;
  }

  // Query Methods
  getTaskListMessages(listId: UUID): Message[] {
    const taskList = this.findTaskList(listId);
    if (!taskList) return [];

    return this.getThreadMessages(taskList.threadId).filter(msg => 
      taskList.tasks.some(task => 
        msg.taskId === task.id || 
        msg.sourceAgentId === task.sourceAgentId || 
        msg.targetAgentId === task.targetAgentId
      )
    );
  }

  getTaskMessages(taskId: UUID): Message[] {
    const task = this.findTask(taskId);
    if (!task) return [];

    return this.getThreadMessages(this.findTaskListThread(task.listId)?.id as UUID)
      .filter(msg => msg.taskId === taskId);
  }

  // Helper Methods
  private findTaskList(listId: UUID): TaskList | undefined {
    for (const thread of this.threads.values()) {
      const list = thread.taskLists.find(tc => tc.id === listId);
      if (list) return list;
    }
    return undefined;
  }

  private findTask(taskId: UUID): Task | undefined {
    for (const thread of this.threads.values()) {
      for (const list of thread.taskLists) {
        const task = list.tasks.find(t => t.id === taskId);
        if (task) return task;
      }
    }
    return undefined;
  }

  private findTaskListThread(listId: UUID): Thread | undefined {
    return Array.from(this.threads.values()).find(thread => 
      thread.taskLists.some(tc => tc.id === listId)
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
    thread.taskLists = [];
  }

  deleteThread(threadId: UUID): void {
    this.threads.delete(threadId);
  }

  // Helper method to translate Message to AgentMessage
  public translateMessageToAgentMessage(message: Message): AgentMessage {
    return {
      role: message.role,
      content: message.content,
      timestamp: message.timestamp
    };
  }

  public getAllThreadsWithAgent(agentId: UUID): Thread[] {
    return Array.from(this.threads.values()).filter(thread => 
      thread.messages.some(msg => msg.sourceAgentId === agentId || msg.targetAgentId === agentId)
    );
  }

  // Get all messages for this agent
  public getAllMessages(agentId: UUID): Message[] {
    const involvedThreads = this.getAllThreadsWithAgent(agentId);
    const historicMessages = involvedThreads.map(thread => 
      thread.messages.filter(msg => msg.sourceAgentId === agentId || msg.targetAgentId === agentId)
    ).flat();
    return historicMessages;
  } 

  // Get the last message for this agent
  public getLastMessage(agentId: UUID): Message | null {
    const messages = this.getAllMessages(agentId);
    messages.sort((a, b) => a.timestamp - b.timestamp);
    return messages[messages.length - 1];
  }
}