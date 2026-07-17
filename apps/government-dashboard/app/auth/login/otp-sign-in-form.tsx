'use client';

import React, { useState, type FormEvent } from 'react';

import { getGovernmentEmailCallbackUrl } from '../../../lib/auth/callback';
import { buildMfaPath } from '../../../lib/auth/mfa';
import {
  getGovernmentLoginError,
  requestGovernmentOtp,
  verifyGovernmentOtp,
} from '../../../lib/auth/service';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';
import { GovernmentAuthorizationNote } from '../government-authorization-note';

type Step = 'request' | 'verify';

export const OtpSignInForm = ({
  accountNotice,
  callbackError,
  nextPath,
}: Readonly<{ accountNotice: string | null; callbackError: boolean; nextPath: string }>) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(
    callbackError
      ? 'The invitation or authentication request is invalid or expired. Request a new verification email.'
      : null,
  );
  const [isPending, setIsPending] = useState(false);
  const [normalizedEmail, setNormalizedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<Step>('request');

  const requestCode = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const normalizedValue = await requestGovernmentOtp(
        createBrowserSupabaseClient(),
        email,
        getGovernmentEmailCallbackUrl(window.location.origin),
      );
      setNormalizedEmail(normalizedValue);
      setStep('verify');
    } catch (requestError) {
      setError(getGovernmentLoginError(requestError));
    } finally {
      setIsPending(false);
    }
  };

  const verifyCode = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      await verifyGovernmentOtp(createBrowserSupabaseClient(), normalizedEmail, otp);
      window.location.assign(buildMfaPath(nextPath));
    } catch (verificationError) {
      setError(getGovernmentLoginError(verificationError));
      setIsPending(false);
    }
  };

  return (
    <section aria-labelledby="login-heading" className="auth-card">
      <p className="eyebrow">Restricted government access</p>
      <h1 id="login-heading">Sign in to the Government Dashboard</h1>
      <p className="lede">
        Use the exact email address that received your government invitation. This form signs in an
        existing invited identity; it never creates a government account.
      </p>

      {accountNotice === null ? null : (
        <p aria-live="polite" className="success-notice" role="status">
          {accountNotice}
        </p>
      )}

      {step === 'request' ? (
        <form aria-busy={isPending} className="stack" onSubmit={(event) => void requestCode(event)}>
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
          <p className="field-hint">
            Not sure which account to use? Ask the administrator who invited you to confirm the
            invitation email. The message may contain a verification code, a secure sign-in link, or
            both.
          </p>
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? 'Sending…' : 'Send verification email'}
          </button>
        </form>
      ) : (
        <form aria-busy={isPending} className="stack" onSubmit={(event) => void verifyCode(event)}>
          <p aria-live="polite" className="success-notice">
            Continue as <strong>{normalizedEmail}</strong>. Enter the newest code sent to this
            address, or open the newest secure sign-in link in this browser.
          </p>
          <label htmlFor="otp">Verification code</label>
          <input
            autoComplete="one-time-code"
            disabled={isPending}
            id="otp"
            inputMode="numeric"
            maxLength={8}
            onChange={(event) => {
              setOtp(event.target.value);
              setError(null);
            }}
            pattern="[0-9 ]{6,9}"
            placeholder="123456"
            required
            value={otp}
          />
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? 'Verifying…' : 'Verify and continue'}
          </button>
          <button
            className="text-button"
            disabled={isPending}
            onClick={() => {
              setError(null);
              setOtp('');
              setStep('request');
            }}
            type="button"
          >
            Use a different email address
          </button>
        </form>
      )}

      {error === null ? null : (
        <p aria-live="assertive" className="error-notice" role="alert">
          {error}
        </p>
      )}
      <GovernmentAuthorizationNote />
      <details className="auth-help">
        <summary>Account or authenticator recovery</summary>
        <p>
          If you cannot access the invited email or your authenticator, contact the administrator
          who onboarded you through a verified official channel. Privileged recovery requires an
          identity check and cannot be bypassed from this sign-in page.
        </p>
      </details>
    </section>
  );
};
