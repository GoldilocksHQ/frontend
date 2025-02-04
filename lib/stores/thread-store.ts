import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Thread, Message, ThreadStatus } from '../core/thread'
import { customStorage, logMiddleware } from './middleware'
import { StateCreator } from 'zustand'

interface ThreadState {
  threads: Map<string, Thread>;
  currentThreadId: string | null;
  
  // Thread Management
  addThread: (thread: Thread) => void;
  updateThread: (threadId: string, updates: Partial<Thread>) => void;
  deleteThread: (threadId: string) => void;
  getThread: (threadId: string) => Thread | undefined;
  getThreadsByAgent: (agentId: string) => Thread[];
  setCurrentThread: (threadId: string | null) => void;
  
  // Message Management
  addMessage: (threadId: string, message: Message) => void;
  getMessages: (threadId: string) => Message[];
  getAllMessages: () => Message[];
}

const createThreadStore: StateCreator<ThreadState, [], [["zustand/persist", unknown]]> = (set, get) => ({
  threads: new Map(),
  currentThreadId: null,

  // Thread Management
  addThread: (thread: Thread) => set((state) => {
    const newThreads = new Map(state.threads);
    newThreads.set(thread.id, thread);
    return { threads: newThreads };
  }),

  updateThread: (threadId: string, updates: Partial<Thread>) => 
    set((state) => {
      const thread = state.threads.get(threadId);
      if (!thread) return state;

      const updatedThread = {
        ...thread,
        ...updates,
        updatedAt: Date.now()
      };

      const newThreads = new Map(state.threads);
      newThreads.set(threadId, updatedThread as Thread);
      
      return { 
        ...state,
        threads: newThreads
      };
    }),

  deleteThread: (threadId: string) => set((state) => {
    const newThreads = new Map(state.threads);
    newThreads.delete(threadId);
    return { 
      threads: newThreads,
      currentThreadId: state.currentThreadId === threadId ? null : state.currentThreadId
    };
  }),

  getThread: (threadId: string) => {
    return get().threads.get(threadId);
  },

  getThreadsByAgent: (agentId: string) => {
    return Array.from(get().threads.values())
      .filter(thread => 
        thread.initiatingAgentId === agentId || 
        thread.interactions.some(i => i.sourceAgentId === agentId || i.targetAgentId === agentId)
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  setCurrentThread: (threadId: string | null) => set({ currentThreadId: threadId }),

  // Message Management
  addMessage: (threadId: string, message: Message) => set((state) => {
    const thread = state.threads.get(threadId);
    if (!thread) return state;

    const updatedThread = {
      ...thread,
      interactions: [...thread.interactions, message],
      messages: [...thread.messages, message],
      updatedAt: Date.now()
    };

    const newThreads = new Map(state.threads);
    newThreads.set(threadId, updatedThread as Thread);
    return { threads: newThreads };
  }),

  getMessages: (threadId: string) => {
    const thread = get().threads.get(threadId);
    return thread?.messages || [];
  },

  getAllMessages: () => {
    return Array.from(get().threads.values())
      .flatMap(thread => thread.messages)
      .sort((a, b) => a.createdAt - b.createdAt);
  }
});

export const useThreadStore = create<ThreadState>()(
  persist(
    logMiddleware(createThreadStore),
    {
      name: 'goldilocks:threads',
      storage: customStorage,
      partialize: (state) => ({
        threads: Array.from(state.threads.entries()),
        currentThreadId: state.currentThreadId
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Convert threads array back to Map
        if (Array.isArray(state.threads)) {
          state.threads = new Map(state.threads);
        } else {
          state.threads = new Map();
        }

        // Ensure all threads have proper prototype methods
        state.threads.forEach((thread, id) => {
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
          
          // Restore interactions
          thread.interactions?.forEach(interaction => {
            rehydratedThread.addInteraction(interaction);
          });

          state.threads.set(id, rehydratedThread);
        });

        return state;
      }
    }
  )
) 