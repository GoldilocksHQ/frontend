import { queryDatabase } from "../supabase/server";
import { Connector, UserConnector, ConnectorResponse } from "../../lib/types";

export class ConnectorService {
  async getAllConnectors(): Promise<Connector[]> {
    const { success, data, error } = await queryDatabase(
      "api",
      "connectors",
      "id, connector_display_name"
    );

    if (!success || !data) {
      throw new Error(error || "Failed to fetch connectors");
    }

    return Array.isArray(data) ? data : [];
  }

  async getUserConnectors(userId: string): Promise<UserConnector[]> {
    const { success, data, error } = await queryDatabase(
      "api",
      "activated_connectors",
      "connector_id",
      { user_id: userId }
    );

    if (!success || !data) {
      throw new Error(error || "Failed to fetch user connectors");
    }

    return Array.isArray(data) ? data : [];
  }

  async mapUserActivatedConnectors(connectors: Connector[], userConnectors?: UserConnector[]): Promise<ConnectorResponse[]> {
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
}