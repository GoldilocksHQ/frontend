import { useThreadStore } from './thread-store'
import { useUIStore } from './ui-store'
import { useAgentStore } from './agent-store'
export { useUIStore } from './ui-store'
export { useAgentStore } from './agent-store'
export { useThreadStore } from './thread-store'

// Hook to access all stores
export const useStores = () => ({
  ui: useUIStore(),
  agent: useAgentStore(),
  thread: useThreadStore()
}) 