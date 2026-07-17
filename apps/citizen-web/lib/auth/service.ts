import { ConfigurationError } from '@local-wellness/config';
import type { SupabaseClient } from '@supabase/supabase-js';

import { recordAuthAuditEventSafely } from '../api/auth-audit';
import { AuthInputError, normalizeEmail, normalizePassword } from './input';

type SignOutAuditRecorder = (
  accessToken: string,
  eventType: 'sign_out_succeeded',
) => Promise<boolean>;

type SignInAuditRecorder = (
  accessToken: string,
  eventType: 'sign_in_succeeded',
) => Promise<boolean>;

export type CitizenPasswordAccountCreationResult =
  | Readonly<{ status: 'authenticated' }>
  | Readonly<{ email: string; status: 'email-confirmation-required' }>;

const requireSessionAccessToken = (
  accessToken: string | null | undefined,
  error: Error = new Error('Authentication session was not established.'),
): string => {
  if (!accessToken) {
    throw error;
  }

  return accessToken;
};

export const createCitizenPasswordAccount = async (
  supabase: SupabaseClient,
  emailInput: string,
  passwordInput: string,
  recordAuditEvent: SignInAuditRecorder = recordAuthAuditEventSafely,
): Promise<CitizenPasswordAccountCreationResult> => {
  const email = normalizeEmail(emailInput);
  const result = await supabase.auth.signUp({
    email,
    password: normalizePassword(passwordInput),
  });

  if (result.error) {
    throw result.error;
  }

  const accessToken = result.data.session?.access_token;
  if (!accessToken) {
    return { email, status: 'email-confirmation-required' };
  }

  await recordAuditEvent(accessToken, 'sign_in_succeeded');
  return { status: 'authenticated' };
};

export const signInCitizenWithPassword = async (
  supabase: SupabaseClient,
  emailInput: string,
  passwordInput: string,
  recordAuditEvent: SignInAuditRecorder = recordAuthAuditEventSafely,
): Promise<void> => {
  const result = await supabase.auth.signInWithPassword({
    email: normalizeEmail(emailInput),
    password: normalizePassword(passwordInput),
  });

  if (result.error) {
    throw result.error;
  }

  const accessToken = requireSessionAccessToken(result.data.session?.access_token);
  await recordAuditEvent(accessToken, 'sign_in_succeeded');
};

export const requestCitizenPasswordReset = async (
  supabase: SupabaseClient,
  emailInput: string,
  redirectTo: string,
): Promise<string> => {
  const email = normalizeEmail(emailInput);
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    throw error;
  }

  return email;
};

export const updateCitizenPassword = async (
  supabase: SupabaseClient,
  passwordInput: string,
): Promise<void> => {
  const { error } = await supabase.auth.updateUser({
    password: normalizePassword(passwordInput),
  });

  if (error) {
    throw error;
  }

  const signOutResult = await supabase.auth.signOut({ scope: 'global' });
  if (signOutResult.error) {
    throw signOutResult.error;
  }
};

export const establishCitizenPasswordRecoverySession = async (
  supabase: SupabaseClient,
  callbackUrl: string,
): Promise<string | null> => {
  let url: URL;
  try {
    url = new URL(callbackUrl);
  } catch {
    throw new Error('The password reset request is invalid or expired.');
  }

  if (url.hash.includes('access_token') || url.hash.includes('refresh_token')) {
    throw new Error('The password reset request is invalid or expired.');
  }

  if (
    url.searchParams.has('error') ||
    url.searchParams.has('error_code') ||
    url.searchParams.has('error_description')
  ) {
    throw new Error('The password reset request is invalid or expired.');
  }

  const codeValues = url.searchParams.getAll('code');
  const tokenHashValues = url.searchParams.getAll('token_hash');
  const typeValues = url.searchParams.getAll('type');
  const code = codeValues.length === 1 ? codeValues[0] : undefined;
  const tokenHash = tokenHashValues.length === 1 ? tokenHashValues[0] : undefined;
  const hasOneCode = Boolean(code && code.trim() === code && code.length <= 16_384);
  const hasRecoveryToken = Boolean(
    tokenHash &&
    tokenHash.trim() === tokenHash &&
    tokenHash.length <= 16_384 &&
    typeValues.length === 1 &&
    typeValues[0] === 'recovery',
  );

  const hasExactlyOneCredential = Number(hasOneCode) + Number(hasRecoveryToken) === 1;
  const result =
    !hasExactlyOneCredential || (!code && !tokenHash)
      ? null
      : hasOneCode && code
        ? await supabase.auth.exchangeCodeForSession(code)
        : tokenHash
          ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
          : null;

  if (result === null || result.error || !result.data.session?.access_token) {
    throw result?.error ?? new Error('The password reset request is invalid or expired.');
  }

  return result.data.user?.email ?? result.data.session.user?.email ?? null;
};

export const getCitizenPasswordRecoveryUrl = (origin: string): string =>
  new URL('/auth/reset-password', origin).toString();

export const signOutCitizenSession = async (
  supabase: SupabaseClient,
  recordAuditEvent: SignOutAuditRecorder = recordAuthAuditEventSafely,
): Promise<void> => {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  if (accessToken) {
    await recordAuditEvent(accessToken, 'sign_out_succeeded');
  }
};

export const getUserFacingAuthError = (error: unknown): string => {
  if (error instanceof AuthInputError || error instanceof ConfigurationError) {
    return error.message;
  }

  if (error instanceof Error) {
    const normalizedMessage = error.message.toLowerCase();

    if (normalizedMessage.includes('rate') || normalizedMessage.includes('too many')) {
      return 'Too many attempts. Wait a moment before trying again.';
    }

    if (
      normalizedMessage.includes('invalid login') ||
      normalizedMessage.includes('invalid credentials')
    ) {
      return 'The email address or password is incorrect.';
    }

    if (normalizedMessage.includes('email not confirmed')) {
      return 'Confirm this email address before signing in. Check its inbox, including spam, for the confirmation message.';
    }

    if (
      normalizedMessage.includes('already registered') ||
      normalizedMessage.includes('already exists')
    ) {
      return 'An account may already use this email address. Sign in or reset its password.';
    }

    if (normalizedMessage.includes('weak password')) {
      return 'Use a stronger password and try again.';
    }

    if (
      normalizedMessage.includes('mfa_phone') ||
      normalizedMessage.includes('phone factor') ||
      normalizedMessage.includes('sms')
    ) {
      return 'Phone verification is unavailable. Ask the administrator to check Supabase Phone MFA and the SMS provider.';
    }

    if (
      normalizedMessage.includes('failed to fetch') ||
      normalizedMessage.includes('network') ||
      normalizedMessage.includes('fetch failed')
    ) {
      return 'The authentication service could not be reached. Check your connection and try again.';
    }

    if (normalizedMessage.includes('expired') || normalizedMessage.includes('invalid')) {
      return 'The authentication request is invalid or expired.';
    }

    return 'Authentication could not be completed. Please try again.';
  }

  return 'Authentication could not be completed. Please try again.';
};
