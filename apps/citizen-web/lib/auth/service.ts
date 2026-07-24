import { ConfigurationError } from '@local-wellness/config';
import type { ClientAuthAuditEventType } from '@local-wellness/types';
import type { SupabaseClient, User } from '@supabase/supabase-js';

import { recordAuthAuditEventSafely, recordAuthAuditEventWithin } from '../api/auth-audit';
import { createIsolatedBrowserSupabaseClient } from '../supabase/isolated-client';
import { AuthInputError, normalizeEmail, normalizeOtp, normalizePassword } from './input';
import { hasConfirmedPhoneTimestamp, normalizeStoredPhone } from './phone-verification-state';

type SignOutAuditRecorder = (
  accessToken: string,
  eventType: 'sign_out_succeeded',
) => Promise<boolean>;

type SignInAuditRecorder = (
  accessToken: string,
  eventType: 'sign_in_succeeded',
) => Promise<boolean>;

type AuthAuditRecorder = (
  accessToken: string,
  eventType: ClientAuthAuditEventType,
) => Promise<boolean>;

type IsolatedSupabaseClientFactory = () => SupabaseClient;

export type CitizenPasswordAccountCreationResult =
  | Readonly<{ status: 'authenticated' }>
  | Readonly<{ email: string; status: 'email-confirmation-required' }>;

export type CitizenPasswordRecoveryIdentity = Readonly<{
  email: string | null;
  phone: string;
  userId: string;
}>;

export type CitizenPasswordPhoneOtpRequest = Readonly<{
  phone: string;
  userId: string;
}>;

export class CitizenPasswordRecoveryPhoneRequiredError extends Error {
  public constructor() {
    super(
      'A phone number confirmed before recovery started is required. Contact project support if you no longer control that phone.',
    );
    this.name = 'CitizenPasswordRecoveryPhoneRequiredError';
  }
}

export class CitizenPasswordRecoverySecurityError extends Error {
  public constructor() {
    super('The recovery account changed unexpectedly. Sign in again before continuing.');
    this.name = 'CitizenPasswordRecoverySecurityError';
  }
}

export class CitizenPasswordSessionRevocationError extends Error {
  public constructor() {
    super(
      'The password changed, but session revocation could not be confirmed. Close this browser and contact project support before signing in again.',
    );
    this.name = 'CitizenPasswordSessionRevocationError';
  }
}

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

const signOutLocally = async (supabase: SupabaseClient): Promise<boolean> => {
  try {
    const result = await supabase.auth.signOut({ scope: 'local' });
    return result.error === null;
  } catch {
    return false;
  }
};

const getConfirmedPhoneFromUser = (
  user: Pick<User, 'id' | 'phone' | 'phone_confirmed_at'>,
): CitizenPasswordPhoneOtpRequest | null => {
  const phone = normalizeStoredPhone(user.phone);

  return phone !== null && hasConfirmedPhoneTimestamp(user.phone_confirmed_at)
    ? { phone, userId: user.id }
    : null;
};

const failClosedRecovery = async (
  persistentClient: SupabaseClient,
  isolatedClient?: SupabaseClient,
): Promise<never> => {
  await Promise.all([
    signOutLocally(persistentClient),
    ...(isolatedClient === undefined ? [] : [signOutLocally(isolatedClient)]),
  ]);
  throw new CitizenPasswordRecoverySecurityError();
};

const requireMatchingRecoveryIdentity = async (
  persistentClient: SupabaseClient,
  expected: CitizenPasswordPhoneOtpRequest,
): Promise<CitizenPasswordPhoneOtpRequest> => {
  const authoritativeResult = await persistentClient.auth.getUser();
  const authoritativeUser = authoritativeResult.data.user;
  const confirmedPhone =
    authoritativeUser === null ? null : getConfirmedPhoneFromUser(authoritativeUser);

  if (
    authoritativeResult.error ||
    authoritativeUser === null ||
    confirmedPhone === null ||
    confirmedPhone.userId !== expected.userId ||
    confirmedPhone.phone !== expected.phone
  ) {
    return failClosedRecovery(persistentClient);
  }

  return confirmedPhone;
};

export const requestCitizenPasswordPhoneOtp = async (
  persistentClient: SupabaseClient,
  identity: CitizenPasswordRecoveryIdentity,
  createIsolatedClient: IsolatedSupabaseClientFactory = createIsolatedBrowserSupabaseClient,
): Promise<CitizenPasswordPhoneOtpRequest> => {
  const request = await requireMatchingRecoveryIdentity(persistentClient, identity);
  const isolatedClient = createIsolatedClient();
  const result = await isolatedClient.auth.signInWithOtp({
    phone: request.phone,
    options: { shouldCreateUser: false },
  });

  if (result.error) {
    throw result.error;
  }

  return request;
};

