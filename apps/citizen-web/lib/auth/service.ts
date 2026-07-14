import type { SupabaseClient } from '@supabase/supabase-js';
import { ConfigurationError } from '@local-wellness/config';

import { recordAuthAuditEventSafely } from '../api/auth-audit';
import {
  AuthInputError,
  normalizeEmail,
  normalizeOtp,
  normalizePhone,
  type AuthChannel,
} from './input';

type SignOutAuditRecorder = (
  accessToken: string,
  eventType: 'sign_out_succeeded',
) => Promise<boolean>;

export const requestCitizenOtp = async (
  supabase: SupabaseClient,
  channel: AuthChannel,
  identifier: string,
  emailRedirectTo: string,
): Promise<string> => {
  if (channel === 'phone') {
    const phone = normalizePhone(identifier);
    const { error } = await supabase.auth.signInWithOtp({ phone });

    if (error) {
      throw error;
    }

    return phone;
  }

  const email = normalizeEmail(identifier);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) {
    throw error;
  }

  return email;
};

export const verifyCitizenOtp = async (
  supabase: SupabaseClient,
  channel: AuthChannel,
  identifier: string,
  token: string,
): Promise<void> => {
  const validToken = normalizeOtp(token);
  const result =
    channel === 'phone'
      ? await supabase.auth.verifyOtp({
          phone: normalizePhone(identifier),
          token: validToken,
          type: 'sms',
        })
      : await supabase.auth.verifyOtp({
          email: normalizeEmail(identifier),
          token: validToken,
          type: 'email',
        });

  if (result.error) {
    throw result.error;
  }

  if (result.data.session?.access_token) {
    await recordAuthAuditEventSafely(result.data.session.access_token, 'otp_verified');
  }
};

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

    if (normalizedMessage.includes('expired') || normalizedMessage.includes('invalid')) {
      return 'The verification code is invalid or expired.';
    }

    return 'Authentication could not be completed. Please try again.';
  }

  return 'Authentication could not be completed. Please try again.';
};
