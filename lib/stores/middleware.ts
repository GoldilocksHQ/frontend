import { StateStorage, createJSONStorage } from 'zustand/middleware';
import { StateCreator } from 'zustand';

const storage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      return localStorage.getItem(name);
    } catch (error) {
      console.warn('Error reading from localStorage:', error);
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      localStorage.setItem(name, value);
    } catch (error) {
      console.warn('Error writing to localStorage:', error);
    }
  },
  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name);
    } catch (error) {
      console.warn('Error removing from localStorage:', error);
    }
  },
};

export const customStorage = createJSONStorage(() => storage);

type LogMiddleware = <T extends object>(
  config: StateCreator<T, [], [["zustand/persist", unknown]]>
) => StateCreator<T, [], [["zustand/persist", unknown]]>;

export const logMiddleware: LogMiddleware = (config) => (set, get, api) =>
  config(
    (state) => {
      console.log('  applying', state);
      set(state);
      console.log('  new state', get());
    },
    get,
    api
  ); 