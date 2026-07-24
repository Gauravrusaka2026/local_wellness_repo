import type { SupabaseClient, User } from '@supabase/supabase-js';

import { recordAuthAuditEventSafely } from '../api/auth-audit';
import { AuthInputError, normalizeOtp, normalizePhone } from './auth-input';

export type ConfirmedPhone = Readonly<{
  phone: string;
  userId: string;
}>;

export type PendingPhoneVerification = Readonly<{
  phone: string;
  requestedAt: number;
  userId: string;
}>;

export type PhoneUpdateAssurance =
  | Readonly<{ status: 'ready' }>
  | Readonly<{
      factorId: string;
      factorLabel: string | null;
      status: 'authenticator-required';
    }>;

type PhoneVerificationAuditRecorder = (
  accessToken: string,
  eventType: 'otp_verified',
) => Promise<boolean>;

export class PhoneVerificationSecurityError extends Error {
  public constructor() {
    super(
      'Phone verification could not be bound to this account. The session was signed out for safety. Sign in and try again, or contact support.',
    );
    this.name = 'PhoneVerificationSecurityError';
  }
}

export class PhoneConfirmationConfigurationError extends Error {
  public constructor() {
    super(
      'Supabase confirmed the phone without an OTP. Ask the project administrator to enable phone confirmations before trying again.',
    );
    this.name = 'PhoneConfirmationConfigurationError';
  }
}

export class PhoneUpdateAuthenticatorUnavailableError extends Error {
  public constructor() {
    super(
      'This account has an existing security factor that must be verified before its phone can change. Use the linked authenticator or contact support.',
    );
    this.name = 'PhoneUpdateAuthenticatorUnavailableError';
  }
}

const getAuthErrorCode = (error: unknown): string => {
  if (typeof error !== 'object' || error === null || !('code' in error)) return '';
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code.toLowerCase() : '';
};

export const normalizeProviderPhone = (value: string): string => {
  const canonicalValue = value.trim();
  const e164Value = /^\d{8,15}$/u.test(canonicalValue) ? `+${canonicalValue}` : canonicalValue;
  return normalizePhone(e164Value);
};

export const getUserFacingPhoneVerificationError = (error: unknown): string => {
  if (
    error instanceof AuthInputError ||
    error instanceof PhoneVerificationSecurityError ||
    error instanceof PhoneConfirmationConfigurationError ||
    error instanceof PhoneUpdateAuthenticatorUnavailableError
  ) {
    return error.message;
  }

  const code = getAuthErrorCode(error);
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (code === 'over_sms_send_rate_limit' || code === 'over_request_rate_limit') {
    return 'Too many SMS attempts. Wait before requesting or checking another code.';
  }
  if (code === 'otp_expired') {
    return 'That code has expired. Request a new SMS code and try again.';
  }
  if (code === 'insufficient_aal') {
    return 'This account already has an authenticator. Enter its 6-digit code before requesting the phone SMS.';
  }
  if (
    code === 'mfa_challenge_expired' ||
    code === 'mfa_verification_failed' ||
    code === 'mfa_verification_rejected'
  ) {
    return 'That authenticator code is incorrect or expired. Enter the newest 6-digit code.';
  }
  if (code === 'mfa_factor_not_found') {
    return 'The existing authenticator is no longer available. Sign out and sign in again, or contact support.';
  }
  if (code === 'otp_disabled' || code === 'sms_provider_disabled' || code === 'sms_send_failed') {
    return 'Supabase could not send the SMS. Ask the project administrator to check the Phone provider and Twilio Verify configuration.';
  }
  if (
    code === 'phone_exists' ||
    code === 'user_already_exists' ||
    code === 'identity_already_exists'
  ) {
    return 'That phone number is already linked to another account.';
  }
  if (code === 'user_not_found' || code === 'signup_disabled') {
    return 'That verified phone is not available for this account. Sign in again or contact support.';
  }
  if (message.includes('rate') || message.includes('too many')) {
    return 'Too many SMS attempts. Wait before requesting or checking another code.';
  }
  if (message.includes('expired')) {
    return 'That code has expired. Request a new SMS code and try again.';
  }
  if (message.includes('aal2') || message.includes('insufficient aal')) {
    return 'This account already has an authenticator. Enter its 6-digit code before requesting the phone SMS.';
  }
  if (
    message.includes('invalid') ||
    message.includes('incorrect') ||
    message.includes('token has expired')
  ) {
    return 'That code is incorrect or expired. Check the newest SMS and try again.';
  }
  if (
    message.includes('phone') &&
    (message.includes('exists') || message.includes('registered') || message.includes('linked'))
  ) {
    return 'That phone number is already linked to another account.';
  }
  if (
    message.includes('sms') ||
    message.includes('twilio') ||
    message.includes('provider') ||
    message.includes('disabled')
  ) {
    return 'Supabase could not send the SMS. Ask the project administrator to check the Phone provider and Twilio Verify configuration.';
  }

  return 'Phone verification could not be completed. Check the number or code and try again.';
};

