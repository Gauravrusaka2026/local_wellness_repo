import type { SupabaseClient } from '@supabase/supabase-js';
import { ConfigurationError } from '@local-wellness/config';

import { recordAuthAuditEventSafely } from '../api/auth-audit';
import {
  EmailInputError,
  normalizeEmail,
  normalizeOtp,
  normalizePassword,
  OtpInputError,
  PasswordInputError,
} from './input';

type SignOutAuditRecorder = (
  accessToken: string,
  eventType: 'sign_out_succeeded',
) => Promise<boolean>;

type OtpAuditRecorder = (accessToken: string, eventType: 'otp_verified') => Promise<boolean>;

type SignInAuditRecorder = (
  accessToken: string,
  eventType: 'sign_in_succeeded',
) => Promise<boolean>;

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

  const accessToken = result.data.session?.access_token;
  if (!accessToken) {
    throw new Error('OTP verification did not establish an authenticated session.');
  }

  await recordAuditEvent(accessToken, 'otp_verified');
};

export const signInGovernmentWithPassword = async (
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

  const accessToken = result.data.session?.access_token;
  if (!accessToken) {
    throw new Error('Authentication session was not established.');
  }

  await recordAuditEvent(accessToken, 'sign_in_succeeded');
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
    error instanceof PasswordInputError ||
    error instanceof ConfigurationError
  ) {
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
      return 'This government account has not been confirmed.';
    }

    if (normalizedMessage.includes('expired') || normalizedMessage.includes('invalid')) {
      return 'The verification code is invalid or expired.';
    }
  }

  return 'Authentication could not be completed. Please try again.';
};
