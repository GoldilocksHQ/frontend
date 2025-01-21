import { NextRequest, NextResponse } from 'next/server';
import { confirmKey } from '@/services/supabase/server';


// For API routes only
export function withApiAuth(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const apiKey = req.headers.get('x-api-key');
    const key = await confirmKey(apiKey || '');
    
    if (!apiKey || key.data?.api_key != apiKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return handler(req);
  };
} 