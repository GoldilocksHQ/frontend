// Basic types
export type UUID = string;

// Manager base types
export enum ManagerStatus {
  UNINITIALIZED = "uninitialized",
  INITIALIZING = "initializing",
  READY = "ready",
  ERROR = "error"
}

export interface ManagerConfig {
  name: string;
  logger?: Console;
}

// Manager-specific types
export interface ManagerMetadata {
  [key: string]: unknown;
}

// Helper function to safely cast string to UUID
export function asUUID(id: string): UUID {
  return id as UUID;
} 

export interface PlanResult {
  goal: string;
  reasoning: string;
  tasks: {
    step: number;
    instruction: string;
    tools?: string[];
    dependencies: number[];
    requiredAgent: string;
    reasoning: string;
  }[];
}