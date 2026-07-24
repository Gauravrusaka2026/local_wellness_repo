import type { Session, SupabaseClient } from '@supabase/supabase-js';

import { recordAuthAuditEventSafely } from '../api/auth-audit';
import { normalizeEmail, normalizeOtp, normalizePassword } from './auth-input';
import {
  getConfirmedPhone,
  getConfirmedPhoneFromUser,
  PhoneVerificationSecurityError,
} from './phone-verification';
import { createIsolatedSupabaseClient } from './isolated-supabase';

type PasswordAuthAuditRecorder = (
  accessToken: string,
  eventType: 'sign_in_succeeded',
) => Promise<boolean>;

type PasswordChangedAuditRecorder = (
  accessToken: string,
  eventType: 'password_changed',
) => Promise<boolean>;

type PhoneOtpAuditRecorder = (accessToken: string, eventType: 'otp_verified') => Promise<boolean>;

type IsolatedSupabaseClientFactory = () => SupabaseClient;

export type PasswordSignUpResult =
  | Readonly<{ status: 'email-confirmation-required' }>
  | Readonly<{ session: Session; status: 'signed-in' }>;

export type PasswordRecoveryParameters = Readonly<{
  code?: string | string[];
  error?: string | string[];
  errorCode?: string | string[];
  errorDescription?: string | string[];
  tokenHash?: string | string[];
  type?: string | string[];
}>;

export type PasswordPhoneOtpRequest = Readonly<{
  phone: string;
  userId: string;
}>;

export type PasswordUpdateResult =
  | Readonly<{ status: 'globally-signed-out' }>
  | Readonly<{ status: 'locally-signed-out-global-revocation-failed' }>;

export const PASSWORD_CHANGED_AUDIT_TIMEOUT_MS = 2_000;

const invalidRecovery = (): Error => new Error('The password recovery link is invalid.');

const readSingleParameter = (value: string | string[] | undefined): string | null => {
  if (value === undefined) return null;
  if (
    Array.isArray(value) ||
    value.length === 0 ||
    value.length > 16_384 ||
    value.trim() !== value
  ) {
    throw invalidRecovery();
  }
  return value;
};

export const signInWithPassword = async (
  supabase: SupabaseClient,
  emailValue: string,
  passwordValue: string,
  recordAuditEvent: PasswordAuthAuditRecorder = recordAuthAuditEventSafely,
): Promise<Session> => {
  const email = normalizeEmail(emailValue);
  const password = normalizePassword(passwordValue);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw error;
  if (data.session === null) throw new Error('Authentication session was not established.');

  await recordAuditEvent(data.session.access_token, 'sign_in_succeeded');
  return data.session;
};

export const createPasswordAccount = async (
  supabase: SupabaseClient,
  emailValue: string,
  passwordValue: string,
  recordAuditEvent: PasswordAuthAuditRecorder = recordAuthAuditEventSafely,
): Promise<PasswordSignUpResult> => {
  const email = normalizeEmail(emailValue);
  const password = normalizePassword(passwordValue);
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) throw error;
  if (data.session === null) return { status: 'email-confirmation-required' };

  await recordAuditEvent(data.session.access_token, 'sign_in_succeeded');
  return { session: data.session, status: 'signed-in' };
};

export const requestPasswordRecovery = async (
  supabase: SupabaseClient,
  emailValue: string,
  redirectTo: string,
): Promise<string> => {
  const email = normalizeEmail(emailValue);
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
  return email;
};

export const exchangePasswordRecoveryCode = async (
  supabase: SupabaseClient,
  code: string,
): Promise<Session> => {
  const normalizedCode = code.trim();
  if (normalizedCode.length === 0) throw new Error('The password recovery link is invalid.');

  const { data, error } = await supabase.auth.exchangeCodeForSession(normalizedCode);
  if (error) throw error;
  if (data.session === null) throw new Error('Password recovery session was not established.');
  return data.session;
};

export const establishPasswordRecoverySession = async (
  supabase: SupabaseClient,
  parameters: PasswordRecoveryParameters,
): Promise<Session> => {
  const error = readSingleParameter(parameters.error);
  const errorCode = readSingleParameter(parameters.errorCode);
  const errorDescription = readSingleParameter(parameters.errorDescription);
  const code = readSingleParameter(parameters.code);
  const tokenHash = readSingleParameter(parameters.tokenHash);
  const type = readSingleParameter(parameters.type);

  if (
    error !== null ||
    errorCode !== null ||
    errorDescription !== null ||
    Number(code !== null) + Number(tokenHash !== null) !== 1
  ) {
    throw invalidRecovery();
  }

  const result =
    code !== null
      ? await supabase.auth.exchangeCodeForSession(code)
      : tokenHash !== null && type === 'recovery'
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
        : null;

  if (result === null || result.error || result.data.session === null) {
    throw result?.error ?? invalidRecovery();
  }
  return result.data.session;
};

const requireMatchingConfirmedPhone = async (
  supabase: SupabaseClient,
  expectedUserId: string,
  expectedPhone?: string,
): Promise<PasswordPhoneOtpRequest> => {
  const confirmedPhone = await getConfirmedPhone(supabase);
  if (
    confirmedPhone === null ||
    confirmedPhone.userId !== expectedUserId ||
    (expectedPhone !== undefined && confirmedPhone.phone !== expectedPhone)
  ) {
    throw new Error(
      'A previously verified phone number is required before changing the password. Contact support if you no longer control that phone.',
    );
  }

  return confirmedPhone;
};

