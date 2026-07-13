import type { NextRequest } from 'next/server';

import { updateSession } from './lib/supabase/proxy';

export const isPublicAuthRoute = (pathname: string): boolean =>
  pathname === '/auth' || pathname.startsWith('/auth/');

export const proxy = async (request: NextRequest) =>
  updateSession(request, !isPublicAuthRoute(request.nextUrl.pathname));

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
