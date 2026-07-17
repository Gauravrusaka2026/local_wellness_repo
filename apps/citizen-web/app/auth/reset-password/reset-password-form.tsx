'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import {
  establishCitizenPasswordRecoverySession,
  getUserFacingAuthError,
  updateCitizenPassword,
} from '../../../lib/auth/service';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';

type RecoveryState = 'loading' | 'ready' | 'invalid';

export const ResetPasswordForm = () => {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [password, setPassword] = useState('');
  const [recoveryState, setRecoveryState] = useState<RecoveryState>('loading');
  const [recoveryEmail, setRecoveryEmail] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const callbackUrl = window.location.href;
    window.history.replaceState(null, '', '/auth/reset-password');

    const establishSession = async (): Promise<void> => {
      try {
        const email = await establishCitizenPasswordRecoverySession(supabase, callbackUrl);
        setRecoveryEmail(email);
        setRecoveryState('ready');
      } catch (recoveryError) {
        setError(getUserFacingAuthError(recoveryError));
        setRecoveryState('invalid');
      }
    };

    void establishSession();
  }, [supabase]);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('The password confirmation does not match.');
      return;
    }

    setIsPending(true);
    try {
      await updateCitizenPassword(supabase, password);
      window.location.replace('/auth/login?reset=success');
    } catch (updateError) {
      setError(getUserFacingAuthError(updateError));
      setIsPending(false);
    }
  };

  return (
    <section aria-labelledby="reset-password-heading" className="auth-card">
      <p className="eyebrow">Citizen account recovery</p>
      <h1 id="reset-password-heading">Choose a new password</h1>

      {recoveryState === 'loading' ? (
        <p aria-live="polite" className="loading-indicator" role="status">
          Verifying the password-reset request…
        </p>
      ) : null}

      {recoveryState === 'invalid' ? (
        <div className="stack">
          <p>The reset link cannot be used. Request a new one.</p>
          <Link className="primary-link" href="/auth/forgot-password">
            Request a new link
          </Link>
        </div>
      ) : null}

      {recoveryState === 'ready' ? (
        <div className="stack">
          <p className="auth-context compact">
            Resetting the password for{' '}
            <strong>{recoveryEmail ?? 'the account verified by this recovery link'}</strong>.
            Updating it will sign out other sessions for this account.
          </p>
          <form aria-busy={isPending} className="stack" onSubmit={(event) => void submit(event)}>
            <label htmlFor="new-password">New password</label>
            <input
              autoComplete="new-password"
              disabled={isPending}
              id="new-password"
              maxLength={128}
              minLength={8}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
              required
              type="password"
              value={password}
            />
            <label htmlFor="confirm-new-password">Confirm new password</label>
            <input
              autoComplete="new-password"
              disabled={isPending}
              id="confirm-new-password"
              maxLength={128}
              minLength={8}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setError(null);
              }}
              required
              type="password"
              value={confirmPassword}
            />
            <button className="primary-button" disabled={isPending} type="submit">
              {isPending ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      ) : null}

      {error === null ? null : (
        <p aria-live="assertive" className="error-notice" role="alert">
          {error}
        </p>
      )}
    </section>
  );
};
