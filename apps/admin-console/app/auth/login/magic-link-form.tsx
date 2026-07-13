'use client';

import { useState, type FormEvent } from 'react';

import { getAdminLoginError, requestAdminMagicLink } from '../../../lib/auth/service';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';

export const MagicLinkForm = ({
  callbackError,
  nextPath,
}: Readonly<{ callbackError: boolean; nextPath: string }>) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(
    callbackError ? 'The administrator sign-in link is invalid or expired.' : null,
  );
  const [isPending, setIsPending] = useState(false);
  const [requestCompleted, setRequestCompleted] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.searchParams.set('next', nextPath);
      await requestAdminMagicLink(createBrowserSupabaseClient(), email, callbackUrl.toString());
      setRequestCompleted(true);
    } catch (requestError) {
      setError(getAdminLoginError(requestError));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section aria-labelledby="login-heading" className="auth-card">
      <p className="eyebrow">Restricted platform access</p>
      <h1 id="login-heading">Local Wellness administration</h1>
      <p className="lede">
        Sign in with an invited platform administrator account. Authorization is verified again for
        every privileged request.
      </p>

      {requestCompleted ? (
        <div aria-live="polite" className="success-notice" role="status">
          <strong>Check your administrator inbox.</strong>
          <p>If this address is authorized, a secure sign-in link will arrive shortly.</p>
          <button
            className="text-button"
            onClick={() => {
              setRequestCompleted(false);
              setEmail('');
            }}
            type="button"
          >
            Use another email address
          </button>
        </div>
      ) : (
        <form aria-busy={isPending} className="stack" onSubmit={(event) => void submit(event)}>
          <label htmlFor="email">Administrator email address</label>
          <input
            autoCapitalize="none"
            autoComplete="email"
            disabled={isPending}
            id="email"
            inputMode="email"
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
            }}
            required
            type="email"
            value={email}
          />
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? 'Sending…' : 'Send secure sign-in link'}
          </button>
        </form>
      )}

      {error === null ? null : (
        <p aria-live="assertive" className="error-notice" role="alert">
          {error}
        </p>
      )}
      <p className="security-note">
        Never share sign-in links. Invitation and role changes create immutable audit records.
      </p>
    </section>
  );
};
