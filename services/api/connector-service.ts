import { queryDatabase } from "../supabase/server";
import { Connector, ActivatedConnector } from "../../lib/types";
import { handleFunction as handleGoogleSheetsFunction } from "@/connectors/google-sheets/connector";
import { handleFunction as handleGoogleDriveFunction } from "@/connectors/google-drive/connector";
import { handleFunction as handleGoogleDocsFunction } from "@/connectors/google-docs/connector";
import { UUID } from "crypto";

export interface ConnectorFunction {
  connector: string;
  function: string;
  arguments: Record<string, unknown>;
}

export class ConnectorService {
  async getAllConnectors(): Promise<Connector[]> {
    const { success, data, error } = await queryDatabase(
      "api",
      "connectors",
      "id, connector_name, connector_display_name"
    );

    if (!success || !data) {
      throw new Error(error || "Failed to fetch connectors");
    }

    const connectors = Array.isArray(data) ? data.map((connector: Record<string, string>) => ({
      id: connector.id,
      connectorName: connector.connector_name,
      connectorDisplayName: connector.connector_display_name
    })) : [];
    
    return connectors;
  }

  async getUserConnectors(userId: string): Promise<ActivatedConnector[]> {
    const { success, data, error } = await queryDatabase(
      "api",
      "activated_connectors",
      "connector_id",
      { user_id: userId }
    );

    if (!success || !data) {
      throw new Error(error || "Failed to fetch user connectors");
    }

    const connectors = Array.isArray(data) ? data.map((connector: Record<string, string>) => ({
      connectorId: connector.connector_id
    })) : [];
    
    return connectors;
  }

  async executeFunction(userId: UUID, func: ConnectorFunction) {
    switch (func.connector) {
      case 'google-sheets':
        return handleGoogleSheetsFunction(userId, func.function, func.arguments);
      case 'google-drive':
        return handleGoogleDriveFunction(userId, func.function, func.arguments);
      case 'google-docs':
        return handleGoogleDocsFunction(userId, func.function, func.arguments);
      default:
        throw new Error(`Unknown connector: ${func.connector}`);
    }
  }
}