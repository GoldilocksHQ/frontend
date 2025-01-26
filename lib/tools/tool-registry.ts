import { Tool } from "@langchain/core/tools";
import { ConnectorManager } from "../connector-manager";
import { UserActivationMappedConnector, ConnectorResponse } from "../types";

class ConnectorTool extends Tool {
  name: string;
  description: string;
  private connector: UserActivationMappedConnector;

  constructor(connector: UserActivationMappedConnector) {
    super();
    this.name = connector.name;
    this.description = connector.displayName;
    this.connector = connector;
  }

  /** @ignore */
  async _call(input: string): Promise<string> {
    try {
      const response = await this.connector.execute(input);
      return JSON.stringify(response);
    } catch (error) {
      const errorResponse: ConnectorResponse = {
        success: false,
        result: null,
        error: `Failed to execute ${this.connector.name}: ${error}`,
        timestamp: Date.now()
      };
      return JSON.stringify(errorResponse);
    }
  }
}

export class ToolRegistry {
  private static instance: ToolRegistry | null = null;
  private connectorManager: ConnectorManager | null = null;
  private tools: Map<string, Tool>;
  private logger: Console = console;

  private constructor() {
    this.tools = new Map();
  }

  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  async initialize(): Promise<void> {
    try {
      this.connectorManager = await ConnectorManager.getInstance();
      await this.loadTools();
    } catch (error) {
      this.logger.error('Failed to initialize ToolRegistry:', error);
      throw new Error(`Failed to initialize ToolRegistry: ${error}`);
    }
  }

  private async loadTools(): Promise<void> {
    try {
      // Get all connectors
      const connectors = await this.connectorManager?.getConnectors();
      if (!connectors) {
        this.logger.warn('No connectors available');
        return;
      }

      // Create tools from connectors
      for (const connector of connectors) {
        const tool = await this.createToolFromConnector(connector);
        if (tool) {
          this.tools.set(tool.name, tool);
        }
      }

      this.logger.info(`Loaded ${this.tools.size} tools`);
    } catch (error) {
      this.logger.error('Failed to load tools:', error);
      throw new Error(`Failed to load tools: ${error}`);
    }
  }

  private async createToolFromConnector(connector: UserActivationMappedConnector): Promise<Tool | null> {
    try {
      // Check if connector is ready
      const isConnected = connector.isConnected;
      if (!isConnected) {
        this.logger.warn(`Connector ${connector.name} is not connected`);
        return null;
      }

      // Create tool
      return new ConnectorTool(connector);
    } catch (error) {
      this.logger.error(`Failed to create tool from connector ${connector.name}:`, error);
      return null;
    }
  }

  getTool(name: string): Tool {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    return tool;
  }

  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  clearTools(): void {
    this.tools.clear();
  }
} 