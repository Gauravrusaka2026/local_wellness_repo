'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';

import type { CitizenAuthMode } from '../../../lib/auth/input';
import {
  enrollCitizenPhoneFactor,
  getCitizenPostPasswordDestination,
} from '../../../lib/auth/phone-mfa';
import {
  createCitizenPasswordAccount,
  getUserFacingAuthError,
  signInCitizenWithPassword,
} from '../../../lib/auth/service';
import type { CitizenPhoneMfaMode } from '../../../lib/environment';
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
  nextPath,
  passwordReset,
  phoneMfaMode,
}: Readonly<{
  callbackError: boolean;
  nextPath: string;
  passwordReset: boolean;
  phoneMfaMode: CitizenPhoneMfaMode;
}>) => {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(
    callbackError ? 'The authentication request is invalid or expired. Sign in again.' : null,
  );
  const [isPending, setIsPending] = useState(false);
  const [mode, setMode] = useState<CitizenAuthMode>('sign_in');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const introduction =
    phoneMfaMode === 'enforce'
      ? modeContent[mode].introduction
      : mode === 'create_account'
        ? 'Create your citizen account with an email address and password.'
        : 'Use your email address and password to open your citizen account.';

  const chooseMode = (nextMode: CitizenAuthMode): void => {
    setMode(nextMode);
    setConfirmPassword('');
    setError(null);
    setPassword('');
    setPhone('');
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
        await createCitizenPasswordAccount(supabase, email, password);
        if (phoneMfaMode === 'enforce') {
          await enrollCitizenPhoneFactor(supabase, phone);
        }
      } else {
        await signInCitizenWithPassword(supabase, email, password);
      }

      window.location.assign(getCitizenPostPasswordDestination(phoneMfaMode, nextPath));
    } catch (authenticationError) {
      setError(getUserFacingAuthError(authenticationError));
      setIsPending(false);
    }
  };

  return (
    <section aria-labelledby="sign-in-heading" className="auth-card">
      <p className="eyebrow">Citizen account</p>
      <h1 id="sign-in-heading">{modeContent[mode].heading}</h1>
      <p className="lede">{introduction}</p>

      {phoneMfaMode === 'observe' ? (
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

            {phoneMfaMode === 'enforce' ? (
              <>
                <label htmlFor="phone">Mobile number</label>
                <input
                  autoComplete="tel"
                  disabled={isPending}
                  id="phone"
                  inputMode="tel"
                  onChange={(event) => {
                    setPhone(event.target.value);
                    setError(null);
                  }}
                  placeholder="+91 98765 43210"
                  required
                  type="tel"
                  value={phone}
                />
                <p className="field-hint">
                  Include the country code. We use this number as your Supabase Phone MFA factor,
                  not as a separate sign-in identity. Standard SMS charges may apply.
                </p>
              </>
            ) : null}
          </>
        ) : (
          <div className="auth-help-row">
            <Link href="/auth/forgot-password">Forgot password?</Link>
          </div>
        )}

        <button className="primary-button" disabled={isPending} type="submit">
          {isPending
            ? mode === 'create_account'
              ? 'Creating account…'
              : 'Signing in…'
            : mode === 'create_account'
              ? phoneMfaMode === 'enforce'
                ? 'Create account and verify phone'
                : 'Create account'
              : phoneMfaMode === 'enforce'
                ? 'Sign in and verify phone'
                : 'Sign in'}
        </button>
      </form>

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