export const getConfirmedPhoneFromUser = (user: User): ConfirmedPhone | null => {
  if (!user.phone || !user.phone_confirmed_at) return null;

  try {
    return {
      phone: normalizeProviderPhone(user.phone),
      userId: user.id,
    };
  } catch {
    return null;
  }
};

const getCurrentUser = async (supabase: SupabaseClient): Promise<User> => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (data.user === null) throw new Error('The phone-verification session has expired.');
  return data.user;
};

const signOutLocallySafely = async (supabase: SupabaseClient): Promise<void> => {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // The fixed security error remains safe even when provider cleanup also fails.
  }
};

const failClosed = async (supabase: SupabaseClient): Promise<never> => {
  await signOutLocallySafely(supabase);
  throw new PhoneVerificationSecurityError();
};

const requireExpectedUser = async (
  supabase: SupabaseClient,
  expectedUserId: string,
): Promise<User> => {
  const user = await getCurrentUser(supabase);
  if (user.id !== expectedUserId) return failClosed(supabase);
  return user;
};

const normalizedOptionalPhone = (value: string | undefined): string | null => {
  if (!value) return null;
  try {
    return normalizeProviderPhone(value);
  } catch {
    return null;
  }
};

export const getConfirmedPhone = async (supabase: SupabaseClient): Promise<ConfirmedPhone | null> =>
  getConfirmedPhoneFromUser(await getCurrentUser(supabase));

export const shouldInspectPhoneVerificationForUser = (
  inspectedUserId: string | null,
  activeUserId: string,
): boolean => inspectedUserId !== activeUserId;

export const normalizeAuthenticatorCode = (value: string): string => {
  const code = value.replaceAll(/\s/gu, '');
  if (!/^\d{6}$/u.test(code)) {
    throw new AuthInputError('Enter the 6-digit code from your authenticator app.');
  }
  return code;
};

export const getPhoneUpdateAssurance = async (
  supabase: SupabaseClient,
  expectedUserId: string,
): Promise<PhoneUpdateAssurance> => {
  await requireExpectedUser(supabase, expectedUserId);

  const assuranceResult = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceResult.error) throw assuranceResult.error;
  if (assuranceResult.data?.currentLevel === 'aal2') return { status: 'ready' };
  if (assuranceResult.data?.nextLevel !== 'aal2') return { status: 'ready' };

  const factorsResult = await supabase.auth.mfa.listFactors();
  if (factorsResult.error) throw factorsResult.error;

  const factor = [...(factorsResult.data?.totp ?? [])]
    .filter((candidate) => candidate.status === 'verified' && candidate.id.length > 0)
    .sort(
      (left, right) =>
        left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id),
    )[0];
  if (!factor) throw new PhoneUpdateAuthenticatorUnavailableError();

  const factorLabel = factor.friendly_name?.trim();
  return {
    factorId: factor.id,
    factorLabel: factorLabel ? factorLabel : null,
    status: 'authenticator-required',
  };
};

