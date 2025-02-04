import { withApiAuth } from '@/app/api/middleware';
import * as GoogleAuth from '@/connectors/google/auth';
import * as PlaidAuth from '@/connectors/plaid/auth';
import { NextRequest, NextResponse } from 'next/server';
import { UUID } from 'crypto';

export const POST = withApiAuth(async (req: NextRequest) => {
  try {
    const {connectorName, userId, publicToken, action} = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 401 }
      );
    }

    if (action === 'exchange-token') {
      if (!publicToken) {
        return NextResponse.json({ error: 'Public token not found' }, { status: 400 });
      }

      if (connectorName.startsWith('plaid')) {
        const {success, error} = await PlaidAuth.exchangeToken(userId as UUID, connectorName, publicToken);
        if (!success) {
          return NextResponse.json({ success: false, error: error }, { status: 400 });
        } else {
          return NextResponse.json({ success: true, error: error }, { status: 200 });
        }
      }
    }

    if (connectorName.startsWith('google')) {
      const authUrl = await GoogleAuth.getAuthUrl(userId as UUID, connectorName);
      return NextResponse.json({ url: authUrl });
    } else if (connectorName.startsWith('plaid')) {
      const authUrl = await PlaidAuth.getAuthUrl(userId as UUID);
      return NextResponse.json({ url: authUrl });
    }

    return NextResponse.json(
      { error: 'Unsupported connector' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
});