import { withApiAuth } from '@/app/api/middleware';
import { getUser } from "@/services/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { ConnectorService } from "@/services/api/connector-service";
import { ErrorResponse } from "@/lib/types";

export const GET = withApiAuth(async (req: NextRequest) => {
  try {
    const searchParams = req.nextUrl.searchParams;
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

  
    if (userId) {
      const userConnectors = await connectorService.getUserConnectors(userId);
      return NextResponse.json({
        activatedConnectors: userConnectors
      });
    } else {
      const connectors = await connectorService.getAllConnectors();
      return NextResponse.json({
        connectors: connectors
      });
    }

  } catch (error) {
    console.error('Error fetching connectors:', error);
    return NextResponse.json<ErrorResponse>(
      { error: error instanceof Error ? error.message : 'Failed to fetch connectors' },
      { status: 500 }
    );
  }
});