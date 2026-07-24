'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import {
  CitizenPasswordRecoveryPhoneRequiredError,
  CitizenPasswordRecoverySecurityError,
  establishCitizenPasswordRecoverySession,
  getUserFacingAuthError,
  requestCitizenPasswordPhoneOtp,
  updateCitizenPasswordWithPhoneOtp,
  type CitizenPasswordPhoneOtpRequest,
  type CitizenPasswordRecoveryIdentity,
} from '../../../lib/auth/service';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';

type RecoveryState = 'loading' | 'ready' | 'invalid' | 'phone-unavailable';

const maskPhone = (phone: string): string => {
  const suffix = phone.slice(-4);
  const prefixLength = Math.max(0, Math.min(3, phone.length - suffix.length));
  return `${phone.slice(0, prefixLength)}••••••${suffix}`;
};

export const ResetPasswordForm = () => {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [code, setCode] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<CitizenPasswordRecoveryIdentity | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [password, setPassword] = useState('');
  const [recoveryState, setRecoveryState] = useState<RecoveryState>('loading');
  const [request, setRequest] = useState<CitizenPasswordPhoneOtpRequest | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const callbackUrl = window.location.href;
    window.history.replaceState(null, '', '/auth/reset-password');

    const establishSession = async (): Promise<void> => {
      try {
        const recoveryIdentity = await establishCitizenPasswordRecoverySession(
          supabase,
          callbackUrl,
        );
        setIdentity(recoveryIdentity);
        setRecoveryState('ready');
      } catch (recoveryError) {
        if (recoveryError instanceof CitizenPasswordRecoveryPhoneRequiredError) {
          setRecoveryState('phone-unavailable');
        } else {
          setError(getUserFacingAuthError(recoveryError));
          setRecoveryState('invalid');
        }
      }
    };

    void establishSession();
  }, [supabase]);

  const sendCode = async (): Promise<void> => {
    if (identity === null || isPending) {
      return;
    }

    setError(null);
    setIsPending(true);
    try {
      const nextRequest = await requestCitizenPasswordPhoneOtp(supabase, identity);
      setCode('');
      setRequest(nextRequest);
    } catch (sendError) {
      setError(getUserFacingAuthError(sendError));
      if (sendError instanceof CitizenPasswordRecoverySecurityError) {
        setRecoveryState('invalid');
      }
    } finally {
      setIsPending(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);

    if (request === null) {
      setError('Send a verification code to the confirmed phone before changing the password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('The password confirmation does not match.');
      return;
    }

    setIsPending(true);
    try {
      await updateCitizenPasswordWithPhoneOtp(supabase, password, code, request);
      setCode('');
      setPassword('');
      setConfirmPassword('');
      setRequest(null);
      window.location.replace('/auth/login?reset=success');
    } catch (updateError) {
      setError(getUserFacingAuthError(updateError));
      if (updateError instanceof CitizenPasswordRecoverySecurityError) {
        setRecoveryState('invalid');
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section aria-labelledby="reset-password-heading" className="auth-card">
      <p className="eyebrow">Citizen account recovery</p>
      <h1 id="reset-password-heading">Verify your phone and choose a new password</h1>

      {recoveryState === 'loading' ? (
        <p aria-live="polite" className="loading-indicator" role="status">
          Verifying the password-reset request…
        </p>
      ) : null}

      {recoveryState === 'invalid' ? (
        <div className="stack">
          <p>The reset link cannot be used. Request a new one.</p>
          <Link className="primary-link" href="/auth/forgot-password">
            Request a new link
          </Link>
        </div>
      ) : null}

      {recoveryState === 'phone-unavailable' ? (
        <div className="stack">
          <p className="error-notice" role="alert">
            This account did not have a confirmed phone before recovery started, so its password
            cannot be changed here. The recovery session was closed for safety. Contact project
            support to restore access.
          </p>
          <Link className="primary-link" href="/auth/login">
            Return to sign in
          </Link>
        </div>
      ) : null}

      {recoveryState === 'ready' && identity !== null ? (
        <div className="stack">
          <p className="auth-context compact">
            Resetting the password for{' '}
            <strong>{identity.email ?? 'the account verified by this recovery link'}</strong>. A
            fresh SMS code must be sent to <strong>{maskPhone(identity.phone)}</strong>. Updating
            the password will sign out every session for this account.
          </p>
          {request === null ? (
            <button
              className="primary-button"
              disabled={isPending}
              onClick={() => void sendCode()}
              type="button"
            >
              {isPending ? 'Sending…' : 'Send code to my confirmed phone'}
            </button>
          ) : (
            <form aria-busy={isPending} className="stack" onSubmit={(event) => void submit(event)}>
              <p aria-live="polite" className="success-notice" role="status">
                A code was sent. Enter the newest SMS code and choose your new password.
              </p>
              <label htmlFor="phone-verification-code">SMS verification code</label>
              <input
                autoComplete="one-time-code"
                disabled={isPending}
                id="phone-verification-code"
                inputMode="numeric"
                maxLength={8}
                onChange={(event) => {
                  setCode(event.target.value);
                  setError(null);
                }}
                placeholder="123456"
                required
                value={code}
              />
              <label htmlFor="new-password">New password</label>
              <input
                autoComplete="new-password"
                disabled={isPending}
                id="new-password"
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
              <label htmlFor="confirm-new-password">Confirm new password</label>
              <input
                autoComplete="new-password"
                disabled={isPending}
                id="confirm-new-password"
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
              <button className="primary-button" disabled={isPending} type="submit">
                {isPending ? 'Updating…' : 'Verify code and update password'}
              </button>
              <button
                className="secondary-button"
                disabled={isPending}
                onClick={() => void sendCode()}
                type="button"
              >
                Send another code
              </button>
            </form>
          )}
          <p className="auth-context compact">
            If you no longer control this phone, stop here and contact project support. Email
            recovery cannot replace verification of an already confirmed phone.
          </p>
        </div>
      ) : null}

      {error === null ? null : (
        <p aria-live="assertive" className="error-notice" role="alert">
          {error}
        </p>
      )}
    </section>
  );
};
