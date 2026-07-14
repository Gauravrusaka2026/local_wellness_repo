import type { SupabaseClient } from '@supabase/supabase-js';
import { ConfigurationError } from '@local-wellness/config';

import { recordAuthAuditEventSafely } from '../api/auth-audit';
import { EmailInputError, normalizeEmail, normalizeOtp, OtpInputError } from './input';

type SignOutAuditRecorder = (
  accessToken: string,
  eventType: 'sign_out_succeeded',
) => Promise<boolean>;

type OtpAuditRecorder = (accessToken: string, eventType: 'otp_verified') => Promise<boolean>;

export const requestGovernmentOtp = async (
  supabase: SupabaseClient,
  emailInput: string,
  emailRedirectTo: string,
): Promise<string> => {
  const email = normalizeEmail(emailInput);

  // Always present the same result so this surface cannot enumerate invited accounts.
  await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
      shouldCreateUser: false,
    },
  });

  return email;
};

export const verifyGovernmentOtp = async (
  supabase: SupabaseClient,
  emailInput: string,
  tokenInput: string,
  recordAuditEvent: OtpAuditRecorder = recordAuthAuditEventSafely,
): Promise<void> => {
  const result = await supabase.auth.verifyOtp({
    email: normalizeEmail(emailInput),
    token: normalizeOtp(tokenInput),
    type: 'email',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.data.session?.access_token) {
    await recordAuditEvent(result.data.session.access_token, 'otp_verified');
  }
};

export const signOutGovernmentSession = async (
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

export const getGovernmentLoginError = (error: unknown): string => {
  if (
    error instanceof EmailInputError ||
    error instanceof OtpInputError ||
    error instanceof ConfigurationError
  ) {
    return error.message;
  }

  if (error instanceof Error) {
    const normalizedMessage = error.message.toLowerCase();

    if (normalizedMessage.includes('rate') || normalizedMessage.includes('too many')) {
      return 'Too many attempts. Wait a moment before trying again.';
    }

    if (normalizedMessage.includes('expired') || normalizedMessage.includes('invalid')) {
      return 'The verification code is invalid or expired.';
    }
  }

  return 'Authentication could not be completed. Please try again.';
};
