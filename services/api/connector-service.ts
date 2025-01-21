import { queryDatabase } from "../supabase/server";
import { Connector, ActivatedConnector } from "../../lib/types";
import { readValues, updateValues } from "@/connectors/google-sheets/connector";
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
        return this.executeGoogleSheetsFunction(userId, func);
      default:
        throw new Error(`Unknown connector: ${func.connector}`);
    }
  }

  private async executeGoogleSheetsFunction(userId: UUID, func: ConnectorFunction) {
    switch (func.function) {
      case 'readSheet':
        const { spreadsheetId, range } = func.arguments as { spreadsheetId: string; range: string };
        return await readValues(userId, spreadsheetId, range);
      
      case 'updateSheet':
        const { spreadsheetId: updateId, range: updateRange, values } = 
          func.arguments as { spreadsheetId: string; range: string; values: string[][] };
        return await updateValues(userId, updateId, updateRange, values);
      
      default:
        throw new Error(`Unknown function: ${func.function} for connector: google-sheets`);
    }
  }
}