import { queryDatabase } from "../supabase/server";
import { Connector} from "../../lib/types";
import { handleFunction as handleGoogleSheetsFunction } from "@/connectors/google-sheets/connector";
import { handleFunction as handleGoogleDriveFunction } from "@/connectors/google-drive/connector";
import { handleFunction as handleGoogleDocsFunction } from "@/connectors/google-docs/connector";
import { UUID } from "crypto";
import { googleDriveToolDefinition, googleDocsToolDefinition, googleSheetsToolDefinition } from "@/connectors/function-schema";
import { ToolDefinition, APIError } from "./agent-service";

export interface ConnectorFunction {
  connector: string;
  function: string;
  arguments: Record<string, unknown>;
}

export class ConnectorService {
  async getConnectors(userId?: string): Promise<Connector[]> {
    const { success, data, error } = await queryDatabase(
      "api",      
      userId ? "activated_connectors" : "connectors",
      userId ? "connector_id , connectors ( id, connector_name, connector_display_name, connector_description )" : "id, connector_name, connector_display_name, connector_description",
      userId ? { user_id: userId } : {},
    );

    if (!success || !data) {
      throw new Error(error || "Failed to fetch connectors");
    }

    const connectors = Array.isArray(data) ? data.map((connector: Record<string, unknown>) => ({
      id: userId ? connector.connector_id : connector.id,
      name: userId ? (connector.connectors as Record<string, unknown>).connector_name : connector.connector_name,
      displayName: userId ? (connector.connectors as Record<string, unknown>).connector_display_name : connector.connector_display_name,
      description: userId ? (connector.connectors as Record<string, unknown>).connector_description : connector.connector_description
    })) : [];
    
    return connectors as Connector[];
  }

  async getToolDefinitions(connectorNames: string[]): Promise<ToolDefinition[]> {
    try {
      return connectorNames.map(connectorName => {
        switch (connectorName) {
          case 'google-sheets':
            return googleSheetsToolDefinition;
          case 'google-drive':
            return googleDriveToolDefinition;
          case 'google-docs':
            return googleDocsToolDefinition;
          default:
            throw new APIError(
              `Unknown connector: ${connectorName}`,
              400,
              { availableConnectors: ['google-sheets', 'google-drive', 'google-docs'] }
            );
        }
      });
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(
        'Failed to get tool definitions',
        500,
        { error, connectorNames }
      );
    }
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