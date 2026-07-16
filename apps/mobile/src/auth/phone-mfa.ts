import type { Factor, SupabaseClient } from '@supabase/supabase-js';

import { normalizeOtp, normalizePhone } from './auth-input';

export type PhoneMfaStatus =
  | Readonly<{ status: 'assured' }>
  | Readonly<{ factorId: string; status: 'challenge-required' }>
  | Readonly<{ status: 'enrollment-required' }>;

export type PhoneMfaChallenge = Readonly<{
  challengeId: string;
  factorId: string;
}>;

export const getUserFacingPhoneMfaError = (error: unknown, isOptional: boolean): string => {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (
    message.includes('disabled') ||
    message.includes('not enabled') ||
    message.includes('unsupported') ||
    message.includes('provider')
  ) {
    return isOptional
      ? 'Phone verification is not enabled for this Supabase project yet. You can continue using email and password while setup is pending.'
      : 'Phone verification is required but not available. Ask the project administrator to enable Advanced Phone MFA and an SMS provider.';
  }

  return 'Phone verification could not be completed. Check the number or code and try again.';
};

const newestFactor = (factors: readonly Factor<'phone', 'verified'>[]) =>
  [...factors].sort((left, right) => right.updated_at.localeCompare(left.updated_at))[0];

export const inspectPhoneMfa = async (supabase: SupabaseClient): Promise<PhoneMfaStatus> => {
  const [assurance, factors] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);

  if (assurance.error) throw assurance.error;
  if (factors.error) throw factors.error;
  const factor = newestFactor(factors.data.phone);
  if (factor === undefined) return { status: 'enrollment-required' };
  return assurance.data.currentLevel === 'aal2'
    ? { status: 'assured' }
    : { factorId: factor.id, status: 'challenge-required' };
};

const removeUnverifiedPhoneFactors = async (supabase: SupabaseClient): Promise<void> => {
  const factors = await supabase.auth.mfa.listFactors();
  if (factors.error) throw factors.error;

  for (const factor of factors.data.all) {
    if (factor.factor_type !== 'phone' || factor.status !== 'unverified') continue;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error) throw error;
  }
};

export const challengePhoneMfa = async (
  supabase: SupabaseClient,
  factorId: string,
): Promise<PhoneMfaChallenge> => {
  const { data, error } = await supabase.auth.mfa.challenge({
    channel: 'sms',
    factorId,
  });
  if (error) throw error;

  return { challengeId: data.id, factorId };
};

export const enrollPhoneMfa = async (
  supabase: SupabaseClient,
  phoneValue: string,
): Promise<PhoneMfaChallenge> => {
  const phone = normalizePhone(phoneValue);
  await removeUnverifiedPhoneFactors(supabase);

  const enrollment = await supabase.auth.mfa.enroll({
    factorType: 'phone',
    friendlyName: 'Local Wellness mobile',
    phone,
  });
  if (enrollment.error) throw enrollment.error;

  try {
    return await challengePhoneMfa(supabase, enrollment.data.id);
  } catch (error) {
    await supabase.auth.mfa.unenroll({ factorId: enrollment.data.id });
    throw error;
  }
};

export const verifyPhoneMfa = async (
  supabase: SupabaseClient,
  challenge: PhoneMfaChallenge,
  otpValue: string,
): Promise<void> => {
  const code = normalizeOtp(otpValue);
  const verification = await supabase.auth.mfa.verify({
    challengeId: challenge.challengeId,
    code,
    factorId: challenge.factorId,
  });
  if (verification.error) throw verification.error;
  if (!verification.data.access_token) throw new Error('MFA session was not established.');

  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel(
    verification.data.access_token,
  );
  if (assurance.error) throw assurance.error;
  if (assurance.data.currentLevel !== 'aal2') {
    throw new Error('Phone verification did not establish a high-assurance session.');
  }
};
