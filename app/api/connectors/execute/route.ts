import { withApiAuth } from '@/app/api/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { ConnectorService } from '@/services/api/connector-service';
import { UUID } from 'crypto';

const connectorService = new ConnectorService();

export const POST = withApiAuth(async (req: NextRequest) => {
  try {
    const { connector, function: funcName, arguments: args, userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!connector || !funcName || !args) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const { success, result, error } = await connectorService.executeFunction(
      userId as UUID,
      { connector, function: funcName, arguments: args }
    );

    if (!success) {
      if (error?.includes('invalid_grant')){
        return NextResponse.json(
          { error: 'REAUTH_REQUIRED' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: error || 'Function execution failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success, result, error });
  } catch (error) {
    console.error('Connector execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute connector function' },
      { status: 500 }
    );
  }
});