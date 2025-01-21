import { Connector, ActivatedConnector, UserMappedConnector  } from "./types";
import { APIKeyManager } from "./api-key-manager";


export class ConnectorManager {
  private static instance: ConnectorManager;
  private connectors: UserMappedConnector[] = [];
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
    await this.loadMappedConnectorsList();
  }

  // Getters for connectors
  async getConnectors(): Promise<UserMappedConnector[]> {
    await this.ready;
    return this.connectors;
  }

  async loadMappedConnectorsList() {
    const all_connectors = await this.loadAllConnectors();
    const activated_connectors = await this.loadActivatedConnectors();
    this.connectors = this.mapUserActivatedConnectors(all_connectors, activated_connectors);
  }

  async loadAllConnectors(): Promise<Connector[]> {
    const response = await fetch('/api/connectors/list', {
      method: 'GET',
      headers: this.headers,
    });
    const data = await response.json();

    
    return data.connectors;
  }
  
  async loadActivatedConnectors() {
    const response = await fetch(`/api/connectors/list?user_id=${this.userId}`, {
      method: 'GET',
      headers: this.headers,
    });
    const data = await response.json();
    return data.activatedConnectors;
  }

  private mapUserActivatedConnectors(
    connectors: Connector[], 
    activatedConnectors: ActivatedConnector[]
  ): UserMappedConnector[] {
    const activatedIds = new Set(activatedConnectors.map(ac => ac.connectorId));
    
    return connectors.map(connector => ({
      ...connector,
      isConnected: activatedIds.has(connector.id)
    }));
  }

  async connectConnector(connector: UserMappedConnector) {
    const connectorName = connector.connectorName;
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
}