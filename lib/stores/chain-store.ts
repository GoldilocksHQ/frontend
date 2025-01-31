import { create, StateCreator } from 'zustand'
import { persist } from 'zustand/middleware'
import { Chain } from '../managers/chain-manager'
import { customStorage, logMiddleware } from './middleware'

interface ChainStoreState {
  chains: Map<string, Chain>;
  addChain: (chain: Chain) => void;
  updateChain: (chain: Chain) => void;
  removeChain: (id: string) => void;
}

export const createChainStore: StateCreator<ChainStoreState, [], [["zustand/persist", unknown]]> = (set) => ({
  chains: new Map(),
  addChain: (chain) => set((state) => ({
    chains: new Map(state.chains).set(chain.id, {
      ...chain,
      chainInstance: undefined // Explicitly exclude instance
    })
  })),
  updateChain: (chain) => set((state) => ({
    chains: new Map(state.chains).set(chain.id, {
      ...chain,
      chainInstance: undefined
    })
  })),
  removeChain: (id) => set((state) => {
    const newChains = new Map(state.chains);
    newChains.delete(id);
    return { chains: newChains };
  })
})

export const useChainStore = create<ChainStoreState>()(
  persist(
    logMiddleware(createChainStore),
    {
      name: 'goldilocks:chain-store',
      storage: customStorage,
      partialize: (state) => ({
        chains: Array.from(state.chains.entries()).map(([id, chain]) => [
          id, 
          {
            ...chain,
            chainInstance: undefined
          }
        ])
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.chains) {
          state.chains = new Map(
            Array.from(state.chains).map(([id, chain]) => [
              id, 
              {
                ...chain,
                // Instance will be recreated by ChainManager
                chainInstance: undefined 
              }
            ])
          );
        }
      }
    }
  )
)