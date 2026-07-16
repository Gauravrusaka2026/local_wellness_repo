import * as Linking from 'expo-linking';

import { recordAuthAuditEventSafely } from '../api/auth-audit';
import {
  normalizeEmail,
  normalizeOtp,
  normalizePhone,
  type AuthChannel,
  type CitizenAuthMode,
} from './auth-input';
import { completeMobileAuthCallback, type MobileAuthCallbackParameters } from './callback';
import { createOtpRequest } from './otp-request';
import { signOutWithAudit } from './sign-out';
import { getSupabaseClient } from './supabase';

export { getUserFacingAuthError } from './auth-error';

export const requestOtp = async (
  channel: AuthChannel,
  identifier: string,
  mode: CitizenAuthMode,
): Promise<string> => {
  const supabase = getSupabaseClient();
  const request = createOtpRequest(channel, identifier, mode, Linking.createURL('auth/callback'));
  const { error } = await supabase.auth.signInWithOtp(request.credentials);

  if (error) {
    throw error;
  }

  return request.normalizedIdentifier;
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

export const completeAuthCallback = (parameters: MobileAuthCallbackParameters): Promise<void> =>
  completeMobileAuthCallback(getSupabaseClient(), parameters, recordAuthAuditEventSafely);

export const signOut = async (): Promise<void> => {
  const supabase = getSupabaseClient();
  await signOutWithAudit(supabase);
};
