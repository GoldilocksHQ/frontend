import { ToolDefinition } from "@/lib/managers/tool-manager";

export interface Connector {
  id: string;
  name: string;
  displayName: string;
  description: string;
  toolDefinitions: ToolDefinition[];
  metadata?: Record<string, unknown>;
}