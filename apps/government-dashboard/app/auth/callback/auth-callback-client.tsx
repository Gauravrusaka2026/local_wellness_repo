'use client';

import { useEffect, useRef } from 'react';

import { recordAuthAuditEventSafely } from '../../../lib/api/auth-audit';
import { completeEmailAuthCallback } from '../../../lib/auth/callback';
import { buildMfaPath } from '../../../lib/auth/mfa';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';

export const AuthCallbackClient = ({ nextPath }: Readonly<{ nextPath: string }>) => {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const callbackUrl = window.location.href;
    const cleanUrl = new URL('/auth/callback', window.location.origin);
    window.history.replaceState(null, '', cleanUrl.pathname);

    const complete = async (): Promise<void> => {
      try {
        const accessToken = await completeEmailAuthCallback(
          createBrowserSupabaseClient(),
          callbackUrl,
        );
        await recordAuthAuditEventSafely(accessToken, 'sign_in_succeeded');
        window.location.replace(buildMfaPath(nextPath));
      } catch {
        const loginUrl = new URL('/auth/login', window.location.origin);
        loginUrl.searchParams.set('error', 'callback');
        loginUrl.searchParams.set('next', nextPath);
        window.location.replace(loginUrl);
      }
    };

    void complete();
  }, [nextPath]);

  return (
    <main className="centered-page">
      <section aria-live="polite" className="auth-card" role="status">
        <p className="eyebrow">Restricted government access</p>
        <h1>Completing secure sign-in</h1>
        <p className="lede">Verifying the one-time email link and checking your session.</p>
      </section>
    </main>
  );
};
