import { Manager } from "../core/managers/base-manager";
import { 
  Thread, 
  ThreadStatus, 
  Interaction,
} from "../core/entities/thread";
import { ErrorManager, ErrorSeverity } from "../core/managers/error-manager";
import { ManagerStatus } from "../core/managers/base-manager";
import { useThreadStore } from "../stores/thread-store";
import { OrchestrationManager } from "../orchestration/orchestration-manager";

/**
 * ConversationManager orchestrates the conversation flow and manages threads.
 * It coordinates between agents and chains, recording all interactions.
 * 
 * Key responsibilities:
 * - Creates and manages threads
 * - Coordinates agent interactions
 * - Records all interactions in threads
 * - Delegates chain execution to ChainManager
 * - Routes messages between agents
 */
export class ConversationManager extends Manager {
  private static instance: ConversationManager | null = null;
  private errorManager: ErrorManager;
  private orchestrationManager: OrchestrationManager;
  private threads: Map<string, Thread> = new Map();

  private constructor() {
    super({ name: 'ConversationManager' });
    this.errorManager = ErrorManager.getInstance();
    this.orchestrationManager = OrchestrationManager.getInstance();
  }

  static getInstance(): ConversationManager {
    if (!ConversationManager.instance) {
      ConversationManager.instance = new ConversationManager();
    }
    return ConversationManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      this.setStatus(ManagerStatus.INITIALIZING);

      // Hydrate threads from store
      const storedThreads = useThreadStore.getState().threads;
      for (const [id, thread] of storedThreads) {
        const rehydratedThread = this.rehydrateThread(thread);
        this.threads.set(id, rehydratedThread);
      }

      await this.orchestrationManager.initialize();

      this.setStatus(ManagerStatus.READY);
    } catch (error) {
      this.errorManager.logError(error as Error, {
        source: this.name,
        severity: ErrorSeverity.HIGH
      });
      this.handleError(error as Error, { context: 'initialization' });
    }
  }

  private rehydrateThread(thread: Thread): Thread {
    // Create a new Thread instance with the base properties
    const rehydratedThread = new Thread(
      thread.id,
      thread.initiatingAgentId,
      thread.metadata
    );
    
    // Restore thread state
    rehydratedThread.status = thread.status || ThreadStatus.ACTIVE;
    rehydratedThread.error = thread.error;
    rehydratedThread.lastErrorAt = thread.lastErrorAt;
    rehydratedThread.activeAgentId = thread.activeAgentId;
    
    // Initialize arrays
    rehydratedThread.interactions = [];
    rehydratedThread.messages = [];
    rehydratedThread.tasks = [];
    rehydratedThread.plans = [];
    rehydratedThread.judgements = [];
    
    // Add each interaction using the proper method to maintain categorization
    thread.interactions?.forEach(interaction => {
      rehydratedThread.addInteraction(interaction);
    });
    
    return rehydratedThread;
  }

  async createThread(initiatingAgentId: string): Promise<string> {
    try {
      const threadId = crypto.randomUUID() as string;
      const thread = new Thread(threadId, initiatingAgentId);
      this.threads.set(threadId, thread);
      useThreadStore.getState().addThread(thread);
      return threadId;
    } catch (error) {
      this.errorManager.logError(error as Error, {
        source: this.name,
        severity: ErrorSeverity.HIGH
      });
      throw error;
    }
  }

  async handleUserMessage(targetAgentId: string, threadId: string, content: string): Promise<void> {
    const thread = this.getThread(threadId);
      if (!thread) {
      throw new Error(`Thread not found: ${threadId}`);
    }

    await this.orchestrationManager.orchestrateThread(thread, content, targetAgentId);
  }

  getThread(id: string): Thread | undefined {
    return this.threads.get(id);
  }

  getThreads(): Thread[] {
    return Array.from(this.threads.values());
  }

  getThreadsByAgent(agentId: string): Thread[] {
    return Array.from(this.threads.values()).filter(thread => thread.getInteractionsByAgent(agentId).length > 0);
  }

  getInteractionsByAgent(agentId: string): Interaction[] {
    return Array.from(this.threads.values()).flatMap(thread => thread.getInteractionsByAgent(agentId));
  }

  async deleteThread(id: string): Promise<void> {
    const thread = this.threads.get(id);
    if (!thread) {
      throw new Error(`Thread not found: ${id}`);
    }

    this.threads.delete(id);
    useThreadStore.getState().deleteThread(id);
    this.logger.info(`Thread deleted: ${id}`);
  }
} 


