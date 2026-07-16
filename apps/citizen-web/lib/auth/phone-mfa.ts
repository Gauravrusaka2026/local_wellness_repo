import type { Factor, SupabaseClient } from '@supabase/supabase-js';

import { recordAuthAuditEventSafely } from '../api/auth-audit';
import { normalizeOtp, normalizePhone } from './input';
import { getSafeReturnPath } from './return-path';
import type { CitizenPhoneMfaMode } from '../environment';

const CITIZEN_PHONE_FACTOR_NAME = 'Local Wellness citizen phone';

type OtpAuditRecorder = (accessToken: string, eventType: 'otp_verified') => Promise<boolean>;

export type CitizenPhoneMfaState =
  | Readonly<{ status: 'verified' }>
  | Readonly<{
      factorId: string;
      factorStatus: 'unverified' | 'verified';
      status: 'challenge-required';
    }>
  | Readonly<{ status: 'enrollment-required' }>;

const sortFactorsNewestFirst = (factors: readonly Factor[]): Factor[] =>
  [...factors].sort(
    (left, right) =>
      right.created_at.localeCompare(left.created_at) || right.id.localeCompare(left.id),
  );

const requireIdentifier = (identifier: unknown, message: string): string => {
  if (typeof identifier !== 'string' || identifier.length === 0) {
    throw new Error(message);
  }

  return identifier;
};

export const getCitizenPhoneMfaState = async (
  supabase: SupabaseClient,
): Promise<CitizenPhoneMfaState> => {
  const factorsResult = await supabase.auth.mfa.listFactors();
  if (factorsResult.error || !factorsResult.data) {
    throw factorsResult.error ?? new Error('Phone verification factors are unavailable.');
  }

  const phoneFactors = sortFactorsNewestFirst(
    factorsResult.data.all.filter((factor) => factor.factor_type === 'phone'),
  );
  const verifiedFactor = phoneFactors.find((factor) => factor.status === 'verified');

  if (verifiedFactor) {
    const assuranceResult = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceResult.error) {
      throw assuranceResult.error;
    }

    if (assuranceResult.data?.currentLevel === 'aal2') {
      return { status: 'verified' };
    }

    return {
      factorId: requireIdentifier(verifiedFactor.id, 'Phone verification factor is unavailable.'),
      factorStatus: 'verified',
      status: 'challenge-required',
    };
  }

  const unverifiedFactor = phoneFactors.find((factor) => factor.status === 'unverified');
  return unverifiedFactor
    ? {
        factorId: requireIdentifier(
          unverifiedFactor.id,
          'Phone verification factor is unavailable.',
        ),
        factorStatus: 'unverified',
        status: 'challenge-required',
      }
    : { status: 'enrollment-required' };
};

const removeUnverifiedPhoneFactors = async (supabase: SupabaseClient): Promise<void> => {
  const factorsResult = await supabase.auth.mfa.listFactors();
  if (factorsResult.error || !factorsResult.data) {
    throw factorsResult.error ?? new Error('Phone verification factors are unavailable.');
  }

  const factorIds = factorsResult.data.all
    .filter((factor) => factor.factor_type === 'phone' && factor.status === 'unverified')
    .map((factor) => factor.id);

  for (const factorId of factorIds) {
    const result = await supabase.auth.mfa.unenroll({ factorId });
    if (result.error) {
      throw result.error;
    }
  }
};

export const enrollCitizenPhoneFactor = async (
  supabase: SupabaseClient,
  phoneInput: string,
): Promise<string> => {
  await removeUnverifiedPhoneFactors(supabase);
  const result = await supabase.auth.mfa.enroll({
    factorType: 'phone',
    friendlyName: CITIZEN_PHONE_FACTOR_NAME,
    phone: normalizePhone(phoneInput),
  });

  if (result.error || !result.data || result.data.type !== 'phone') {
    throw result.error ?? new Error('Phone verification enrollment could not be started.');
  }

  return requireIdentifier(result.data.id, 'Phone verification factor is unavailable.');
};

export const removePendingCitizenPhoneFactor = async (
  supabase: SupabaseClient,
  factorId: string,
): Promise<void> => {
  const validFactorId = requireIdentifier(factorId, 'Phone verification factor is unavailable.');
  const result = await supabase.auth.mfa.unenroll({ factorId: validFactorId });
  if (result.error || result.data?.id !== validFactorId) {
    throw result.error ?? new Error('Phone verification enrollment could not be removed.');
  }
};

export const challengeCitizenPhoneFactor = async (
  supabase: SupabaseClient,
  factorId: string,
): Promise<string> => {
  const result = await supabase.auth.mfa.challenge({
    channel: 'sms',
    factorId: requireIdentifier(factorId, 'Phone verification factor is unavailable.'),
  });

  if (result.error || !result.data || result.data.type !== 'phone') {
    throw result.error ?? new Error('Phone verification code could not be sent.');
  }

  return requireIdentifier(result.data.id, 'Phone verification challenge is unavailable.');
};

export const verifyCitizenPhoneFactor = async (
  supabase: SupabaseClient,
  factorId: string,
  challengeId: string,
  codeInput: string,
  recordAuditEvent: OtpAuditRecorder = recordAuthAuditEventSafely,
): Promise<void> => {
  const result = await supabase.auth.mfa.verify({
    challengeId: requireIdentifier(challengeId, 'Phone verification challenge is unavailable.'),
    code: normalizeOtp(codeInput),
    factorId: requireIdentifier(factorId, 'Phone verification factor is unavailable.'),
  });

  if (result.error || !result.data?.access_token) {
    throw result.error ?? new Error('Phone verification did not establish a secure session.');
  }

  const state = await getCitizenPhoneMfaState(supabase);
  if (state.status !== 'verified') {
    throw new Error('Phone verification did not establish a secure session.');
  }

  await recordAuditEvent(result.data.access_token, 'otp_verified');
};

export const buildCitizenPhoneMfaPath = (returnPath: string): string => {
  const parameters = new URLSearchParams({ next: getSafeReturnPath(returnPath, '/account') });
  return `/auth/verify-phone?${parameters.toString()}`;
};

export const getCitizenPostPasswordDestination = (
  mode: CitizenPhoneMfaMode,
  returnPath: string,
): string => {
  const safeReturnPath = getSafeReturnPath(returnPath, '/account');
  return mode === 'enforce' ? buildCitizenPhoneMfaPath(safeReturnPath) : safeReturnPath;
};
