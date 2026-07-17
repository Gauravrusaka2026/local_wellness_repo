import type { NextRequest } from 'next/server';

import { updateSession } from './lib/supabase/proxy';

export const proxy = async (request: NextRequest) =>
  updateSession(
    request,
    request.nextUrl.pathname.startsWith('/account') ||
      request.nextUrl.pathname.startsWith('/complaints'),
  );

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
