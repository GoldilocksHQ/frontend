import { withApiAuth } from '@/app/api/middleware';
import { getAuthUrl } from '@/connectors/google-sheets/connector';
import { getUser } from '@/services/supabase/client';
import { NextResponse } from 'next/server';
import { UUID } from 'crypto';

export const POST = withApiAuth(async () => {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const authUrl = getAuthUrl(user.id as UUID);
    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
});