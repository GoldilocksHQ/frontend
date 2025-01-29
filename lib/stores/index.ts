import { useThreadStore } from './thread-store'
import { useUIStore } from './ui-store'
import { useAgentStore } from './agent-store'
import { useChainStore } from './chain-store'

export { useUIStore } from './ui-store'
export { useAgentStore } from './agent-store'
export { useThreadStore } from './thread-store'
export { useChainStore } from './chain-store'

// Hook to access all stores
export const useStores = () => ({
  uiState: useUIStore(),
  agentState: useAgentStore(),
  threadState: useThreadStore(),
  chainState: useChainStore()
}) 