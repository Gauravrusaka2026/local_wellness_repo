'use client';

import { useEffect, useRef, useState } from 'react';

import { recordAuthAuditEventSafely } from '../../../lib/api/auth-audit';
import { completeEmailAuthCallback, getEmailAuthCallbackPurpose } from '../../../lib/auth/callback';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';

export const AuthCallbackClient = ({ nextPath }: Readonly<{ nextPath: string }>) => {
  const started = useRef(false);
  const [purpose, setPurpose] = useState<'email-confirmation' | 'sign-in'>('sign-in');

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const callbackUrl = window.location.href;
    const cleanUrl = new URL('/auth/callback', window.location.origin);
    window.history.replaceState(null, '', cleanUrl.pathname);

    const complete = async (): Promise<void> => {
      try {
        setPurpose(getEmailAuthCallbackPurpose(callbackUrl));
        const accessToken = await completeEmailAuthCallback(
          createBrowserSupabaseClient(),
          callbackUrl,
        );
        await recordAuthAuditEventSafely(accessToken, 'sign_in_succeeded');
        window.location.replace(nextPath);
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
        <p className="eyebrow">Citizen account</p>
        <h1>
          {purpose === 'email-confirmation' ? 'Confirming your email' : 'Completing secure sign-in'}
        </h1>
        <p className="lede">
          {purpose === 'email-confirmation'
            ? 'Verifying this one-time confirmation link and preparing your citizen account.'
            : 'Verifying this one-time sign-in link and preparing your citizen account.'}
        </p>
      </section>
    </main>
  );
};
