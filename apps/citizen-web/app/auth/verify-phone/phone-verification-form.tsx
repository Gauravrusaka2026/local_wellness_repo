'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import {
  challengeCitizenPhoneFactor,
  enrollCitizenPhoneFactor,
  getCitizenPhoneMfaState,
  removePendingCitizenPhoneFactor,
  verifyCitizenPhoneFactor,
} from '../../../lib/auth/phone-mfa';
import { getUserFacingAuthError, signOutCitizenSession } from '../../../lib/auth/service';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';

type PhoneVerificationView =
  | Readonly<{ kind: 'loading' }>
  | Readonly<{ kind: 'error' }>
  | Readonly<{ kind: 'enrollment-required' }>
  | Readonly<{
      factorId: string;
      factorStatus: 'unverified' | 'verified';
      kind: 'challenge-required';
    }>
  | Readonly<{
      challengeId: string;
      factorId: string;
      factorStatus: 'unverified' | 'verified';
      kind: 'verify-code';
    }>;

export const PhoneVerificationForm = ({
  accountContact,
  isRequired,
  nextPath,
}: Readonly<{ accountContact: string; isRequired: boolean; nextPath: string }>) => {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [phone, setPhone] = useState('');
  const [view, setView] = useState<PhoneVerificationView>({ kind: 'loading' });
  const isMounted = useRef(true);

  const loadPhoneVerificationState = useCallback(async (): Promise<void> => {
    setError(null);
    setView({ kind: 'loading' });

    try {
      const state = await getCitizenPhoneMfaState(supabase);
      if (!isMounted.current) return;

      if (state.status === 'verified') {
        window.location.replace(nextPath);
        return;
      }

      setView(
        state.status === 'challenge-required'
          ? {
              factorId: state.factorId,
              factorStatus: state.factorStatus,
              kind: 'challenge-required',
            }
          : { kind: 'enrollment-required' },
      );
    } catch (loadError) {
      if (!isMounted.current) return;
      setError(getUserFacingAuthError(loadError));
      setView({ kind: 'error' });
    }
  }, [nextPath, supabase]);

  useEffect(() => {
    isMounted.current = true;
    const initialLoad = window.setTimeout(() => void loadPhoneVerificationState(), 0);

    return () => {
      isMounted.current = false;
      window.clearTimeout(initialLoad);
    };
  }, [loadPhoneVerificationState]);

  const sendCode = async (
    factorId: string,
    factorStatus: 'unverified' | 'verified',
  ): Promise<void> => {
    setError(null);
    setIsPending(true);

    try {
      const challengeId = await challengeCitizenPhoneFactor(supabase, factorId);
      if (!isMounted.current) return;
      setCode('');
      setView({ challengeId, factorId, factorStatus, kind: 'verify-code' });
    } catch (challengeError) {
      if (isMounted.current) {
        setError(getUserFacingAuthError(challengeError));
      }
    } finally {
      if (isMounted.current) setIsPending(false);
    }
  };

  const enrollAndSendCode = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const factorId = await enrollCitizenPhoneFactor(supabase, phone);
      const challengeId = await challengeCitizenPhoneFactor(supabase, factorId);
      if (!isMounted.current) return;
      setCode('');
      setView({ challengeId, factorId, factorStatus: 'unverified', kind: 'verify-code' });
    } catch (enrollmentError) {
      if (isMounted.current) {
        setError(getUserFacingAuthError(enrollmentError));
      }
    } finally {
      if (isMounted.current) setIsPending(false);
    }
  };

  const verifyCode = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (view.kind !== 'verify-code') return;

    setError(null);
    setIsPending(true);

    try {
      await verifyCitizenPhoneFactor(supabase, view.factorId, view.challengeId, code);
      window.location.replace(nextPath);
    } catch (verificationError) {
      if (isMounted.current) {
        setError(getUserFacingAuthError(verificationError));
        setIsPending(false);
      }
    }
  };

  const chooseDifferentPhone = async (): Promise<void> => {
    if (
      (view.kind !== 'challenge-required' && view.kind !== 'verify-code') ||
      view.factorStatus !== 'unverified'
    ) {
      return;
    }

    setError(null);
    setIsPending(true);
    try {
      await removePendingCitizenPhoneFactor(supabase, view.factorId);
      setCode('');
      setPhone('');
      setView({ kind: 'enrollment-required' });
    } catch (removalError) {
      setError(getUserFacingAuthError(removalError));
    } finally {
      setIsPending(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setError(null);
    setIsPending(true);

    try {
      await signOutCitizenSession(supabase);
      window.location.replace('/auth/login');
    } catch (signOutError) {
      setError(getUserFacingAuthError(signOutError));
      setIsPending(false);
    }
  };

  return (
    <section aria-labelledby="phone-verification-heading" className="auth-card">
      <p className="eyebrow">Secure citizen access</p>
      <h1 id="phone-verification-heading">
        {isRequired ? 'Phone verification required' : 'Verify your phone (optional)'}
      </h1>
      <p className="lede">
        {isRequired
          ? 'Enter the one-time SMS code to finish secure sign-in.'
          : 'Add phone verification now for stronger citizen-account protection, or continue during the staged rollout.'}
      </p>

      <div className="auth-context compact">
        <span>Signed in as</span>
        <strong>{accountContact}</strong>
        <p>This phone factor belongs to this email-and-password account.</p>
      </div>

      {!isRequired ? (
        <p className="setup-notice" role="status">
          Phone MFA is optional in observe mode. Continuing without it keeps email-and-password
          access active; it does not mark this account as phone verified.
        </p>
      ) : null}

      {view.kind === 'loading' ? (
        <p aria-live="polite" className="loading-indicator" role="status">
          Checking phone verification…
        </p>
      ) : null}

      {view.kind === 'error' ? (
        <button
          className="secondary-button"
          disabled={isPending}
          onClick={() => void loadPhoneVerificationState()}
          type="button"
        >
          Try again
        </button>
      ) : null}

      {view.kind === 'enrollment-required' ? (
        <form
          aria-busy={isPending}
          className="stack"
          onSubmit={(event) => void enrollAndSendCode(event)}
        >
          <label htmlFor="verification-phone">Mobile number</label>
          <input
            autoComplete="tel"
            disabled={isPending}
            id="verification-phone"
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
            Include the country code. The number must be able to receive SMS messages.
          </p>
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? 'Sending…' : 'Send verification code'}
          </button>
        </form>
      ) : null}

      {view.kind === 'challenge-required' ? (
        <div className="stack">
          <p>
            {view.factorStatus === 'verified'
              ? 'Send a new code to your verified phone to continue.'
              : 'Finish verifying the phone number you added to this account.'}
          </p>
          <button
            className="primary-button"
            disabled={isPending}
            onClick={() => void sendCode(view.factorId, view.factorStatus)}
            type="button"
          >
            {isPending ? 'Sending…' : 'Send verification code'}
          </button>
          {view.factorStatus === 'unverified' ? (
            <button
              className="text-button"
              disabled={isPending}
              onClick={() => void chooseDifferentPhone()}
              type="button"
            >
              Use a different phone number
            </button>
          ) : null}
        </div>
      ) : null}

      {view.kind === 'verify-code' ? (
        <form aria-busy={isPending} className="stack" onSubmit={(event) => void verifyCode(event)}>
          <p aria-live="polite" className="success-notice" role="status">
            A verification code was sent by SMS.
          </p>
          <label htmlFor="phone-code">Verification code</label>
          <input
            autoComplete="one-time-code"
            disabled={isPending}
            id="phone-code"
            inputMode="numeric"
            maxLength={8}
            onChange={(event) => {
              setCode(event.target.value);
              setError(null);
            }}
            pattern="[0-9 ]{6,9}"
            placeholder="123456"
            required
            value={code}
          />
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? 'Verifying…' : 'Verify and continue'}
          </button>
          <button
            className="secondary-button"
            disabled={isPending}
            onClick={() => void sendCode(view.factorId, view.factorStatus)}
            type="button"
          >
            Send a new code
          </button>
          {view.factorStatus === 'unverified' ? (
            <button
              className="text-button"
              disabled={isPending}
              onClick={() => void chooseDifferentPhone()}
              type="button"
            >
              Use a different phone number
            </button>
          ) : null}
        </form>
      ) : null}

      {error === null ? null : (
        <p aria-live="assertive" className="error-notice" role="alert">
          {error}
        </p>
      )}

      <div className="verification-footer">
        <p className="security-note">Never share an SMS verification code with anyone.</p>
        <button
          className="text-button"
          disabled={isPending}
          onClick={() => void signOut()}
          type="button"
        >
          Sign out and use another account
        </button>
        {!isRequired ? (
          <a className="secondary-link" href={nextPath}>
            Continue without verifying a phone
          </a>
        ) : null}
      </div>
    </section>
  );
};
