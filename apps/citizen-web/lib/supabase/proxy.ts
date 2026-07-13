import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { recordAuthAuditEventSafely } from '../api/auth-audit';
import { getPublicSupabaseConfiguration } from '../environment';

const copySessionCookies = (source: NextResponse, destination: NextResponse): void => {
  source.cookies.getAll().forEach((cookie) => {
    destination.cookies.set(cookie);
  });

  for (const headerName of ['cache-control', 'expires', 'pragma']) {
    const value = source.headers.get(headerName);

    if (value !== null) {
      destination.headers.set(headerName, value);
    }
  }
};

export const updateSession = async (
  request: NextRequest,
  isProtectedRoute: boolean,
): Promise<NextResponse> => {
  let response = NextResponse.next({ request });
  let sessionWasRefreshed = false;
  const configuration = getPublicSupabaseConfiguration();
  const supabase = createServerClient(configuration.url, configuration.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        sessionWasRefreshed = true;
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, options, value }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headersToSet).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  // Keep this immediately after client creation so refresh cookies stay synchronized.
  const { data, error } = await supabase.auth.getClaims();

  if (!error && data?.claims && sessionWasRefreshed) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.access_token) {
      await recordAuthAuditEventSafely(sessionData.session.access_token, 'session_refreshed');
    }
  }

  if (isProtectedRoute && (error || !data?.claims)) {
    const redirectUrl = request.nextUrl.clone();
    const returnPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    redirectUrl.pathname = '/auth/login';
    redirectUrl.search = '';
    redirectUrl.searchParams.set('next', returnPath);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    copySessionCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
};
