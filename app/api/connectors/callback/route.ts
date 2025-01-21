import { exchangeCodeForTokens, storeGoogleTokens } from '@/connectors/google/auth';
import { UUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const GET = async (req: NextRequest) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Get userId from state
    const error = searchParams.get('error');

    if (error) {
      console.error('Google auth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=google_${error}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=missing_params`
      );
    }

    const tokens = await exchangeCodeForTokens(code);

    const decodedState = decodeURIComponent(state || "");
    const {userId, connectorName} = JSON.parse(decodedState) as { userId: UUID, connectorName: string };
    const {success: storeSuccess, error: storeError} = await storeGoogleTokens(tokens, userId, connectorName);
    if (!storeSuccess) {
      console.error('Error storing tokens:', storeError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=tokens_not_stored`
      );
    }

    // Redirect back to dashboard with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    );
  } catch (error) {
    console.error('Google callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=auth_failed`,
      302
    );
  }
};