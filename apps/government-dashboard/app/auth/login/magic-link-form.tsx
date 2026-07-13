'use client';

import { useState, type FormEvent } from 'react';

import { getGovernmentLoginError, requestGovernmentMagicLink } from '../../../lib/auth/service';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';

export const MagicLinkForm = ({
  callbackError,
  nextPath,
}: Readonly<{ callbackError: boolean; nextPath: string }>) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(
    callbackError ? 'The invitation or sign-in link is invalid or expired.' : null,
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
      await requestGovernmentMagicLink(
        createBrowserSupabaseClient(),
        email,
        callbackUrl.toString(),
      );
      setRequestCompleted(true);
    } catch (requestError) {
      setError(getGovernmentLoginError(requestError));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section aria-labelledby="login-heading" className="auth-card">
      <p className="eyebrow">Restricted government access</p>
      <h1 id="login-heading">Government dashboard</h1>
      <p className="lede">
        Only invited officers and municipal administrators can sign in. Access is limited to active
        assigned scopes.
      </p>

      {requestCompleted ? (
        <div aria-live="polite" className="success-notice" role="status">
          <strong>Check your official inbox.</strong>
          <p>
            If this address has an active invitation, a secure sign-in link will arrive shortly.
          </p>
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
          <label htmlFor="email">Official email address</label>
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
            placeholder="officer@municipality.gov.in"
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
        Do not forward invitation links. Access is authorized from current server-side role and
        membership state.
      </p>
    </section>
  );
};
