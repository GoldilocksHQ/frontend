import { UUID } from "crypto";

export interface Connector {
  id: string;
  connectorName: string;
  connectorDisplayName: string;
}

export interface ActivatedConnector {
  connectorId: string;
}

export interface UserMappedConnector{
  id: string;
  connectorName: string;
  connectorDisplayName: string;
  isConnected: boolean;
}

export interface ErrorResponse {
  error: string;
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
  messages: Array<{ role: string; content: string }>;
}


export interface AgentRequestBody {
  model: string;
  messages: Message[];
  systemPrompt: string;
  selectedTools?: string[];
  firstResponseFormat?: object;
  userId: string;
}

export interface Message {
  content: string;
  role: string;
}

export enum AgentExecutionType {
  INSTRUCTION = "instruction",
  RESPONSE = "response",
}

export interface AgentExecution {
  senderAgent: string;
  receiverAgent: string;
  content: string;
  type: AgentExecutionType;
}

export interface ModelOption {
  value: string;
  label: string;
  provider: string;
}

export interface Task {
  step: number;
  sourceAgent: string;
  targetAgent: string;
  instruction: string;
}