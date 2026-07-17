'use client';

import { useState, type FormEvent } from 'react';

import { getAdminEmailCallbackUrl } from '../../../lib/auth/callback';
import { buildMfaPath } from '../../../lib/auth/mfa';
import { getAdminLoginError, requestAdminOtp, verifyAdminOtp } from '../../../lib/auth/service';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';

type Step = 'request' | 'verify';

export const OtpSignInForm = ({
  callbackError,
  nextPath,
}: Readonly<{ callbackError: boolean; nextPath: string }>) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(
    callbackError
      ? 'The administrator authentication request is invalid or expired. Request a new verification email.'
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
      const normalizedValue = await requestAdminOtp(
        createBrowserSupabaseClient(),
        email,
        getAdminEmailCallbackUrl(window.location.origin),
      );
      setNormalizedEmail(normalizedValue);
      setStep('verify');
    } catch (requestError) {
      setError(getAdminLoginError(requestError));
    } finally {
      setIsPending(false);
    }
  };

  const verifyCode = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      await verifyAdminOtp(createBrowserSupabaseClient(), normalizedEmail, otp);
      window.location.assign(buildMfaPath(nextPath));
    } catch (verificationError) {
      setError(getAdminLoginError(verificationError));
      setIsPending(false);
    }
  };

  return (
    <section aria-labelledby="login-heading" className="auth-card">
      <p className="eyebrow">Restricted platform access</p>
      <h1 id="login-heading">Local Wellness administration</h1>
      <p className="lede">
        Sign in with the exact email address of an existing platform or municipal administrator.
        This form does not create an account or grant a government role.
      </p>

      <aside className="auth-guidance" aria-label="Choose the correct account">
        <strong>Which account belongs here?</strong>
        <p>
          Use the official email that was invited and authorized for administration. Ordinary
          government operators and ward or department officers should use the Government Dashboard,
          not this Admin Console.
        </p>
      </aside>

      {step === 'request' ? (
        <form aria-busy={isPending} className="stack" onSubmit={(event) => void requestCode(event)}>
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
          <p className="field-hint">
            If this address is authorized, the email may contain a verification code, a secure
            sign-in link, or both.
          </p>
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? 'Sending…' : 'Send verification email'}
          </button>
        </form>
      ) : (
        <form aria-busy={isPending} className="stack" onSubmit={(event) => void verifyCode(event)}>
          <p aria-live="polite" className="success-notice">
            Continue as <strong>{normalizedEmail}</strong>. Enter the code sent to this address or
            open its newest secure sign-in link in this browser.
          </p>
          <p className="field-hint">
            This is the account that will be checked for administrator roles after authentication.
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
            className="secondary-button"
            disabled={isPending}
            onClick={() => {
              setError(null);
              setOtp('');
              setStep('request');
            }}
            type="button"
          >
            That is not my account — use a different email
          </button>
        </form>
      )}

      {error === null ? null : (
        <p aria-live="assertive" className="error-notice" role="alert">
          {error}
        </p>
      )}
      <p className="security-note">
        Never share verification codes or sign in for another official. Invitation and role changes
        create immutable audit records.
      </p>
      <a className="help-link" href="/auth/help">
        Account, invitation, and authenticator help
      </a>
    </section>
  );
};
