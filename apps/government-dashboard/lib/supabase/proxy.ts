import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { recordAuthAuditEventSafely } from '../api/auth-audit';
import { buildMfaPath } from '../auth/mfa';
import { getSafeMfaReturnPath } from '../auth/return-path';
import { getPublicSupabaseConfiguration } from '../environment';

const copySessionCookies = (source: NextResponse, destination: NextResponse): void => {
  source.cookies.getAll().forEach((cookie) => destination.cookies.set(cookie));

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
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, options, value }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headersToSet).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  // Keep verification adjacent to client creation so refreshed cookies cannot be lost.
  const { data, error } = await supabase.auth.getClaims();
  const hasSession = !error && Boolean(data?.claims);
  const isLoginRoute = request.nextUrl.pathname === '/auth/login';
  const isMfaRoute = request.nextUrl.pathname === '/auth/mfa';
  const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const safeRequestedPath = getSafeMfaReturnPath(requestedPath, '/');
  const safeAuthReturnPath = getSafeMfaReturnPath(request.nextUrl.searchParams.get('next'), '/');

  const redirectWithSessionCookies = (path: string): NextResponse => {
    const redirectResponse = NextResponse.redirect(new URL(path, request.url));
    copySessionCookies(response, redirectResponse);
    return redirectResponse;
  };

  if (hasSession && sessionWasRefreshed) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.access_token) {
      await recordAuthAuditEventSafely(sessionData.session.access_token, 'session_refreshed');
    }
  }

  if (!hasSession && (isProtectedRoute || isMfaRoute)) {
    const parameters = new URLSearchParams({
      next: isMfaRoute ? safeAuthReturnPath : safeRequestedPath,
    });
    return redirectWithSessionCookies(`/auth/login?${parameters.toString()}`);
  }

  if (hasSession && (isProtectedRoute || isLoginRoute)) {
    const assuranceResult = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const hasAal2 = !assuranceResult.error && assuranceResult.data?.currentLevel === 'aal2';

    if (isLoginRoute) {
      return redirectWithSessionCookies(
        hasAal2 ? safeAuthReturnPath : buildMfaPath(safeAuthReturnPath),
      );
    }

    if (!hasAal2) {
      return redirectWithSessionCookies(buildMfaPath(safeRequestedPath));
    }
  }

  return response;
};
