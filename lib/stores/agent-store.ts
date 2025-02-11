import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Agent, AgentJSON } from '../agents/agent-manager'
import { models, ModelConfig } from '../workflows/chains/chain-manager'
import { customStorage, logMiddleware } from './middleware'
import { StateCreator } from 'zustand'

export interface AgentState {
  agents: Agent[]
  selectedAgent: Agent | null
  linkedAgents: Map<string, Agent[]>
  selectedModel: ModelConfig
  
  // Actions
  setAgents: (agents: Agent[]) => void
  setSelectedAgent: (agent: Agent | null) => void
  addAgent: (agent: Agent) => void
  updateAgent: (agent: Agent) => void
  removeAgent: (agentId: string) => void
  setLinkedAgents: (agentId: string, linkedAgents: Agent[]) => void
  setSelectedModel: (model: ModelConfig) => void
}

export const createAgentStore: StateCreator<AgentState, [], [["zustand/persist", unknown]]> = (set) => ({
  agents: [],
  selectedAgent: null,
  linkedAgents: new Map(),
  selectedModel: models[0],
  
  // Actions
  setAgents: (agents: Agent[]) => set({ agents }),
  setSelectedAgent: (agent: Agent | null) => set({ selectedAgent: agent }),
  addAgent: (agent: Agent) => set((state) => ({ 
    agents: [...state.agents, agent] 
  })),
  updateAgent: (agent: Agent) => set((state) => ({
    agents: state.agents.map(a => a.id === agent.id ? agent : a)
  })),
  removeAgent: (agentId: string) => set((state) => ({
    agents: state.agents.filter(a => a.id !== agentId)
  })),
  setLinkedAgents: (agentId: string, linkedAgents: Agent[]) => set((state) => ({
    linkedAgents: new Map(state.linkedAgents).set(agentId, linkedAgents)
  })),
  setSelectedModel: (model: ModelConfig) => set({ selectedModel: model })
})

export const useAgentStore = create<AgentState>()(
  persist(
    logMiddleware(createAgentStore),
    {
      name: 'goldilocks:agent-store',
      storage: customStorage,
      partialize: (state) => {
        console.log('Partializing state:', state);
        const partialState = {
          agents: state.agents,
          selectedModel: state.selectedModel
        };
        console.log('Serialized state:', partialState);
        return partialState;
      },
      onRehydrateStorage: () => (state) => {
        console.log('Rehydrating state:', state);
        if (state?.agents) {
          try {
            // We know the stored data is in AgentJSON format
            const agentDataArray = state.agents as AgentJSON[];
            state.agents = agentDataArray;
            console.log('Successfully rehydrated agents:', state.agents);
          } catch (error) {
            console.error('Failed to rehydrate agents:', error);
            state.agents = [];
          }
        }
        return state;
      }
    }
  )
)