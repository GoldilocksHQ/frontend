import { withApiAuth } from '@/app/api/middleware';
import { getAuthUrl } from '@/connectors/google/auth';
import { NextRequest, NextResponse } from 'next/server';
import { UUID } from 'crypto';

export const POST = withApiAuth(async (req: NextRequest) => {
  try {
    const {connectorName, userId} = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 401 }
      );
    }

    if (connectorName.startsWith('google')) {
      const authUrl = await getAuthUrl(userId as UUID, connectorName);
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