'use client';

import { useState, type FormEvent } from 'react';

import {
  getUserFacingAuthError,
  requestCitizenOtp,
  verifyCitizenOtp,
} from '../../../lib/auth/service';
import { getCitizenEmailCallbackUrl } from '../../../lib/auth/callback';
import type { AuthChannel } from '../../../lib/auth/input';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';

type Step = 'request' | 'verify';

export const OtpSignInForm = ({
  callbackError,
  nextPath,
}: Readonly<{ callbackError: boolean; nextPath: string }>) => {
  const [channel, setChannel] = useState<AuthChannel>('phone');
  const [error, setError] = useState<string | null>(
    callbackError
      ? 'The authentication request is invalid or expired. Request a new verification email.'
      : null,
  );
  const [identifier, setIdentifier] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [normalizedIdentifier, setNormalizedIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<Step>('request');

  const chooseChannel = (nextChannel: AuthChannel): void => {
    setChannel(nextChannel);
    setError(null);
    setIdentifier('');
    setNormalizedIdentifier('');
    setOtp('');
    setStep('request');
  };

  const requestCode = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const normalizedValue = await requestCitizenOtp(
        createBrowserSupabaseClient(),
        channel,
        identifier,
        getCitizenEmailCallbackUrl(window.location.origin),
      );
      setNormalizedIdentifier(normalizedValue);
      setStep('verify');
    } catch (requestError) {
      setError(getUserFacingAuthError(requestError));
    } finally {
      setIsPending(false);
    }
  };

  const verifyCode = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      await verifyCitizenOtp(createBrowserSupabaseClient(), channel, normalizedIdentifier, otp);
      window.location.assign(nextPath);
    } catch (verificationError) {
      setError(getUserFacingAuthError(verificationError));
      setIsPending(false);
    }
  };

  return (
    <section aria-labelledby="sign-in-heading" className="auth-card">
      <p className="eyebrow">Citizen account</p>
      <h1 id="sign-in-heading">Sign in to Local Wellness</h1>
      <p className="lede">
        Use a one-time code or secure email link. We never ask citizens to create or remember a
        password.
      </p>

      <fieldset className="channel-picker" disabled={isPending}>
        <legend>Sign-in method</legend>
        <label className={channel === 'phone' ? 'choice selected' : 'choice'}>
          <input
            checked={channel === 'phone'}
            name="channel"
            onChange={() => {
              chooseChannel('phone');
            }}
            type="radio"
          />
          Phone
        </label>
        <label className={channel === 'email' ? 'choice selected' : 'choice'}>
          <input
            checked={channel === 'email'}
            name="channel"
            onChange={() => {
              chooseChannel('email');
            }}
            type="radio"
          />
          Email
        </label>
      </fieldset>

      {step === 'request' ? (
        <form aria-busy={isPending} className="stack" onSubmit={(event) => void requestCode(event)}>
          <label htmlFor="identifier">
            {channel === 'phone' ? 'Mobile number' : 'Email address'}
          </label>
          <input
            autoCapitalize="none"
            autoComplete={channel === 'phone' ? 'tel' : 'email'}
            disabled={isPending}
            id="identifier"
            inputMode={channel === 'phone' ? 'tel' : 'email'}
            onChange={(event) => {
              setIdentifier(event.target.value);
              setError(null);
            }}
            placeholder={channel === 'phone' ? '+91 98765 43210' : 'you@example.org'}
            required
            type={channel === 'phone' ? 'tel' : 'email'}
            value={identifier}
          />
          {channel === 'email' ? (
            <p className="field-hint">
              Your email may contain a 6-digit verification code, a secure sign-in link, or both.
            </p>
          ) : (
            <p className="field-hint">Include the country code. Standard SMS charges may apply.</p>
          )}
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending
              ? 'Sending…'
              : channel === 'email'
                ? 'Send verification email'
                : 'Send verification code'}
          </button>
        </form>
      ) : (
        <form aria-busy={isPending} className="stack" onSubmit={(event) => void verifyCode(event)}>
          <p aria-live="polite" className="success-notice">
            Check <strong>{normalizedIdentifier}</strong>. Enter the verification code below or open
            the newest secure sign-in link in this browser.
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
            Use a different contact
          </button>
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
