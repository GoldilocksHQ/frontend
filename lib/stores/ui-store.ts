import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ManagedError } from '../managers/error-manager'
import { customStorage, logMiddleware } from './middleware'
import { StateCreator } from 'zustand'

export interface UIState {
  isLoading: boolean
  isWorking: boolean
  workingStatus: string[]
  errors: ManagedError[]
  
  // Actions
  setLoading: (loading: boolean) => void
  setWorking: (working: boolean) => void
  setWorkingStatus: (status: string) => void
  setErrors: (errors: ManagedError[]) => void
  addError: (error: ManagedError) => void
  clearErrors: () => void
  appendWorkingStatus: (status: string) => void
  clearWorkingStatus: () => void
}

const createUIStore: StateCreator<UIState> = (set) => ({
  isLoading: false,
  isWorking: false,
  workingStatus: [],
  errors: [],

  // Actions
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setWorking: (working: boolean) => set({ isWorking: working }),
  setWorkingStatus: (status: string) => set((state) => ({ workingStatus: [...state.workingStatus, status] })),
  setErrors: (errors: ManagedError[]) => set({ errors }),
  addError: (error: ManagedError) => set((state) => ({ 
    errors: [...state.errors, error] 
  })),
  clearErrors: () => set({ errors: [] }),
  appendWorkingStatus: (status: string) => set((state) => ({ workingStatus: [...state.workingStatus.slice(-20), status] })), // Keep last 20 statuses
  clearWorkingStatus: () => set({ workingStatus: [] }),
})

export const useUIStore = create<UIState>()(
  logMiddleware(
    persist(
      createUIStore,
      {
        name: 'ui-store',
        storage: customStorage,
      }
    )
  )
) 
