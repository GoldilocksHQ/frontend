import { withApiAuth } from '@/app/api/middleware';
import { NextRequest, NextResponse } from "next/server";
import { ConnectorService } from "@/services/api/connector-service";

export const POST = withApiAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const connectorNames = body.connector_names;
    const connectorService = new ConnectorService();

    // If userId is provided, return the user's connectors
    const toolDefinitions = await connectorService.getToolDefinitions(connectorNames);
    
    return NextResponse.json({
      functionSchemas: toolDefinitions
    });
  } catch (error) {
    console.error('Error fetching connectors:', error);
    return NextResponse.json<{ error: string }>(
      { error: error instanceof Error ? error.message : 'Failed to fetch connectors' },
      { status: 500 }
    );
  }
});