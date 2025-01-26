import { Connector, UserActivationMappedConnector  } from "./types";
import { APIKeyManager } from "./api-key-manager";


export class ConnectorManager {
  private static instance: ConnectorManager;
  private connectors: UserActivationMappedConnector[] = [];
  private functionSchemas: Map<string, object> = new Map();
  private ready: Promise<void>;
  private userId: string | undefined;
  private apiKeyManager: APIKeyManager | undefined;
  private headers: HeadersInit | undefined;

  private constructor() {
    this.ready = this.initialize();
  }

  public static async getInstance() {
    if (!ConnectorManager.instance) {
      ConnectorManager.instance = new ConnectorManager();
    }
    return ConnectorManager.instance;
  }

  private async initialize() {
    this.apiKeyManager = await APIKeyManager.getInstance();
    this.userId = this.apiKeyManager?.getUserId();
    this.headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKeyManager?.getKey()
    };
    await this.loadUserActivationMappedConnectorsList();
  }

  // Getters for connectors
  async getConnectors(): Promise<UserActivationMappedConnector[]> {
    await this.ready;
    return this.connectors;
  }

  async loadUserActivationMappedConnectorsList() {
    const all_connectors = await this.loadConnectors();
    const activated_connectors = await this.loadConnectors(this.userId);
    this.connectors = this.mapUserActivationMappedConnectors(all_connectors, activated_connectors);
  }
  
  async loadConnectors(userId?: string) {
    let baseUrl = '/api/connectors/list';
    // If userId is provided, use it to fetch connectors for that user
    if (userId) {
      baseUrl += `?user_id=${userId}`;
    }
    
    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: this.headers,
    });
    const data = await response.json();
    return data.connectors;
  }

  private mapUserActivationMappedConnectors(
    allConnectors: Connector[], 
    userConnectors: Connector[]
  ): UserActivationMappedConnector[] {
    const activatedIds = new Set(userConnectors.map(ac => ac.id));
    
    return allConnectors.map(connector => ({
      ...connector,
      isConnected: activatedIds.has(connector.id),
      execute: async (input: string) => {
        return await this.executeConnectorFunction(connector, { name: input, args: {} });
      },
    }));
  }

  async connectConnector(connector: UserActivationMappedConnector) {
    const connectorName = connector.name;
    const userId = this.userId;
    if (!userId) {
      throw new Error("User ID not found");
    }
    const response = await fetch('/api/connectors/auth', {
      method: 'POST',
      headers: this.headers,
      cache: 'no-store',
      body: JSON.stringify({ connectorName, userId }),
    });
    const data = await response.json();
    return data;
  }

  async getFunctionSchema(connector?: Connector, func?: string) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    let url = `${baseUrl}/api/connectors/list/schema?user_id=${this.userId}`
    if (connector) {
      url += `&connector_name=${connector.name}`;
    }
    if (func) {
      url += `&function_name=${func}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });
    const data = await response.json();
    return data;
  }

  async executeConnectorFunction(connector: Connector, func: { name: string, args: Record<string, unknown> }) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Add timeout and better error handling for fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      const response = await fetch(`${baseUrl}/api/connectors`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          connector: connector.name,
          function: func.name,
          arguments: func.args,
          userId: this.userId
        }),
        signal: controller.signal,
        // Add fetch options to help with timeout issues
        cache: 'no-store',
        keepalive: true
      });

      // if (!response.ok) {
      //   const errorText = await response.text().catch(() => 'Failed to read error response');
      //   throw new APIError(
      //     `Function execution failed: ${errorText}`,
      //     response.status,
      //     { connectorName, functionName, status: response.status }
      //   );
      // }

      const data = await response.json().catch(() => ({ error: 'Failed to parse response JSON' }));
      if (data.error) {
        throw new Error(data.error);
      }
      
      return data.result;

    } catch (error) {
      throw new Error(`Failed to execute connector ${connector.name}: ${error}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}