const signOutLocally = async (supabase: SupabaseClient): Promise<void> => {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Callers still fail closed with a fixed, non-sensitive error.
  }
};

const failClosedIdentityMismatch = async (
  persistentClient: SupabaseClient,
  isolatedClient: SupabaseClient,
): Promise<never> => {
  await Promise.all([signOutLocally(isolatedClient), signOutLocally(persistentClient)]);
  throw new PhoneVerificationSecurityError();
};

export const requestPasswordPhoneOtp = async (
  persistentClient: SupabaseClient,
  expectedUserId: string,
  createIsolatedClient: IsolatedSupabaseClientFactory = createIsolatedSupabaseClient,
): Promise<PasswordPhoneOtpRequest> => {
  const confirmedPhone = await requireMatchingConfirmedPhone(persistentClient, expectedUserId);
  const isolatedClient = createIsolatedClient();
  const { error } = await isolatedClient.auth.signInWithOtp({
    phone: confirmedPhone.phone,
    options: { shouldCreateUser: false },
  });
  if (error) throw error;
  return confirmedPhone;
};

export const recordPasswordChangedAuditWithin = async (
  recordAuditEvent: PasswordChangedAuditRecorder,
  accessToken: string,
  timeoutMs = PASSWORD_CHANGED_AUDIT_TIMEOUT_MS,
): Promise<boolean> => {
  const boundedTimeoutMs =
    Number.isFinite(timeoutMs) && timeoutMs >= 0 ? timeoutMs : PASSWORD_CHANGED_AUDIT_TIMEOUT_MS;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const delivery = Promise.resolve()
    .then(() => recordAuditEvent(accessToken, 'password_changed'))
    .catch(() => false);
  const deadline = new Promise<false>((resolve) => {
    timeoutHandle = setTimeout(() => resolve(false), boundedTimeoutMs);
  });
  const delivered = await Promise.race([delivery, deadline]);
  if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
  return delivered;
};

const revokePasswordSessions = async (
  persistentClient: SupabaseClient,
  isolatedClient: SupabaseClient,
): Promise<PasswordUpdateResult> => {
  const globalRevocationSucceeded = await Promise.resolve()
    .then(() => isolatedClient.auth.signOut({ scope: 'global' }))
    .then((result) => result.error === null)
    .catch(() => false);

  if (!globalRevocationSucceeded) {
    await signOutLocally(isolatedClient);
  }

  const localSignOut = await persistentClient.auth.signOut({ scope: 'local' });
  if (localSignOut.error) {
    throw new Error(
      'The password changed, but this device could not clear its session. Close the app and sign out before continuing.',
    );
  }

  return globalRevocationSucceeded
    ? { status: 'globally-signed-out' }
    : { status: 'locally-signed-out-global-revocation-failed' };
};

export const updatePasswordWithPhoneOtp = async (
  persistentClient: SupabaseClient,
  passwordValue: string,
  otpValue: string,
  request: PasswordPhoneOtpRequest,
  createIsolatedClient: IsolatedSupabaseClientFactory = createIsolatedSupabaseClient,
  recordPasswordChanged: PasswordChangedAuditRecorder = recordAuthAuditEventSafely,
  recordOtpVerified: PhoneOtpAuditRecorder = recordAuthAuditEventSafely,
): Promise<PasswordUpdateResult> => {
  const password = normalizePassword(passwordValue);
  const token = normalizeOtp(otpValue);
  await requireMatchingConfirmedPhone(persistentClient, request.userId, request.phone);

  const isolatedClient = createIsolatedClient();
  let sessionsCleared = false;

  try {
    const verification = await isolatedClient.auth.verifyOtp({
      phone: request.phone,
      token,
      type: 'sms',
    });
    if (verification.error) throw verification.error;

    const verificationUser = verification.data.user;
    const verificationSession = verification.data.session;
    const verificationPhone =
      verificationUser === null ? null : getConfirmedPhoneFromUser(verificationUser);
    if (
      verificationUser === null ||
      verificationSession === null ||
      verificationUser.id !== request.userId ||
      verificationPhone?.phone !== request.phone
    ) {
      return failClosedIdentityMismatch(persistentClient, isolatedClient);
    }

    const isolatedUser = await isolatedClient.auth.getUser();
    const isolatedPhone =
      isolatedUser.data.user === null ? null : getConfirmedPhoneFromUser(isolatedUser.data.user);
    if (
      isolatedUser.error ||
      isolatedUser.data.user === null ||
      isolatedUser.data.user.id !== request.userId ||
      isolatedPhone?.phone !== request.phone
    ) {
      return failClosedIdentityMismatch(persistentClient, isolatedClient);
    }

    void Promise.resolve()
      .then(() => recordOtpVerified(verificationSession.access_token, 'otp_verified'))
      .catch(() => false);

    const update = await isolatedClient.auth.updateUser({ password });
    if (update.error) throw update.error;
    if (update.data.user.id !== request.userId) {
      return failClosedIdentityMismatch(persistentClient, isolatedClient);
    }

    await recordPasswordChangedAuditWithin(recordPasswordChanged, verificationSession.access_token);
    const result = await revokePasswordSessions(persistentClient, isolatedClient);
    sessionsCleared = true;
    return result;
  } finally {
    if (!sessionsCleared) {
      await signOutLocally(isolatedClient);
    }
  }
};
