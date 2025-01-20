import { type NextRequest } from 'next/server'
import { updateSession } from '@/services/supabase/middleware'

// For page routes only
export async function middleware(request: NextRequest) {
  // Skip API routes as they use their own auth
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return;
  }
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/|_next/static|_next/image|favicon.ico).*)',
  ],
}