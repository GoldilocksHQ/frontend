import { NextRequest, NextResponse } from 'next/server';

// For API routes only
export function withApiAuth(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const apiKey = req.headers.get('x-api-key');
    // const storedKey = process.env.GODILOCKS_API_KEY
    const storedKey = "f2320af8-38cb-42a7-bc66-7337df4ba2ad"
    
    if (!apiKey || apiKey !== storedKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return handler(req);
  };
} 