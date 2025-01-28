import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Thread, Message, UUID } from '../types'
import { customStorage, logMiddleware } from './middleware'
import { StateCreator } from 'zustand'

interface ThreadState {
  currentThread: Thread | null
  messages: Message[]
  threadHistory: Map<UUID, Thread>
  
  // Actions
  setCurrentThread: (thread: Thread | null) => void
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  clearThread: () => void
  addThreadToHistory: (thread: Thread) => void
  getThreadFromHistory: (threadId: UUID) => Thread | undefined
}

const createThreadStore: StateCreator<ThreadState, [], [["zustand/persist", unknown]]> = (set, get) => ({
  currentThread: null,
  messages: [],
  threadHistory: new Map(),
  
  // Actions
  setCurrentThread: (thread: Thread | null) => {
    if (thread) {
      const existingThread = get().threadHistory.get(thread.id);
      set({ 
        currentThread: thread,
        messages: existingThread?.messages || []
      });
    } else {
      set({ currentThread: null, messages: [] });
    }
  },
  setMessages: (messages: Message[]) => {
    const currentThread = get().currentThread;
    if (currentThread) {
      // Update both messages and thread history
      const updatedThread = { ...currentThread, messages };
      set((state) => ({
        messages,
        threadHistory: new Map(state.threadHistory).set(currentThread.id, updatedThread)
      }));
    } else {
      set({ messages });
    }
  },
  addMessage: (message: Message) => {
    const currentThread = get().currentThread;
    if (currentThread) {
      const newMessages = [...get().messages, message];
      const updatedThread = { ...currentThread, messages: newMessages };
      set((state) => ({
        messages: newMessages,
        threadHistory: new Map(state.threadHistory).set(currentThread.id, updatedThread)
      }));
    } else {
      set((state) => ({ messages: [...state.messages, message] }));
    }
  },
  clearThread: () => set({ currentThread: null, messages: [] }),
  addThreadToHistory: (thread: Thread) => set((state) => ({
    threadHistory: new Map(state.threadHistory).set(thread.id, thread)
  })),
  getThreadFromHistory: (threadId: UUID) => get().threadHistory.get(threadId)
})

export const useThreadStore = create<ThreadState>()(
  persist(
    logMiddleware(createThreadStore),
    {
      name: 'goldilocks:threads',
      storage: customStorage,
      partialize: (state) => ({
        threadHistory: Array.from(state.threadHistory.entries()),
        currentThread: state.currentThread,
        messages: state.messages
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Restore thread history Map
          if (state.threadHistory) {
            state.threadHistory = new Map(state.threadHistory);
          }
          
          // Ensure messages array exists
          if (!state.messages) {
            state.messages = [];
          }

          // If we have a current thread, load its messages
          if (state.currentThread && state.threadHistory) {
            const thread = state.threadHistory.get(state.currentThread.id);
            if (thread) {
              state.messages = thread.messages || [];
            }
          }
        }
        return state;
      }
    }
  )
) 