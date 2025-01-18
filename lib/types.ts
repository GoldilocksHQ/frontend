export interface Connector {
  id: string;
  connector_display_name: string;
}

export interface UserConnector {
  connector_id: string;
}

export interface ConnectorResponse {
  id: string;
  connector_display_name: string;
  is_connected: boolean;
}

export interface ConnectorsListResponse {
  connectors: ConnectorResponse[];
}

export interface ErrorResponse {
  error: string;
}