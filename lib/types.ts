export interface Connector {
  id: string;
  connector_name: string;
  connector_display_name: string;
}

export interface UserConnector {
  connector_id: string;
}

export interface UserMappedConnector{
  id: string;
  connector_name: string;
  connector_display_name: string;
  is_connected: boolean;
}

export interface ErrorResponse {
  error: string;
}