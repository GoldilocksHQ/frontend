import { Manager } from "../core/base-manager";
import { ErrorManager, ErrorSeverity } from "./error-manager";
import { APIKeyManager } from "./api-key-manager";
import { ToolManager, ToolDefinition } from "./tool-manager";
import { ManagerStatus } from "../core/base-manager";

export interface Connector {
  id: string;
  name: string;
  displayName: string;
  description: string;
  toolDefinitions: ToolDefinition[];
  metadata?: Record<string, unknown>;
}

export interface ConnectorBackendResponse {
  id: string;
  name: string;
  displayName: string;
  description: string;
  metadata?: Record<string, unknown>;
  status?: string;
}


export interface ConnectorStatus {
  isConnected: boolean;
  isAuthenticated: boolean;
  lastConnected?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ConnectorAuthResponse {
  authUrl?: string;
  error?: string;
}

/**
 * ConnectorManager handles integration with Goldilocks API Connectors.
 * It manages the lifecycle of third-party service connections through Goldilocks API:
 * - Registration of connectors and their tools
 * - Authentication flow with third-party services
 * - OAuth callback handling
 * - Execution of tools through Goldilocks API
 * - Connection status management
 */
export class ConnectorManager extends Manager {
  private static instance: ConnectorManager | null = null;
  private errorManager: ErrorManager;
  private apiKeyManager: APIKeyManager;
  private toolManager: ToolManager;
  private connectors: Map<string, Connector> = new Map();
  private connectorStatus: Map<string, ConnectorStatus> = new Map();
  private toolMappings: Map<string, string[]> = new Map(); // Connector ID -> Tool IDs

  private constructor(toolManager?: ToolManager) {
    super({ name: 'ConnectorManager' });
    this.errorManager = ErrorManager.getInstance();
    this.toolManager = toolManager ? toolManager : ToolManager.getInstance();
    this.apiKeyManager = null as unknown as APIKeyManager; // Will be initialized in initialize()
  }

  static getInstance(toolManager?: ToolManager): ConnectorManager {
    if (!ConnectorManager.instance) {
      ConnectorManager.instance = new ConnectorManager(toolManager);
    }
    return ConnectorManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      this.setStatus(ManagerStatus.INITIALIZING);
      
      // Initialize dependencies
      this.apiKeyManager = await APIKeyManager.getInstance();
      this.toolManager = ToolManager.getInstance();
      await this.toolManager.initialize();

      // Load existing connectors from API
      await this.loadConnectors();
      
      this.setStatus(ManagerStatus.READY);
    } catch (error) {
      this.errorManager.logError(error as Error, {
        source: this.name,
        severity: ErrorSeverity.HIGH
      });
      this.handleError(error as Error, { context: 'initialization' });
    }
  }

  private async loadConnectors(): Promise<void> {
    const userId = this.apiKeyManager.getUserId();

    // Get all available connectors
    const allConnectors = await this.fetchConnectorList();
    
    // Get user's activated connectors
    const activatedConnectors = userId ? await this.fetchConnectorList(userId) : [];
    
    // Register connectors and update their status
    for (const connector of allConnectors) {
      const isActivated = activatedConnectors.some(ac => ac.id === connector.id);
      const activated_connector = activatedConnectors.filter(ac => ac.id === connector.id)[0];
      const isAuthenticated = activated_connector ? activated_connector.status === "active" : false;
      
      // Register connector
      const connectorId = connector.id as string;
      this.connectors.set(connectorId, {
        id: connector.id as string,
        name: connector.name,
        displayName: connector.displayName,
        description: connector.description,
        toolDefinitions: [], // Will be populated by loadToolDefinitions
        metadata: connector.metadata,
      });

      // Set initial status
      this.connectorStatus.set(connectorId, {
        isConnected: isActivated,
        isAuthenticated: isAuthenticated,
        lastConnected: isActivated && isAuthenticated ? Date.now() : undefined
      });
    }

    // Load tool definitions for all connectors
    await this.loadToolDefinitions(activatedConnectors.map(c => c.name));
  }

