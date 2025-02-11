import { Manager } from "../core/managers/base-manager";
import { ErrorManager, ErrorSeverity } from "../core/managers/error-manager";
import { ManagerStatus } from "../core/managers/base-manager";

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  functions: {
    name: string;
    description: string;
    parameters: object;
    responseSchema: object;
  }[];
}

export interface ToolParameter {
  type: string;
  properties: Record<string, ToolParameterProperty>;
  required: string[];
  schema?: Record<string, unknown>;
}

export interface ToolParameterProperty {
  type: string;
  description: string;
  default?: string;
}

export interface ToolReturnType {
  type: string;
  description: string;
  schema?: Record<string, unknown>;
}

export interface ToolExecutionContext {
  toolId: string;
  parameters: Record<string, unknown>;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ToolExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
  executionTime: number;
  metadata?: Record<string, unknown>;
}

/**
 * ToolManager handles the registration and execution of tools.
 * Dependencies:
 * - Used by ConnectorManager to register connector tools
 * - Used by ChainManager to execute tools in chains
 * - Used by AgentManager to validate tool availability
 *
 * Key responsibilities:
 * - Tool registration and validation
 * - Tool execution
 * - Tool lifecycle management
 */
export class ToolManager extends Manager {
  private static instance: ToolManager | null = null;
  private errorManager: ErrorManager;
  private tools: Map<string, ToolDefinition> = new Map();
  private executors: Map<
    string,
    (functionName: string, params: Record<string, unknown>) => Promise<unknown>
  > = new Map();

  private constructor() {
    super({ name: "ToolManager" });
    this.errorManager = ErrorManager.getInstance();
  }

  static getInstance(): ToolManager {
    if (!ToolManager.instance) {
      ToolManager.instance = new ToolManager();
    }
    return ToolManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      this.setStatus(ManagerStatus.INITIALIZING);
      // Initialization code if any
      this.setStatus(ManagerStatus.READY);
    } catch (error) {
      this.errorManager.logError(error as Error, {
        source: this.name,
        severity: ErrorSeverity.HIGH,
      });
      this.handleError(error as Error, { context: "initialization" });
    }
  }

  async registerTool(
    definition: ToolDefinition,
    executor: (
      functionName: string,
      params: Record<string, unknown>
    ) => Promise<unknown>
  ): Promise<string> {
    try {
      const toolId = definition.id;
      this.tools.set(toolId, definition);
      this.executors.set(toolId, executor);

      this.logger.info(`Tool registered: ${definition.name} (${toolId})`);
      return toolId;
    } catch (error) {
      this.errorManager.logError(error as Error, {
        source: this.name,
        severity: ErrorSeverity.HIGH,
        metadata: { toolName: definition.name },
      });
      throw error;
    }
  }

  // Pass Through Tool Management methods
  getTool(toolId: string): ToolDefinition | undefined {
    return this.tools.get(toolId);
  }

  getToolByName(name: string): ToolDefinition | undefined {
    return Array.from(this.tools.values()).find((tool) => tool.name === name);
  }

  getExecutor(
    toolId: string
  ): (
    functionName: string,
    params: Record<string, unknown>
  ) => Promise<unknown> | undefined {
    const executor = this.executors.get(toolId);
    if (!executor) {
      throw new Error(`Executor not found: ${toolId}`);
    }
    return executor;
  }

  getAllAvailableTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  async unregisterTool(toolId: string): Promise<void> {
    this.tools.delete(toolId);
    this.executors.delete(toolId);
    this.logger.info(`Tool unregistered: ${toolId}`);
  }
}
