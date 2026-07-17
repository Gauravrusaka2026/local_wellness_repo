'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';

import {
  getCitizenPasswordRecoveryUrl,
  getUserFacingAuthError,
  requestCitizenPasswordReset,
} from '../../../lib/auth/service';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';

const getLoginHref = (email: string): string =>
  email === '' ? '/auth/login' : `/auth/login?email=${encodeURIComponent(email)}`;

export const ForgotPasswordForm = ({ initialEmail }: Readonly<{ initialEmail: string }>) => {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [requestComplete, setRequestComplete] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const normalizedEmail = await requestCitizenPasswordReset(
        supabase,
        email,
        getCitizenPasswordRecoveryUrl(window.location.origin),
      );
      setSubmittedEmail(normalizedEmail);
      setRequestComplete(true);
    } catch (requestError) {
      setError(getUserFacingAuthError(requestError));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section aria-labelledby="forgot-password-heading" className="auth-card">
      <p className="eyebrow">Citizen account recovery</p>
      <h1 id="forgot-password-heading">Reset your password</h1>
      <p className="lede">
        We will send a secure password-reset link if this email belongs to an account.
      </p>

      {requestComplete ? (
        <div className="stack">
          <p aria-live="polite" className="success-notice" role="status">
            If an account exists for <strong>{submittedEmail}</strong>, Supabase sent a secure
            password-reset link. Check that inbox and its spam folder.
          </p>
          <button
            className="secondary-button"
            onClick={() => {
              setRequestComplete(false);
              setSubmittedEmail(null);
            }}
            type="button"
          >
            Use a different email
          </button>
          <Link className="secondary-link" href={getLoginHref(submittedEmail ?? '')}>
            Return to sign in
          </Link>
        </div>
      ) : (
        <form aria-busy={isPending} className="stack" onSubmit={(event) => void submit(event)}>
          <label htmlFor="recovery-email">Email address</label>
          <input
            autoCapitalize="none"
            autoComplete="email"
            disabled={isPending}
            id="recovery-email"
            inputMode="email"
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
            }}
            placeholder="you@example.org"
            required
            type="email"
            value={email}
          />
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? 'Sending…' : 'Send password-reset link'}
          </button>
          <Link className="secondary-link" href={getLoginHref(email)}>
            Return to sign in
          </Link>
        </form>
      )}

      {error === null ? null : (
        <p aria-live="assertive" className="error-notice" role="alert">
          {error}
        </p>
      )}
    </section>
  );
};