  private async fetchConnectorList(userId?: string): Promise<ConnectorBackendResponse[]> {
    const apiKey = await this.apiKeyManager.getKey();
    let url = '/api/connectors/list';
    if (userId) {
      url += `?user_id=${userId}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch connectors');
    }

    const data = await response.json();
    return data.connectors;
  }

  private async loadToolDefinitions(connectorNames: string[]): Promise<void> {
    const apiKey = await this.apiKeyManager.getKey();
    const response = await fetch('/api/connectors/list/func-schema', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({ connector_names: connectorNames })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tool definitions');
    }

    const data = await response.json();
    const functionSchemas = data.functionSchemas;

    // Register tools for each connector
    for (const schema of functionSchemas) {
      const allConnectors = Array.from(this.connectors.values());
      const connector = allConnectors.find(c => c.name === schema.connectorName);

      if (connector) {
        // const toolDefs = this.convertSchemasToToolDefinitions(schemas as Array<ToolDefinition>);
        const toolDefs = {
          id: connector.id,
          name: schema.connectorName,
          functions: schema.functions
        } as ToolDefinition;
        const toolId = await this.toolManager.registerTool(toolDefs, this.createToolExecutor(connector.id, toolDefs.name));
        this.toolMappings.set(connector.id, [toolId]);
      }
    }
  }

  /**
   * Registers a new connector with Goldilocks API and its associated tools.
   * Each connector can expose multiple tools that will be registered with the ToolManager.
   * The tools can then be used by agents through the Goldilocks API.
   */
  async registerConnector(config: Omit<Connector, 'id'>): Promise<string> {
    try {
      // Validate connector config
      this.validateConnectorConfig(config);

      // Create connector ID
      const connectorId = crypto.randomUUID() as string;

      // Register connector tools with ToolManager
      // Each tool will be executed through Goldilocks API when called
      const toolIds = await Promise.all(
        config.toolDefinitions.map(async toolDef => {
          const executor = this.createToolExecutor(connectorId, toolDef.name);
          return await this.toolManager.registerTool(toolDef, executor);
        })
      );

      // Store connector config and tool mappings
      const fullConfig: Connector = {
        ...config,
        id: connectorId
      };

      this.connectors.set(connectorId, fullConfig);
      this.toolMappings.set(connectorId, toolIds as string[]);
      this.connectorStatus.set(connectorId, {
        isConnected: false,
        isAuthenticated: false
      });
      
      this.logger.info(`Connector registered: ${config.name} (${connectorId})`);
      return connectorId;
    } catch (error) {
      this.errorManager.logError(error as Error, {
        source: this.name,
        severity: ErrorSeverity.HIGH,
        metadata: { connectorName: config.name }
      });
      throw error;
    }
  }

  private validateConnectorConfig(config: Omit<Connector, 'id'>): void {
    if (!config.name?.trim()) {
      throw new Error('Connector name is required');
    }
    if (!config.description?.trim()) {
      throw new Error('Connector description is required');
    }
    if (!Array.isArray(config.toolDefinitions)) {
      throw new Error('Connector tool definitions must be an array');
    }
  }

  private createToolExecutor(connectorId: string, toolName: string) {
    return async (functionName: string, params: Record<string, unknown>): Promise<unknown> => {
      const connector = this.connectors.get(connectorId);
      if (!connector) {
        throw new Error(`Connector not found: ${connectorId}`);
      }

      const status = this.connectorStatus.get(connectorId);
      if (!status?.isConnected) {
        throw new Error(`Connector not connected: ${connector.name}`);
      }

      // Execute the tool through Goldilocks API
      return await this.executeConnectorTool(connectorId, toolName, functionName, params);

      // TODO: Implement connector auth flow
    };
  }


  private async executeConnectorTool(
    connectorId: string,
    toolName: string,
    functionName: string,
    params: Record<string, unknown>
  ): Promise<unknown> {
    const apiKey = await this.apiKeyManager.getKey();
    const connector = this.connectors.get(connectorId);
    if (!connector) {
      throw new Error(`Connector not found: ${connectorId}`);
    }

    const response = await fetch('/api/connectors/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        connector: connector.name,
        function: functionName,
        arguments: params,
        userId: this.apiKeyManager.getUserId()
      })
    });

    // if (!response.ok) {
      // const error = await response.json();
      // throw new Error(error.error);
    // }

    return await response.json();
  }

  async connect(connectorId: string): Promise<ConnectorAuthResponse> {
    try {
      const connector = this.connectors.get(connectorId);
      if (!connector) {
        throw new Error(`Connector not found: ${connectorId}`);
      }

      // Get Goldilocks API key for authentication
      const apiKey = await this.apiKeyManager.getKey();

      // Initiate connector authentication through Goldilocks API
      const response = await fetch('/api/connectors/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          connectorName: connector.name,
          userId: this.apiKeyManager.getUserId()
        })
      });

      const data = await response.json();
      return { authUrl: data.url };
    } catch (error) {
      this.errorManager.logError(error as Error, {
        source: this.name,
        severity: ErrorSeverity.HIGH,
        metadata: { connectorId }
      });
      
      this.connectorStatus.set(connectorId, {
        isConnected: false,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async exchangeToken(connectorId: string, publicToken: string): Promise<void> {
    try {
      const connector = this.connectors.get(connectorId);
      if (!connector) {
        throw new Error(`Connector not found: ${connectorId}`);
      }

      const apiKey = await this.apiKeyManager.getKey();
      const response = await fetch('/api/connectors/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          connectorName: connector.name,
          publicToken: publicToken,
          userId: this.apiKeyManager.getUserId(),
          action: 'exchange-token'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to exchange token');
      }

      return await response.json();
    } catch (error) {
      this.errorManager.logError(error as Error, {
        source: this.name,
        severity: ErrorSeverity.HIGH,
        metadata: { publicToken }
      });
      throw error;
    }
  }

  async disconnect(connectorId: string): Promise<void> {
    try {
      const connector = this.connectors.get(connectorId);
      if (!connector) {
        throw new Error(`Connector not found: ${connectorId}`);
      }

      const apiKey = await this.apiKeyManager.getKey();

      // Disconnect through Goldilocks API
      const response = await fetch('/api/connectors/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          connectorId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to disconnect connector');
      }

      // Update connector status
      this.connectorStatus.set(connectorId, {
        isConnected: false,
        isAuthenticated: false
      });

      this.logger.info(`Connector disconnected: ${connector.name} (${connectorId})`);
    } catch (error) {
      this.errorManager.logError(error as Error, {
        source: this.name,
        severity: ErrorSeverity.HIGH,
        metadata: { connectorId }
      });
      throw error;
    }
  }

  getConnector(connectorId: string): Connector | undefined {
    return this.connectors.get(connectorId);
  }

  getConnectorByName(connectorName: string): Connector | undefined {
    return Array.from(this.connectors.values()).find(c => c.name === connectorName);
  }

  getConnectors(): Connector[] {
    return Array.from(this.connectors.values());
  }

  getConnectorStatus(connectorId: string): ConnectorStatus | undefined {
    return this.connectorStatus.get(connectorId);
  }

  getConnectorTools(connectorId: string): ToolDefinition[] {
    const toolIds = this.toolMappings.get(connectorId);
    if (!toolIds) {
      return [];
    }

    return toolIds
      .map(toolId => this.toolManager.getTool(toolId))
      .filter((tool): tool is ToolDefinition => tool !== undefined);
  }

  async unregisterConnector(connectorId: string): Promise<void> {
    try {
      const connector = this.connectors.get(connectorId);
      if (!connector) {
        throw new Error(`Connector not found: ${connectorId}`);
      }

      const apiKey = await this.apiKeyManager.getKey();

      // Unregister through Goldilocks API
      const response = await fetch('/api/connectors/unregister', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          connectorId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to unregister connector');
      }

      // Unregister all associated tools
      const toolIds = this.toolMappings.get(connectorId);
      if (toolIds) {
        await Promise.all(toolIds.map(toolId => this.toolManager.unregisterTool(toolId)));
      }

      // Remove connector
      this.connectors.delete(connectorId);
      this.connectorStatus.delete(connectorId);
      this.toolMappings.delete(connectorId);

      this.logger.info(`Connector unregistered: ${connectorId}`);
    } catch (error) {
      this.errorManager.logError(error as Error, {
        source: this.name,
        severity: ErrorSeverity.HIGH,
        metadata: { connectorId }
      });
      throw error;
    }
  }

  getToolManager(): ToolManager {
    return this.toolManager;
  }
} 