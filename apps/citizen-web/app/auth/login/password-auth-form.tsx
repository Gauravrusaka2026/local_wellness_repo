'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';

import type { CitizenAuthMode } from '../../../lib/auth/input';
import { getCitizenPostPasswordDestination } from '../../../lib/auth/phone-verification';
import {
  createCitizenPasswordAccount,
  getUserFacingAuthError,
  signInCitizenWithPassword,
  signOutCitizenSession,
} from '../../../lib/auth/service';
import type { CitizenPhoneVerificationMode } from '../../../lib/environment';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';

const modeContent: Record<CitizenAuthMode, Readonly<{ heading: string; introduction: string }>> = {
  create_account: {
    heading: 'Create your Local Wellness account',
    introduction:
      'Create your account with email and password, then verify your phone with a one-time SMS code.',
  },
  sign_in: {
    heading: 'Sign in to Local Wellness',
    introduction:
      'Use your email and password. A phone verification code protects access to your citizen account.',
  },
};

export const PasswordAuthForm = ({
  callbackError,
  currentAccount,
  initialEmail,
  nextPath,
  passwordReset,
  phoneVerificationMode,
}: Readonly<{
  callbackError: boolean;
  currentAccount: string | null;
  initialEmail: string;
  nextPath: string;
  passwordReset: boolean;
  phoneVerificationMode: CitizenPhoneVerificationMode;
}>) => {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(
    callbackError ? 'The authentication request is invalid or expired. Sign in again.' : null,
  );
  const [isPending, setIsPending] = useState(false);
  const [mode, setMode] = useState<CitizenAuthMode>('sign_in');
  const [password, setPassword] = useState('');
  const [signedInAccount, setSignedInAccount] = useState(currentAccount);
  const introduction =
    phoneVerificationMode === 'enforce'
      ? modeContent[mode].introduction
      : mode === 'create_account'
        ? 'Create your citizen account with an email address and password.'
        : 'Use your email address and password to open your citizen account.';

  const chooseMode = (nextMode: CitizenAuthMode): void => {
    setMode(nextMode);
    setConfirmPassword('');
    setConfirmationEmail(null);
    setError(null);
    setPassword('');
  };

  const signOutAndSwitchAccount = async (): Promise<void> => {
    setError(null);
    setIsPending(true);

    try {
      await signOutCitizenSession(supabase);
      setSignedInAccount(null);
      setPassword('');
    } catch (signOutError) {
      setError(getUserFacingAuthError(signOutError));
    } finally {
      setIsPending(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);

    if (mode === 'create_account' && password !== confirmPassword) {
      setError('The password confirmation does not match.');
      return;
    }

    setIsPending(true);

    try {
      if (mode === 'create_account') {
        const creationResult = await createCitizenPasswordAccount(supabase, email, password);
        if (creationResult.status === 'email-confirmation-required') {
          setConfirmationEmail(creationResult.email);
          setConfirmPassword('');
          setPassword('');
          setIsPending(false);
          return;
        }
      } else {
        await signInCitizenWithPassword(supabase, email, password);
      }

      window.location.assign(getCitizenPostPasswordDestination(phoneVerificationMode, nextPath));
    } catch (authenticationError) {
      setError(getUserFacingAuthError(authenticationError));
      setIsPending(false);
    }
  };

  return (
    <section aria-labelledby="sign-in-heading" className="auth-card">
      <p className="eyebrow">Citizen account</p>
      <h1 id="sign-in-heading">
        {signedInAccount === null ? modeContent[mode].heading : 'Choose how to continue'}
      </h1>
      <p className="lede">
        {signedInAccount === null
          ? introduction
          : 'A citizen session is already active in this browser.'}
      </p>

      {signedInAccount === null ? null : (
        <div className="auth-context" role="status">
          <span>Currently signed in as</span>
          <strong>{signedInAccount}</strong>
          <p>Continue with this account, or sign out before using a different one.</p>
          <div className="auth-context-actions">
            <Link className="primary-link" href={nextPath}>
              Continue to your account
            </Link>
            <button
              className="secondary-button"
              disabled={isPending}
              onClick={() => void signOutAndSwitchAccount()}
              type="button"
            >
              {isPending ? 'Signing out…' : 'Sign out and switch account'}
            </button>
          </div>
        </div>
      )}

      {phoneVerificationMode === 'observe' ? (
        <p className="setup-notice" role="status">
          Email-and-password access is active. Phone OTP verification is staged and will become
          required after the project SMS provider is configured.
        </p>
      ) : null}

      {passwordReset ? (
        <p aria-live="polite" className="success-notice" role="status">
          Your password was updated. Sign in with the new password.
        </p>
      ) : null}

      {signedInAccount === null ? (
        <fieldset className="channel-picker" disabled={isPending}>
          <legend>Account action</legend>
          <label className={mode === 'sign_in' ? 'choice selected' : 'choice'}>
            <input
              checked={mode === 'sign_in'}
              name="account-mode"
              onChange={() => chooseMode('sign_in')}
              type="radio"
            />
            Sign in
          </label>
          <label className={mode === 'create_account' ? 'choice selected' : 'choice'}>
            <input
              checked={mode === 'create_account'}
              name="account-mode"
              onChange={() => chooseMode('create_account')}
              type="radio"
            />
            Create account
          </label>
        </fieldset>
      ) : null}

      {signedInAccount === null && confirmationEmail !== null ? (
        <div className="stack">
          <p aria-live="polite" className="success-notice" role="status">
            No signed-in session was started. Check <strong>{confirmationEmail}</strong> for an
            email-confirmation message, including its spam folder. If no message arrives, return to
            sign in or reset the password for that address.
          </p>
          {phoneVerificationMode === 'enforce' ? (
            <p className="setup-notice">
              Phone verification starts after the email is confirmed and you sign in.
            </p>
          ) : null}
          <button
            className="secondary-button"
            onClick={() => setConfirmationEmail(null)}
            type="button"
          >
            Use a different email
          </button>
          <button className="text-button" onClick={() => chooseMode('sign_in')} type="button">
            Return to sign in
          </button>
        </div>
      ) : null}

      {signedInAccount === null && confirmationEmail === null ? (
        <form aria-busy={isPending} className="stack" onSubmit={(event) => void submit(event)}>
          <label htmlFor="email">Email address</label>
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
            placeholder="you@example.org"
            required
            type="email"
            value={email}
          />

          <label htmlFor="password">Password</label>
          <input
            autoComplete={mode === 'create_account' ? 'new-password' : 'current-password'}
            disabled={isPending}
            id="password"
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

          {mode === 'create_account' ? (
            <>
              <label htmlFor="confirm-password">Confirm password</label>
              <input
                autoComplete="new-password"
                disabled={isPending}
                id="confirm-password"
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
            </>
          ) : (
            <div className="auth-help-row">
              <Link
                href={
                  email.trim() === ''
                    ? '/auth/forgot-password'
                    : `/auth/forgot-password?email=${encodeURIComponent(email)}`
                }
              >
                Forgot password?
              </Link>
            </div>
          )}

          <button className="primary-button" disabled={isPending} type="submit">
            {isPending
              ? mode === 'create_account'
                ? 'Creating account…'
                : 'Signing in…'
              : mode === 'create_account'
                ? phoneVerificationMode === 'enforce'
                  ? 'Create account and verify phone'
                  : 'Create account'
                : phoneVerificationMode === 'enforce'
                  ? 'Sign in and verify phone'
                  : 'Sign in'}
          </button>
        </form>
      ) : null}

      {error === null ? null : (
        <p aria-live="assertive" className="error-notice" role="alert">
          {error}
        </p>
      )}

      <p className="security-note">
        Never share your password or SMS verification code. Local Wellness staff will never ask for
        either one.
      </p>
    </section>
  );
};
