'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import {
  cleanupTotpFactor,
  enrollTotpFactor,
  getMfaError,
  getMfaFlowState,
  verifyTotpFactor,
  type TotpEnrollment,
} from '../../../lib/auth/mfa';
import { getSignedInAdminEmail, signOutAdminSession } from '../../../lib/auth/service';
import { createBrowserSupabaseClient } from '../../../lib/supabase/client';

type MfaView =
  | Readonly<{ kind: 'loading' }>
  | Readonly<{ kind: 'error' }>
  | Readonly<{ kind: 'enrollment-required' }>
  | Readonly<{ factorIds: readonly string[]; kind: 'enrollment-recovery' }>
  | Readonly<{ factorId: string; kind: 'challenge' }>
  | Readonly<{ enrollment: TotpEnrollment; kind: 'enrollment' }>;

export const MfaForm = ({ nextPath }: Readonly<{ nextPath: string }>) => {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [code, setCode] = useState('');
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [view, setView] = useState<MfaView>({ kind: 'loading' });
  const isMounted = useRef(true);
  const pendingFactorId = useRef<string | null>(null);

  const loadMfaState = useCallback(async (): Promise<void> => {
    setError(null);
    setView({ kind: 'loading' });

    try {
      const [state, signedInEmail] = await Promise.all([
        getMfaFlowState(supabase),
        getSignedInAdminEmail(supabase),
      ]);
      if (!isMounted.current) return;

      setAccountEmail(signedInEmail);

      if (state.status === 'verified') {
        window.location.replace(nextPath);
        return;
      }

      if (state.status === 'challenge') {
        setView({ factorId: state.factorId, kind: 'challenge' });
        return;
      }

      setView(
        state.status === 'enrollment-recovery'
          ? { factorIds: state.factorIds, kind: 'enrollment-recovery' }
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
      if (view.kind === 'enrollment-recovery') {
        for (const factorId of view.factorIds) {
          await cleanupTotpFactor(supabase, factorId);
        }
        if (!isMounted.current) return;
        setView({ kind: 'enrollment-required' });
      }

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

      await signOutAdminSession(supabase);
      window.location.replace('/auth/login');
    } catch (signOutError) {
      setError(getMfaError(signOutError));
      setIsPending(false);
    }
  };

  const factorIsReady = view.kind === 'challenge' || view.kind === 'enrollment';
  const heading =
    view.kind === 'challenge'
      ? 'Enter your authenticator code'
      : view.kind === 'enrollment' ||
          view.kind === 'enrollment-required' ||
          view.kind === 'enrollment-recovery'
        ? 'Set up your authenticator'
        : 'Authenticator verification';

  return (
    <section aria-labelledby="mfa-heading" className="auth-card">
      <p className="eyebrow">Restricted platform access</p>
      <h1 id="mfa-heading">{heading}</h1>
      <p className="lede">
        This second verification step protects platform administration and privileged operations.
      </p>

      {accountEmail === null ? null : (
        <aside aria-label="Signed-in administrator account" className="account-context">
          <span>Signed in as</span>
          <strong>{accountEmail}</strong>
          <small>Only continue if this is the administrator account you intended to use.</small>
        </aside>
      )}

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
            This account does not have an authenticator yet. The account holder must set one up on
            their own device before continuing.
          </p>
          <p className="field-hint">
            The next step creates one QR code for {accountEmail ?? 'this signed-in account'}. You
            can use any standards-based authenticator application.
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

      {view.kind === 'enrollment-recovery' ? (
        <div className="stack">
          <p>
            An earlier authenticator setup was not completed. Restart setup to remove only that
            unfinished Local Wellness factor and create a fresh QR code.
          </p>
          <button
            className="primary-button"
            disabled={isPending}
            onClick={() => void startEnrollment()}
            type="button"
          >
            {isPending ? 'Restarting…' : 'Restart authenticator setup'}
          </button>
        </div>
      ) : null}

      {view.kind === 'enrollment' ? (
        <div className="mfa-setup stack">
          <strong>New authenticator setup</strong>
          <p>
            Scan this QR code once for <strong>{accountEmail}</strong>. This is not a recurring
            sign-in step; future sign-ins will ask only for the six-digit code already in your app.
          </p>
          {/* Ephemeral provider-generated data URLs must not pass through Next image optimization. */}
          <img
            alt="Scan this QR code with your authenticator application"
            className="mfa-qr"
            height={240}
            referrerPolicy="no-referrer"
            src={view.enrollment.qrCodeSource}
            width={240}
          />
          <p className="field-hint">
            Save the entry as “Local Wellness admin console”. If you cannot scan it, enter this
            one-time setup key:
          </p>
          <code aria-label="Authenticator setup key" className="mfa-secret">
            {view.enrollment.secret}
          </code>
        </div>
      ) : null}

      {factorIsReady ? (
        <form aria-busy={isPending} className="stack" onSubmit={(event) => void verifyCode(event)}>
          {view.kind === 'challenge' ? (
            <p className="auth-status-note">
              An authenticator is already connected to <strong>{accountEmail}</strong>. Open its
              existing Local Wellness entry and enter the current code. You do not need to scan a QR
              code again.
            </p>
          ) : null}
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
            {isPending
              ? 'Verifying…'
              : view.kind === 'enrollment'
                ? 'Complete setup and continue'
                : 'Verify existing authenticator'}
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
          Never share the QR code, setup key, or authenticator code. Each official must enroll and
          use their own authenticator.
        </p>
        <div className="recovery-panel">
          <strong>Cannot access the authenticator?</strong>
          <p>
            There is no MFA bypass. Use the reviewed recovery process, which requires a verified
            official channel, administrator approval, session revocation, and an audit record.
          </p>
          <a className="help-link" href="/auth/help">
            View recovery and account-switch steps
          </a>
        </div>
        <button
          className="secondary-button"
          disabled={isPending}
          onClick={() => void signOut()}
          type="button"
        >
          Sign out and use another email
        </button>
      </div>
    </section>
  );
};
