import * as Linking from 'expo-linking';
import { ConfigurationError } from '@local-wellness/config';

import { recordAuthAuditEventSafely } from '../api/auth-audit';
import {
  AuthInputError,
  normalizeEmail,
  normalizeOtp,
  normalizePhone,
  type AuthChannel,
} from './auth-input';
import { resolveMobileAuthCallback, type MobileAuthCallbackParameters } from './callback';
import { signOutWithAudit } from './sign-out';
import { getSupabaseClient } from './supabase';

export const requestOtp = async (channel: AuthChannel, identifier: string): Promise<string> => {
  const supabase = getSupabaseClient();

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
      emailRedirectTo: Linking.createURL('auth/callback'),
      shouldCreateUser: true,
    },
  });

  if (error) {
    throw error;
  }

  return email;
};

export const verifyOtp = async (
  channel: AuthChannel,
  identifier: string,
  token: string,
): Promise<void> => {
  const supabase = getSupabaseClient();
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

export const completeAuthCallback = async (
  parameters: MobileAuthCallbackParameters,
): Promise<void> => {
  const supabase = getSupabaseClient();
  const callback = resolveMobileAuthCallback(parameters);

  if (callback.type === 'pkce') {
    const { data, error } = await supabase.auth.exchangeCodeForSession(callback.code);

    if (error) {
      throw error;
    }

    if (data.session?.access_token) {
      await recordAuthAuditEventSafely(data.session.access_token, 'sign_in_succeeded');
    }

    return;
  }

  if (callback.type === 'email_otp') {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: callback.tokenHash,
      type: 'email',
    });

    if (error) {
      throw error;
    }

    if (data.session?.access_token) {
      await recordAuthAuditEventSafely(data.session.access_token, 'sign_in_succeeded');
    }

    return;
  }
};

export const signOut = async (): Promise<void> => {
  const supabase = getSupabaseClient();
  await signOutWithAudit(supabase);
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
