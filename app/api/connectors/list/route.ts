import { withApiAuth } from '@/app/api/middleware';
import { NextRequest, NextResponse } from "next/server";
import { ConnectorService } from "@/services/api/connector-service";

export const GET = withApiAuth(async (req: NextRequest) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    const connectorService = new ConnectorService();

    // If userId is provided, return the user's connectors
    const connectors = userId
      ? await connectorService.getConnectors(userId)
      : await connectorService.getConnectors();

    return NextResponse.json({
      connectors: connectors
    });
  } catch (error) {
    console.error('Error fetching connectors:', error);
    return NextResponse.json<{ error: string }>(
      { error: error instanceof Error ? error.message : 'Failed to fetch connectors' },
      { status: 500 }
    );
  }
});