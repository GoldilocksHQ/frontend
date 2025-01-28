import { Tool } from "@langchain/core/tools";
import { ConnectorManager } from "../connector-manager";
import { UserActivationMappedConnector as Connector, ConnectorResponse, ToolDefinition, ToolFunction, UserActivationMappedConnector } from "../types";

interface ToolInput {
  functionName: string;
  parameters?: Record<string, unknown>;
}

export class ConnectorTool extends Tool {
  name: string;
  description: string;
  functions: Array<ToolFunction>;
  private connector: UserActivationMappedConnector;

  constructor(connector: UserActivationMappedConnector, toolDefinition: ToolDefinition) {
    super();
    this.name = connector.name;
    this.description = connector.description;
    this.connector = connector;
    this.functions = toolDefinition.functions;
  }

  /** @ignore */
  async _call(input: string | ToolInput): Promise<string> {
    // Parse the input to get function name and parameters
    const { functionName, parameters = {} } = 
      typeof input === 'string' ? JSON.parse(input) as ToolInput : input;

    if (!functionName) {
      throw new Error(`Function name not found in input`);
    }

    try {

      // Find the function schema
      const functionSchema = this.functions.find(f => f.name === functionName);
      if (!functionSchema) {
        throw new Error(`Function ${functionName} not found in ${this.name}`);
      }

      // Execute the function
      const response = await this.connector.execute(functionName, JSON.stringify(parameters));
      return JSON.stringify(response);
    } catch (error) {
      const errorResponse: ConnectorResponse = {
        success: false,
        result: null,
        error: `Failed to execute ${this.connector.name}_${functionName}: ${error}`,
        timestamp: Date.now()
      };
      return JSON.stringify(errorResponse);
    }
  }
}

export class ToolRegistry {
  private static instance: ToolRegistry | null = null;
  private connectorManager: ConnectorManager | null = null;
  private tools: Map<string, Tool> = new Map();
  private logger: Console = console;

  private constructor() {}

  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
      ToolRegistry.instance.initialize();
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

  public  getConnectors(): UserActivationMappedConnector[] {
    return this.connectorManager?.getConnectors() ?? [];
  }

  private async loadTools(): Promise<void> {
    try {
      // Get all connectors
      const connectors = this.getConnectors();
      
      if (!connectors) {
        this.logger.warn('No connectors available');
        return;
      } 
      
      const toolDefinitions = await this.connectorManager?.loadToolDefinitions(connectors.map(c => c.name));

      // Create tools from connectors
      for (const connector of connectors) {
        const toolDefinition = toolDefinitions?.find((td: ToolDefinition) => td.connectorName === connector.name);
        const tool = await this.createToolFromConnector(connector, toolDefinition);
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

  private async createToolFromConnector(connector: Connector, toolDefinition: ToolDefinition): Promise<Tool | null> {
    try {
      // Check if connector is ready
      const isConnected = connector.isConnected;
      if (!isConnected) {
        this.logger.warn(`Connector ${connector.name} is not connected`);
        return null;
      }

      // Create tool
      return new ConnectorTool(connector, toolDefinition);
    } catch (error) {
      this.logger.error(`Failed to create tool from connector ${connector.name}:`, error);
      return null;
    }
  }

  getTool(id: string): Tool {
    const toolName = this.connectorManager?.getConnectors().find(c => c.id === id)?.name;
    const tool = Array.from(this.tools.values()).find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }
    return tool;
  }

  getToolByName(toolName: string): Tool {
    const tool = Array.from(this.tools.values()).find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
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