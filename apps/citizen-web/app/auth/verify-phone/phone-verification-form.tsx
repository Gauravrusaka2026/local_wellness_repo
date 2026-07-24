'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import {
  beginCitizenPhoneVerification,
  getCitizenPhoneVerificationState,
  resendCitizenPhoneVerificationCode,
  verifyCitizenPhoneVerification,
  type CitizenPhoneVerificationAttempt,
} from '../../../lib/auth/phone-verification';
import { getUserFacingAuthError, signOutCitizenSession } from '../../../lib/auth/service';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';

type PhoneVerificationView =
  | Readonly<{ kind: 'loading' }>
  | Readonly<{ kind: 'error' }>
  | Readonly<{ kind: 'phone-required' }>
  | Readonly<{
      attempt: CitizenPhoneVerificationAttempt;
      codeWasSent: boolean;
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
      const state = await getCitizenPhoneVerificationState(supabase);
      if (!isMounted.current) return;

      if (state.status === 'verified') {
        window.location.replace(nextPath);
        return;
      }

      setView(
        state.status === 'verification-required'
          ? {
              attempt: { phone: state.phone, userId: state.userId },
              codeWasSent: false,
              kind: 'verify-code',
            }
          : { kind: 'phone-required' },
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

  const beginVerification = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const attempt = await beginCitizenPhoneVerification(supabase, phone);
      if (!isMounted.current) return;
      setCode('');
      setView({ attempt, codeWasSent: true, kind: 'verify-code' });
    } catch (beginError) {
      if (isMounted.current) {
        setError(getUserFacingAuthError(beginError));
      }
    } finally {
      if (isMounted.current) setIsPending(false);
    }
  };

  const resendCode = async (): Promise<void> => {
    if (view.kind !== 'verify-code') return;

    setError(null);
    setIsPending(true);

    try {
      await resendCitizenPhoneVerificationCode(supabase, view.attempt.userId, view.attempt.phone);
      if (!isMounted.current) return;
      setCode('');
      setView({ ...view, codeWasSent: true });
    } catch (resendError) {
      if (isMounted.current) {
        setError(getUserFacingAuthError(resendError));
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
      await verifyCitizenPhoneVerification(supabase, view.attempt.userId, view.attempt.phone, code);
      window.location.replace(nextPath);
    } catch (verificationError) {
      if (isMounted.current) {
        setError(getUserFacingAuthError(verificationError));
        setIsPending(false);
      }
    }
  };

  const chooseDifferentPhone = (): void => {
    setCode('');
    setError(null);
    setPhone('');
    setView({ kind: 'phone-required' });
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
          ? 'Confirm a mobile number with a one-time SMS code to continue.'
          : 'Add a confirmed mobile number now, or continue during the staged rollout.'}
      </p>

      <div className="auth-context compact">
        <span>Signed in as</span>
        <strong>{accountContact}</strong>
        <p>The confirmed phone number will belong to this email-and-password account.</p>
      </div>

      {!isRequired ? (
        <p className="setup-notice" role="status">
          Phone verification is optional in observe mode. Continuing keeps email-and-password access
          active but does not mark this account as phone verified.
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

      {view.kind === 'phone-required' ? (
        <form
          aria-busy={isPending}
          className="stack"
          onSubmit={(event) => void beginVerification(event)}
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

      {view.kind === 'verify-code' ? (
        <form aria-busy={isPending} className="stack" onSubmit={(event) => void verifyCode(event)}>
          <p
            aria-live="polite"
            className={view.codeWasSent ? 'success-notice' : 'setup-notice'}
            role="status"
          >
            {view.codeWasSent
              ? `A verification code was sent to ${view.attempt.phone}.`
              : `Enter the latest code sent to ${view.attempt.phone}, or request a new one.`}
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
            onClick={() => void resendCode()}
            type="button"
          >
            Send a new code
          </button>
          <button
            className="text-button"
            disabled={isPending}
            onClick={chooseDifferentPhone}
            type="button"
          >
            Use a different phone number
          </button>
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
