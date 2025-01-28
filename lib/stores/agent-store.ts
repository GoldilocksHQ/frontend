import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Agent, modelOptions } from '../agent-manager'
import { UUID, ModelOption, AgentJSON } from '../types'
import { customStorage, logMiddleware } from './middleware'
import { StateCreator } from 'zustand'

interface AgentState {
  agents: Agent[]
  selectedAgent: Agent | null
  linkedAgents: Map<UUID, Agent[]>
  selectedModel: ModelOption
  
  // Actions
  setAgents: (agents: Agent[]) => void
  setSelectedAgent: (agent: Agent | null) => void
  addAgent: (agent: Agent) => void
  updateAgent: (agent: Agent) => void
  removeAgent: (agentId: UUID) => void
  setLinkedAgents: (agentId: UUID, linkedAgents: Agent[]) => void
  setSelectedModel: (model: ModelOption) => void
}

const createAgentStore: StateCreator<AgentState, [], [["zustand/persist", unknown]]> = (set) => ({
  agents: [],
  selectedAgent: null,
  linkedAgents: new Map(),
  selectedModel: modelOptions[0],
  
  // Actions
  setAgents: (agents: Agent[]) => set({ agents }),
  setSelectedAgent: (agent: Agent | null) => set({ selectedAgent: agent }),
  addAgent: (agent: Agent) => set((state) => ({ 
    agents: [...state.agents, agent] 
  })),
  updateAgent: (agent: Agent) => set((state) => ({
    agents: state.agents.map(a => a.id === agent.id ? agent : a)
  })),
  removeAgent: (agentId: UUID) => set((state) => ({
    agents: state.agents.filter(a => a.id !== agentId)
  })),
  setLinkedAgents: (agentId: UUID, linkedAgents: Agent[]) => set((state) => ({
    linkedAgents: new Map(state.linkedAgents).set(agentId, linkedAgents)
  })),
  setSelectedModel: (model: ModelOption) => set({ selectedModel: model })
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
          agents: state.agents.map(agent => agent.toJSON()),
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
            const agentDataArray = state.agents as unknown as AgentJSON[];
            state.agents = agentDataArray.map(agentData => Agent.fromJSON(agentData));
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