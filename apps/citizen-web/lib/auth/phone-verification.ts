import type { SupabaseClient, User } from '@supabase/supabase-js';

import { recordAuthAuditEventSafely, recordAuthAuditEventWithin } from '../api/auth-audit';
import type { CitizenPhoneVerificationMode } from '../environment';
import { normalizeOtp, normalizePhone } from './input';
import { hasConfirmedPhoneTimestamp, normalizeStoredPhone } from './phone-verification-state';
import { getSafeReturnPath } from './return-path';

type OtpAuditRecorder = (accessToken: string, eventType: 'otp_verified') => Promise<boolean>;

export type CitizenPhoneVerificationState =
  | Readonly<{ phone: string; status: 'verified'; userId: string }>
  | Readonly<{ phone: string; status: 'verification-required'; userId: string }>
  | Readonly<{ status: 'phone-required'; userId: string }>;

export type CitizenPhoneVerificationAttempt = Readonly<{
  phone: string;
  userId: string;
}>;

const getAuthoritativeUser = async (supabase: SupabaseClient): Promise<User> => {
  const result = await supabase.auth.getUser();

  if (result.error || !result.data.user) {
    throw result.error ?? new Error('A signed-in citizen account is required.');
  }

  return result.data.user;
};

const failClosed = async (supabase: SupabaseClient, message: string): Promise<never> => {
  const signOutResult = await supabase.auth.signOut();

  if (signOutResult.error) {
    throw new Error(`${message} Sign out manually before trying again.`);
  }

  throw new Error(message);
};

const requireSameUser = async (
  supabase: SupabaseClient,
  actualUserId: string,
  expectedUserId: string,
): Promise<void> => {
  if (actualUserId !== expectedUserId) {
    await failClosed(
      supabase,
      'Phone verification changed accounts. Sign in again before continuing.',
    );
  }
};

const getUserOrFailClosed = async (supabase: SupabaseClient, message: string): Promise<User> => {
  try {
    return await getAuthoritativeUser(supabase);
  } catch {
    return failClosed(supabase, message);
  }
};

const userContainsPhone = (user: Pick<User, 'new_phone' | 'phone'>, phone: string): boolean =>
  [user.new_phone, user.phone].some((candidate) => normalizeStoredPhone(candidate) === phone);

export const getCitizenPhoneVerificationState = async (
  supabase: SupabaseClient,
): Promise<CitizenPhoneVerificationState> => {
  const user = await getAuthoritativeUser(supabase);
  const confirmedPhone = normalizeStoredPhone(user.phone);

  if (confirmedPhone !== null && hasConfirmedPhoneTimestamp(user.phone_confirmed_at)) {
    return { phone: confirmedPhone, status: 'verified', userId: user.id };
  }

  const pendingPhone = normalizeStoredPhone(user.new_phone) ?? confirmedPhone;

  return pendingPhone === null
    ? { status: 'phone-required', userId: user.id }
    : { phone: pendingPhone, status: 'verification-required', userId: user.id };
};

export const beginCitizenPhoneVerification = async (
  supabase: SupabaseClient,
  phoneInput: string,
): Promise<CitizenPhoneVerificationAttempt> => {
  const phone = normalizePhone(phoneInput);
  const initiatingUser = await getAuthoritativeUser(supabase);
  const updateResult = await supabase.auth.updateUser({ phone });

  if (updateResult.error || !updateResult.data.user) {
    throw updateResult.error ?? new Error('Phone verification could not be started.');
  }

  await requireSameUser(supabase, updateResult.data.user.id, initiatingUser.id);

  const authoritativeUser = await getUserOrFailClosed(
    supabase,
    'Phone verification could not confirm the active account. Sign in again.',
  );

  await requireSameUser(supabase, authoritativeUser.id, initiatingUser.id);

  if (
    !userContainsPhone(updateResult.data.user, phone) &&
    !userContainsPhone(authoritativeUser, phone)
  ) {
    await failClosed(
      supabase,
      'Phone verification could not confirm the requested number. Sign in again.',
    );
  }

  return { phone, userId: initiatingUser.id };
};

export const resendCitizenPhoneVerificationCode = async (
  supabase: SupabaseClient,
  initiatingUserId: string,
  phoneInput: string,
): Promise<void> => {
  const phone = normalizePhone(phoneInput);
  const userBeforeResend = await getAuthoritativeUser(supabase);
  await requireSameUser(supabase, userBeforeResend.id, initiatingUserId);

  if (!userContainsPhone(userBeforeResend, phone)) {
    await failClosed(
      supabase,
      'The phone awaiting verification changed. Sign in again before continuing.',
    );
  }

  const resendResult = await supabase.auth.resend({ phone, type: 'phone_change' });
  if (resendResult.error) {
    throw resendResult.error;
  }

  const userAfterResend = await getUserOrFailClosed(
    supabase,
    'Phone verification could not confirm the active account. Sign in again.',
  );

  await requireSameUser(supabase, userAfterResend.id, initiatingUserId);
};

export const verifyCitizenPhoneVerification = async (
  supabase: SupabaseClient,
  initiatingUserId: string,
  phoneInput: string,
  codeInput: string,
  recordAuditEvent: OtpAuditRecorder = recordAuthAuditEventSafely,
): Promise<void> => {
  const phone = normalizePhone(phoneInput);
  const userBeforeVerification = await getAuthoritativeUser(supabase);
  await requireSameUser(supabase, userBeforeVerification.id, initiatingUserId);

  if (!userContainsPhone(userBeforeVerification, phone)) {
    await failClosed(
      supabase,
      'The phone awaiting verification changed. Sign in again before continuing.',
    );
  }

  const verificationResult = await supabase.auth.verifyOtp({
    phone,
    token: normalizeOtp(codeInput),
    type: 'phone_change',
  });

  if (verificationResult.error) {
    throw verificationResult.error;
  }

  if (verificationResult.data.user && verificationResult.data.user.id !== initiatingUserId) {
    await failClosed(
      supabase,
      'Phone verification changed accounts. Sign in again before continuing.',
    );
  }

  const authoritativeUser = await getUserOrFailClosed(
    supabase,
    'Phone verification could not confirm the active account. Sign in again.',
  );

  if (
    authoritativeUser.id !== initiatingUserId ||
    normalizeStoredPhone(authoritativeUser.phone) !== phone ||
    !hasConfirmedPhoneTimestamp(authoritativeUser.phone_confirmed_at)
  ) {
    await failClosed(
      supabase,
      'Phone verification could not be confirmed. Sign in again before continuing.',
    );
  }

  const accessToken =
    verificationResult.data.session?.access_token ??
    (await supabase.auth.getSession()).data.session?.access_token;

  if (accessToken) {
    void recordAuthAuditEventWithin(accessToken, 'otp_verified', (token) =>
      recordAuditEvent(token, 'otp_verified'),
    );
  }
};

export const buildCitizenPhoneVerificationPath = (returnPath: string): string => {
  const parameters = new URLSearchParams({ next: getSafeReturnPath(returnPath, '/account') });
  return `/auth/verify-phone?${parameters.toString()}`;
};

export const getCitizenPostPasswordDestination = (
  mode: CitizenPhoneVerificationMode,
  returnPath: string,
): string => {
  const safeReturnPath = getSafeReturnPath(returnPath, '/account');
  return mode === 'enforce' ? buildCitizenPhoneVerificationPath(safeReturnPath) : safeReturnPath;
};