export const updateCitizenPasswordWithPhoneOtp = async (
  persistentClient: SupabaseClient,
  passwordInput: string,
  codeInput: string,
  request: CitizenPasswordPhoneOtpRequest,
  createIsolatedClient: IsolatedSupabaseClientFactory = createIsolatedBrowserSupabaseClient,
  recordOtpVerified: AuthAuditRecorder = recordAuthAuditEventSafely,
  recordPasswordChanged: AuthAuditRecorder = recordAuthAuditEventSafely,
): Promise<void> => {
  const password = normalizePassword(passwordInput);
  const token = normalizeOtp(codeInput);
  await requireMatchingRecoveryIdentity(persistentClient, request);

  const isolatedClient = createIsolatedClient();
  let sessionsCleared = false;
  const failClosedAfterOtp = (): Promise<never> => {
    sessionsCleared = true;
    return failClosedRecovery(persistentClient, isolatedClient);
  };

  try {
    const verification = await isolatedClient.auth.verifyOtp({
      phone: request.phone,
      token,
      type: 'sms',
    });

    if (verification.error) {
      throw verification.error;
    }

    const verificationUser = verification.data.user;
    const verificationSession = verification.data.session;
    const verifiedPhone =
      verificationUser === null ? null : getConfirmedPhoneFromUser(verificationUser);

    if (
      verificationUser === null ||
      verificationSession === null ||
      verifiedPhone === null ||
      verifiedPhone.userId !== request.userId ||
      verifiedPhone.phone !== request.phone
    ) {
      return failClosedAfterOtp();
    }

    const isolatedUserResult = await isolatedClient.auth.getUser();
    const isolatedUser = isolatedUserResult.data.user;
    const authoritativePhone =
      isolatedUser === null ? null : getConfirmedPhoneFromUser(isolatedUser);

    if (
      isolatedUserResult.error ||
      isolatedUser === null ||
      authoritativePhone === null ||
      authoritativePhone.userId !== request.userId ||
      authoritativePhone.phone !== request.phone
    ) {
      return failClosedAfterOtp();
    }

    await recordAuthAuditEventWithin(
      verificationSession.access_token,
      'otp_verified',
      recordOtpVerified,
    );

    const updateResult = await isolatedClient.auth.updateUser({ password });
    if (updateResult.error) {
      throw updateResult.error;
    }

    if (updateResult.data.user.id !== request.userId) {
      return failClosedAfterOtp();
    }

    await recordAuthAuditEventWithin(
      verificationSession.access_token,
      'password_changed',
      recordPasswordChanged,
    );

    const globalSignOutSucceeded = await Promise.resolve()
      .then(() => isolatedClient.auth.signOut({ scope: 'global' }))
      .then((result) => result.error === null)
      .catch(() => false);
    if (!globalSignOutSucceeded) {
      await signOutLocally(isolatedClient);
    }

    const localSignOutSucceeded = await signOutLocally(persistentClient);
    sessionsCleared = true;

    if (!globalSignOutSucceeded || !localSignOutSucceeded) {
      throw new CitizenPasswordSessionRevocationError();
    }
  } finally {
    if (!sessionsCleared) {
      await signOutLocally(isolatedClient);
    }
  }
};

export const establishCitizenPasswordRecoverySession = async (
  supabase: SupabaseClient,
  callbackUrl: string,
): Promise<CitizenPasswordRecoveryIdentity> => {
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

  const sessionUser = result.data.session.user;
  const authoritativeResult = await supabase.auth.getUser();
  const authoritativeUser = authoritativeResult.data.user;

  if (
    authoritativeResult.error ||
    authoritativeUser === null ||
    authoritativeUser.id !== sessionUser.id ||
    (result.data.user !== null &&
      result.data.user !== undefined &&
      result.data.user.id !== sessionUser.id)
  ) {
    return failClosedRecovery(supabase);
  }

  const confirmedPhone = getConfirmedPhoneFromUser(authoritativeUser);
  if (confirmedPhone === null) {
    await signOutLocally(supabase);
    throw new CitizenPasswordRecoveryPhoneRequiredError();
  }

  return {
    email: authoritativeUser.email ?? sessionUser.email ?? null,
    ...confirmedPhone,
  };
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

  if (
    error instanceof CitizenPasswordRecoveryPhoneRequiredError ||
    error instanceof CitizenPasswordRecoverySecurityError ||
    error instanceof CitizenPasswordSessionRevocationError
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
      normalizedMessage.includes('phone provider') ||
      normalizedMessage.includes('phone verification') ||
      normalizedMessage.includes('phone_change') ||
      normalizedMessage.includes('sms')
    ) {
      return 'Phone verification is unavailable. Ask the administrator to check Supabase phone authentication and the SMS provider.';
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