export const verifyPhoneUpdateAuthenticator = async (
  supabase: SupabaseClient,
  expectedUserId: string,
  factorId: string,
  codeValue: string,
): Promise<void> => {
  const code = normalizeAuthenticatorCode(codeValue);
  await requireExpectedUser(supabase, expectedUserId);

  const verification = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (verification.error) throw verification.error;
  if (!verification.data?.access_token) return failClosed(supabase);

  const assuranceResult = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceResult.error) throw assuranceResult.error;
  if (assuranceResult.data?.currentLevel !== 'aal2') return failClosed(supabase);

  await requireExpectedUser(supabase, expectedUserId);
};

export const requestPhoneVerification = async (
  supabase: SupabaseClient,
  expectedUserId: string,
  phoneValue: string,
  requestedAt = Date.now(),
): Promise<PendingPhoneVerification> => {
  const phone = normalizePhone(phoneValue);
  await requireExpectedUser(supabase, expectedUserId);

  const { data, error } = await supabase.auth.updateUser({ phone });
  if (error) throw error;
  if (data.user.id !== expectedUserId) return failClosed(supabase);

  const confirmedPhone = getConfirmedPhoneFromUser(data.user);
  if (confirmedPhone?.phone === phone) {
    await signOutLocallySafely(supabase);
    throw new PhoneConfirmationConfigurationError();
  }

  const rawPendingPhone = data.user.new_phone;
  const pendingPhone = normalizedOptionalPhone(rawPendingPhone);
  if (rawPendingPhone && pendingPhone === null) return failClosed(supabase);
  if (pendingPhone !== null && pendingPhone !== phone) return failClosed(supabase);

  return { phone, requestedAt, userId: expectedUserId };
};

export const resendPhoneVerification = async (
  supabase: SupabaseClient,
  pending: PendingPhoneVerification,
  requestedAt = Date.now(),
): Promise<PendingPhoneVerification> => {
  await requireExpectedUser(supabase, pending.userId);
  const { error } = await supabase.auth.resend({
    phone: pending.phone,
    type: 'phone_change',
  });
  if (error) throw error;
  return { ...pending, requestedAt };
};

export const verifyPhoneVerification = async (
  supabase: SupabaseClient,
  pending: PendingPhoneVerification,
  otpValue: string,
  recordAuditEvent: PhoneVerificationAuditRecorder = recordAuthAuditEventSafely,
): Promise<ConfirmedPhone> => {
  const token = normalizeOtp(otpValue);
  await requireExpectedUser(supabase, pending.userId);

  const verification = await supabase.auth.verifyOtp({
    phone: pending.phone,
    token,
    type: 'phone_change',
  });
  if (verification.error) throw verification.error;

  const verifiedUser = verification.data.user;
  const verifiedPhone = verifiedUser === null ? null : getConfirmedPhoneFromUser(verifiedUser);
  if (
    verifiedUser === null ||
    verifiedUser.id !== pending.userId ||
    verifiedPhone?.phone !== pending.phone
  ) {
    return failClosed(supabase);
  }

  const authoritativeUser = await getCurrentUser(supabase);
  const authoritativePhone = getConfirmedPhoneFromUser(authoritativeUser);
  if (authoritativeUser.id !== pending.userId || authoritativePhone?.phone !== pending.phone) {
    return failClosed(supabase);
  }

  const accessToken =
    verification.data.session?.access_token ??
    (await supabase.auth.getSession()).data.session?.access_token;
  if (accessToken) {
    void Promise.resolve()
      .then(() => recordAuditEvent(accessToken, 'otp_verified'))
      .catch(() => false);
  }

  return authoritativePhone;
};
