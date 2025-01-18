import { queryDatabase } from "../supabase/server";
import { Connector, UserConnector} from "../../lib/types";

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
}