import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { recordAuthAuditEventSafely } from '../api/auth-audit';
import { buildCitizenPhoneMfaPath, getCitizenPhoneMfaState } from '../auth/phone-mfa';
import { getSafeReturnPath } from '../auth/return-path';
import { getCitizenPhoneMfaMode, getPublicSupabaseConfiguration } from '../environment';

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
  const phoneMfaIsEnforced = getCitizenPhoneMfaMode() === 'enforce';
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
  const hasSession = !error && Boolean(data?.claims);
  const isLoginRoute = request.nextUrl.pathname === '/auth/login';
  const isPhoneVerificationRoute = request.nextUrl.pathname === '/auth/verify-phone';
  const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const safeRequestedPath = getSafeReturnPath(requestedPath, '/account');
  const safeAuthReturnPath = getSafeReturnPath(
    request.nextUrl.searchParams.get('next'),
    '/account',
  );

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

  if (!hasSession && (isProtectedRoute || isPhoneVerificationRoute)) {
    const parameters = new URLSearchParams({
      next: isPhoneVerificationRoute ? safeAuthReturnPath : safeRequestedPath,
    });
    return redirectWithSessionCookies(`/auth/login?${parameters.toString()}`);
  }

  if (hasSession && isLoginRoute && !phoneMfaIsEnforced) {
    return redirectWithSessionCookies(safeAuthReturnPath);
  }

  if (
    hasSession &&
    phoneMfaIsEnforced &&
    (isProtectedRoute || isLoginRoute || isPhoneVerificationRoute)
  ) {
    let phoneMfaIsVerified = false;
    try {
      phoneMfaIsVerified = (await getCitizenPhoneMfaState(supabase)).status === 'verified';
    } catch {
      // The verification page renders a recoverable provider error. Protected routes fail closed.
    }

    if (isPhoneVerificationRoute) {
      return phoneMfaIsVerified ? redirectWithSessionCookies(safeAuthReturnPath) : response;
    }

    if (isLoginRoute) {
      return redirectWithSessionCookies(
        phoneMfaIsVerified ? safeAuthReturnPath : buildCitizenPhoneMfaPath(safeAuthReturnPath),
      );
    }

    if (!phoneMfaIsVerified) {
      return redirectWithSessionCookies(buildCitizenPhoneMfaPath(safeRequestedPath));
    }
  }

  return response;
};
