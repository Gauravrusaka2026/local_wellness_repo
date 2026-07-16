'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import { signOutGovernmentSession } from '../../../lib/auth/service';
import {
  cleanupTotpFactor,
  enrollTotpFactor,
  getMfaError,
  getMfaFlowState,
  verifyTotpFactor,
  type TotpEnrollment,
} from '../../../lib/auth/mfa';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';

type MfaView =
  | Readonly<{ kind: 'loading' }>
  | Readonly<{ kind: 'error' }>
  | Readonly<{ kind: 'enrollment-required' }>
  | Readonly<{ factorId: string; kind: 'challenge' }>
  | Readonly<{ enrollment: TotpEnrollment; kind: 'enrollment' }>;

export const MfaForm = ({ nextPath }: Readonly<{ nextPath: string }>) => {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [view, setView] = useState<MfaView>({ kind: 'loading' });
  const isMounted = useRef(true);
  const pendingFactorId = useRef<string | null>(null);

  const loadMfaState = useCallback(async (): Promise<void> => {
    setError(null);
    setView({ kind: 'loading' });

    try {
      const state = await getMfaFlowState(supabase);
      if (!isMounted.current) return;

      if (state.status === 'verified') {
        window.location.replace(nextPath);
        return;
      }

      setView(
        state.status === 'challenge'
          ? { factorId: state.factorId, kind: 'challenge' }
          : { kind: 'enrollment-required' },
      );
    } catch (loadError) {
      if (!isMounted.current) return;
      setError(getMfaError(loadError));
      setView({ kind: 'error' });
    }
  }, [nextPath, supabase]);

  useEffect(() => {
    isMounted.current = true;
    const initialLoad = window.setTimeout(() => void loadMfaState(), 0);

    return () => {
      isMounted.current = false;
      window.clearTimeout(initialLoad);
      const factorId = pendingFactorId.current;
      pendingFactorId.current = null;

      if (factorId) {
        void cleanupTotpFactor(supabase, factorId).catch(() => undefined);
      }
    };
  }, [loadMfaState, supabase]);

  const startEnrollment = async (): Promise<void> => {
    setError(null);
    setIsPending(true);

    try {
      const enrollment = await enrollTotpFactor(supabase);
      if (!isMounted.current) {
        await cleanupTotpFactor(supabase, enrollment.factorId).catch(() => undefined);
        return;
      }

      pendingFactorId.current = enrollment.factorId;
      setView({ enrollment, kind: 'enrollment' });
    } catch (enrollmentError) {
      if (isMounted.current) {
        setError(getMfaError(enrollmentError));
      }
    } finally {
      if (isMounted.current) {
        setIsPending(false);
      }
    }
  };

  const cancelEnrollment = async (): Promise<void> => {
    const factorId = pendingFactorId.current;

    if (!factorId) {
      await loadMfaState();
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      await cleanupTotpFactor(supabase, factorId);
      pendingFactorId.current = null;
      setCode('');
      await loadMfaState();
    } catch (cleanupError) {
      setError(getMfaError(cleanupError));
    } finally {
      setIsPending(false);
    }
  };

  const verifyCode = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const factorId =
      view.kind === 'challenge'
        ? view.factorId
        : view.kind === 'enrollment'
          ? view.enrollment.factorId
          : null;

    if (!factorId) return;

    setError(null);
    setIsPending(true);

    try {
      await verifyTotpFactor(supabase, factorId, code);
      pendingFactorId.current = null;
      window.location.replace(nextPath);
    } catch (verificationError) {
      setError(getMfaError(verificationError));
      setIsPending(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setError(null);
    setIsPending(true);

    try {
      const factorId = pendingFactorId.current;
      if (factorId) {
        await cleanupTotpFactor(supabase, factorId).catch(() => undefined);
        pendingFactorId.current = null;
      }

      await signOutGovernmentSession(supabase);
      window.location.replace('/auth/login');
    } catch (signOutError) {
      setError(getMfaError(signOutError));
      setIsPending(false);
    }
  };

  const factorIsReady = view.kind === 'challenge' || view.kind === 'enrollment';

  return (
    <section aria-labelledby="mfa-heading" className="auth-card">
      <p className="eyebrow">Restricted government access</p>
      <h1 id="mfa-heading">Authenticator verification</h1>
      <p className="lede">
        A second verification step protects government operations and citizen complaint data.
      </p>

      {view.kind === 'loading' ? (
        <p aria-live="polite" className="loading-indicator" role="status">
          Checking authenticator status…
        </p>
      ) : null}

      {view.kind === 'error' ? (
        <div className="stack">
          <button
            className="secondary-button"
            disabled={isPending}
            onClick={() => void loadMfaState()}
            type="button"
          >
            Try again
          </button>
        </div>
      ) : null}

      {view.kind === 'enrollment-required' ? (
        <div className="stack">
          <p>
            Set up a time-based authenticator before continuing. You can use any standards-based
            authenticator application.
          </p>
          <button
            className="primary-button"
            disabled={isPending}
            onClick={() => void startEnrollment()}
            type="button"
          >
            {isPending ? 'Preparing…' : 'Set up authenticator'}
          </button>
        </div>
      ) : null}

      {view.kind === 'enrollment' ? (
        <div className="mfa-setup stack">
          <p>Scan this QR code in your authenticator application.</p>
          <Image
            alt="Scan this QR code with your authenticator application"
            className="mfa-qr"
            height={240}
            src={view.enrollment.qrCodeSource}
            unoptimized
            width={240}
          />
          <p className="field-hint">If you cannot scan it, enter this one-time setup key:</p>
          <code aria-label="Authenticator setup key" className="mfa-secret">
            {view.enrollment.secret}
          </code>
        </div>
      ) : null}

      {factorIsReady ? (
        <form aria-busy={isPending} className="stack" onSubmit={(event) => void verifyCode(event)}>
          <label htmlFor="authenticator-code">Authenticator code</label>
          <input
            autoComplete="one-time-code"
            disabled={isPending}
            id="authenticator-code"
            inputMode="numeric"
            maxLength={7}
            onChange={(event) => {
              setCode(event.target.value);
              setError(null);
            }}
            pattern="[0-9 ]{6,7}"
            placeholder="123456"
            required
            value={code}
          />
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? 'Verifying…' : 'Verify and continue'}
          </button>
          {view.kind === 'enrollment' ? (
            <button
              className="text-button"
              disabled={isPending}
              onClick={() => void cancelEnrollment()}
              type="button"
            >
              Cancel setup
            </button>
          ) : null}
        </form>
      ) : null}

      {error === null ? null : (
        <p aria-live="assertive" className="error-notice" role="alert">
          {error}
        </p>
      )}

      <div className="mfa-footer">
        <p className="security-note">
          Never share the QR code, setup key, or authenticator code. If you lost your authenticator,
          contact a platform administrator for account recovery.
        </p>
        <button
          className="text-button"
          disabled={isPending}
          onClick={() => void signOut()}
          type="button"
        >
          Sign out
        </button>
      </div>
    </section>
  );
};
