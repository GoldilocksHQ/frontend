import { getUser } from "@/services/supabase/server";
import { NextResponse } from "next/server";
import { ConnectorService } from "@/services/api/connector-service";
import { ConnectorsListResponse, ErrorResponse } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const connectorService = new ConnectorService();

    // Authenticate user if userId is provided
    if (userId) {
      const user = await getUser();
      if (!user || user.id !== userId) {
        return NextResponse.json<ErrorResponse>(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    // Get all connectors
    const connectors = await connectorService.getAllConnectors();

    // Get and enrich with user data if userId is provided
    const userConnectors = userId 
      ? await connectorService.getUserConnectors(userId)
      : undefined;

    const enrichedConnectors = await connectorService.mapUserActivatedConnectors(
      connectors,
      userConnectors
    );

    return NextResponse.json<ConnectorsListResponse>({
      connectors: enrichedConnectors
    });

  } catch (error) {
    console.error('Error fetching connectors:', error);
    return NextResponse.json<ErrorResponse>(
      { error: error instanceof Error ? error.message : 'Failed to fetch connectors' },
      { status: 500 }
    );
  }
}