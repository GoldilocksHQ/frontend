"use client"

import { Runnable } from "@langchain/core/runnables";
import { StateGraph } from "@langchain/langgraph";

export interface Connector {
  id: string;
  name: string;
  displayName: string;
  description: string;
}

export interface UserActivationMappedConnector extends Connector {
  isConnected: boolean;
  execute: (functionName: string, parameters: string) => Promise<unknown>;
}

// Thread and Message Types
export interface Thread {
  id: UUID;
  messages: Message[];
  taskLists: TaskList[];
  status: ThreadStatus;
  startTime: number;
  endTime?: number;
  metadata: Record<string, unknown>;
}

export enum ThreadStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  ERROR = "error"
}

export interface Message {
  id: UUID;
  threadId: UUID;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  messageType: MessageType;
  sourceAgentId?: UUID;
  targetAgentId: UUID;
  taskId?: UUID;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export enum MessageType {
  SYSTEM = "system",
  USER_TO_AGENT = "user_to_agent",
  AGENT_TO_USER = "agent_to_user",
  AGENT_TO_AGENT = "agent_to_agent",
  TASK_PLANNING = "task_planning",
  TASK_EXECUTION = "task_execution",
  JUDGEMENT = "judgement"
}

// Task Types
export interface TaskList {
  id: UUID;
  threadId: UUID;
  sourceAgentId: UUID;
  tasks: Task[];
  status: TaskListStatus;
  startTime: number;
  endTime?: number;
  executionFlow: Execution[];
  metadata: Record<string, unknown>;
}

export enum TaskListStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  ERROR = "error"
}

export interface Task {
  id: UUID;
  listId: UUID;
  step: number;
  instruction: string;
  sourceAgentId?: UUID;
  targetAgentId: UUID;
  status: TaskStatus;
  startTime: number;
  endTime?: number;
  result?: string;
  error?: string;
  metadata: Record<string, unknown>;
}

export enum TaskStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  ERROR = "error"
}

export interface Execution {
  id: UUID;
  taskId: UUID;
  type: ExecutionType;
  status: ExecutionStatus;
  result: unknown;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export enum ExecutionType {
  PLANNING = "planning",
  EXECUTION = "execution",
  JUDGEMENT = "judgement"
}

export enum ExecutionStatus {
  SUCCESS = "success",
  ERROR = "error"
}

// Agent Manager Types
export interface AgentJSON {
  id: UUID;
  agentName: string;
  agentDescription: string;
  selectedModel: ModelOption;
  systemPrompt: string;
  selectedTools: string[];
  linkedAgentIds: UUID[];
  chainConfig?: ChainConfig;
}

export interface AgentRequestBody {
  model: string;
  messages: AgentMessage[];
  systemPrompt: string;
  selectedTools?: string[];
  firstResponseFormat?: object;
  userId: string;
}

// Error context type
export interface AgentErrorContext {
  error?: unknown;
  agentName?: string;
  mode?: string;
  depth?: number;
  task?: AgentTask;
}

export interface ModelOption {
  name: string;
  provider: "openai" | "anthropic" | "local";
  contextWindow: number;
  maxTokens: number;
}

export interface AgentMessage {
  role: string;
  content: string;
  timestamp: number;
}

export interface ChainConfig {
  type: ChainType;
  model: ModelOption;
  memory: boolean;
  tools: string[];
}

export interface AgentTaskList {
  goal: string;
  tasks: AgentTask[];
  reasoning: string;
}

export interface AgentTask {
  step: number;
  instruction: string;
  dependencies: number[];
  requiredAgent: UUID;
  reasoning: string;
}

export interface ToolDefinition {
  connectorName: string;
  functions: ToolFunction[];
}

export interface ToolFunction {
  name: string;
  description: string;
  parameters: object;
  responseSchema: object;
}

export interface ToolResult {
  success: boolean;
  result: string;
  error?: string;
}

export interface ConnectorConfig {
  id: string;
  name: string;
  description: string;
  type: string;
  requiresApiKey: boolean;
  defaultConfig: Record<string, unknown>;
}

export interface ConnectorResponse {
  success: boolean;
  result: unknown;
  error?: string;
  timestamp: number;
}

// Judgement types
export interface Judgement {
  satisfied: boolean;
  score: number;
  analysis: {
    strengths: string[];
    weaknesses: string[];
    missing: string[];
  };
  feedback: string;
}

export interface AgentState {
  messages: Message[];
  currentTask?: Task;
  status: "idle" | "planning" | "executing" | "judging";
  memory: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export type AgentNode = Runnable;

export type AgentStateGraph = StateGraph<AgentState>;

export interface AgentWorkflow {
  graph: AgentStateGraph;
  addNode(name: string, node: AgentNode): void;
  addEdge(from: string, to: string, condition?: (state: AgentState) => boolean): void;
  run(initialState: AgentState): Promise<AgentState>;
}

export enum ChainType {
  TASK_PLANNING = "task_planning",
  TASK_EXECUTION = "task_execution",
  CONVERSATION = "conversation",
  JUDGEMENT = "judgement"
}

export type UUID = string;

export interface AgentError {
  message: string;
  context?: Record<string, unknown>;
  timestamp?: number;
}






