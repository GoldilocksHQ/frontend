import { StateCreator } from 'zustand';
import { createJSONStorage, StateStorage } from 'zustand/middleware';

const storage: StateStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return localStorage.getItem(name);
    } catch (error) {
      console.warn('Error reading from localStorage:', error);
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(name, value);
    } catch (error) {
      console.warn('Error writing to localStorage:', error);
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.removeItem(name);
    } catch (error) {
      console.warn('Error removing from localStorage:', error);
    }
  }
};

export const customStorage = createJSONStorage(() => storage);

type LogMiddleware = <T extends object>(
  config: StateCreator<T, [], [["zustand/persist", unknown]]>
) => StateCreator<T, [], [["zustand/persist", unknown]]>;

export const logMiddleware: LogMiddleware = (config) => (set, get, api) =>
  config(
    (state) => {
      console.log('  applying', state);
      const result = set(state);
      console.log('  new state', get());
      return result;
    },
    get,
    api
  ); 