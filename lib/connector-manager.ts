import { Connector, UserConnector, UserMappedConnector } from "./types";


export class ConnectorManager {
  private connectors: UserMappedConnector[] = [];
  private ready: Promise<void>;
  constructor(userId: string) {
    this.ready = this.loadMappedConnectorsList(userId);
  }

  // Getters for connectors
  async getConnectors() {
    await this.ready;
    return this.connectors;
  }

  async loadMappedConnectorsList(userId: string) {
    const all_connectors = await this.loadAllConnectors();
    const activated_connectors = await this.loadActivatedConnectors(userId);
    this.connectors = this.mapUserActivatedConnectors(all_connectors, activated_connectors);
  }

  async loadAllConnectors() {
    // call connectors/list api to get all connectors
    const response = await fetch('/api/connectors/list',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    const data = await response.json();
    return data.connectors;
  }
  
  async loadActivatedConnectors(userId: string) {
    // call connectors/activated api to get all activated connectors
    const response = await fetch(`/api/connectors/list?user_id=${userId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    const data = await response.json();
    return data.activatedConnectors;
  }

  mapUserActivatedConnectors(connectors: Connector[], userConnectors?: UserConnector[]): UserMappedConnector[] {
    if (!userConnectors) {
      return connectors.map(connector => ({
        ...connector,
        is_connected: false
      }));
    }

    const connectedIds = new Set(userConnectors.map(uc => uc.connector_id));
    return connectors.map(connector => ({
      ...connector,
      is_connected: connectedIds.has(connector.id)
    }));
  }

  async connectConnector(connectorId: string) {
    // call connectors/auth api to connect connector
    const response = await fetch('/api/connectors/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ connectorId }),
    });
    const data = await response.json();
    return data;
  }
}