import { NextResponse, type NextRequest } from 'next/server';

import { recordAuthAuditEventSafely } from '../../../lib/api/auth-audit';
import { getSupportedEmailOtpType } from '../../../lib/auth/callback';
import { getSafeReturnPath } from '../../../lib/auth/return-path';
import { createServerSupabaseClient } from '../../../lib/supabase/server';

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const requestUrl = new URL(request.url);
  const nextPath = getSafeReturnPath(requestUrl.searchParams.get('next'), '/');
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const otpType = getSupportedEmailOtpType(requestUrl.searchParams.get('type'));
  const supabase = await createServerSupabaseClient();
  let error: Error | null;
  let accessToken: string | undefined;

  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
    accessToken = result.data.session?.access_token;
  } else if (tokenHash && otpType) {
    const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
    error = result.error;
    accessToken = result.data.session?.access_token;
  } else {
    error = new Error('Missing authentication callback parameters.');
  }

  if (error === null) {
    if (accessToken) {
      await recordAuthAuditEventSafely(accessToken, 'sign_in_succeeded');
    }

    return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
  }

  const loginUrl = new URL('/auth/login', requestUrl.origin);
  loginUrl.searchParams.set('error', 'callback');
  loginUrl.searchParams.set('next', nextPath);
  return NextResponse.redirect(loginUrl);
};
