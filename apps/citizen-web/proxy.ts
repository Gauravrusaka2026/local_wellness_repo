import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  CITIZEN_ACCESS_UNAVAILABLE_PATH,
  citizenRouteRequiresSession,
  getCitizenRouteAccess,
} from './lib/access-policy';
import { getCitizenAccessMode } from './lib/environment';
import { updateSession } from './lib/supabase/proxy';

export const proxy = async (request: NextRequest) => {
  if (getCitizenAccessMode() === 'public-only') {
    if (getCitizenRouteAccess(request.nextUrl.pathname) === 'protected') {
      const unavailableUrl = new URL(CITIZEN_ACCESS_UNAVAILABLE_PATH, request.url);
      return NextResponse.redirect(unavailableUrl);
    }

    return NextResponse.next();
  }

  return updateSession(request, citizenRouteRequiresSession(request.nextUrl.pathname));
};

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
