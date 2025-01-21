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