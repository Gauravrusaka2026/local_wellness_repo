'use client';

import React, { useState, type FormEvent } from 'react';

import { getGovernmentEmailCallbackUrl } from '../../../lib/auth/callback';
import { buildMfaPath } from '../../../lib/auth/mfa';
import {
  getGovernmentLoginError,
  requestGovernmentOtp,
  signInGovernmentWithPassword,
  verifyGovernmentOtp,
} from '../../../lib/auth/service';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';
import { GovernmentAuthorizationNote } from '../government-authorization-note';

type SignInMethod = 'password' | 'verification-email';
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
  const [method, setMethod] = useState<SignInMethod>('password');
  const [normalizedEmail, setNormalizedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<Step>('request');

  const chooseMethod = (nextMethod: SignInMethod): void => {
    setMethod(nextMethod);
    setError(null);
    setNormalizedEmail('');
    setOtp('');
    setPassword('');
    setStep('request');
  };

  const signInWithPassword = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      await signInGovernmentWithPassword(createBrowserSupabaseClient(), email, password);
      window.location.assign(buildMfaPath(nextPath));
    } catch (signInError) {
      setError(getGovernmentLoginError(signInError));
      setIsPending(false);
    }
  };

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
        Use the exact email address of your existing authorized government identity. This form never
        creates a government account or grants a role.
      </p>

      {accountNotice === null ? null : (
        <p aria-live="polite" className="success-notice" role="status">
          {accountNotice}
        </p>
      )}

      <div aria-label="Government sign-in method" className="auth-method-picker" role="group">
        <button
          aria-pressed={method === 'password'}
          className={method === 'password' ? 'auth-method-option selected' : 'auth-method-option'}
          disabled={isPending}
          onClick={() => chooseMethod('password')}
          type="button"
        >
          Password
        </button>
        <button
          aria-pressed={method === 'verification-email'}
          className={
            method === 'verification-email' ? 'auth-method-option selected' : 'auth-method-option'
          }
          disabled={isPending}
          onClick={() => chooseMethod('verification-email')}
          type="button"
        >
          Email code or link
        </button>
      </div>

      {method === 'password' ? (
        <form
          aria-busy={isPending}
          className="stack"
          onSubmit={(event) => void signInWithPassword(event)}
        >
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
          <label htmlFor="password">Password</label>
          <input
            autoComplete="current-password"
            disabled={isPending}
            id="password"
            maxLength={72}
            minLength={8}
            onChange={(event) => {
              setPassword(event.target.value);
              setError(null);
            }}
            required
            type="password"
            value={password}
          />
          <p className="field-hint">
            This signs in an existing, pre-authorized identity. It never creates a government
            account or selects a role.
          </p>
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? 'Signing in…' : 'Sign in and continue'}
          </button>
        </form>
      ) : step === 'request' ? (
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
