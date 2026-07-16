import type { SupabaseClient } from '@supabase/supabase-js';

import { getSafeMfaReturnPath } from './return-path';

const GOVERNMENT_TOTP_FRIENDLY_NAME = 'Local Wellness government dashboard';

export class MfaCodeInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MfaCodeInputError';
  }
}

export type MfaFlowState =
  | Readonly<{ status: 'verified' }>
  | Readonly<{ factorId: string; status: 'challenge' }>
  | Readonly<{ status: 'enrollment-required' }>;

export type TotpEnrollment = Readonly<{
  factorId: string;
  qrCodeSource: string;
  secret: string;
}>;

const requireNonEmptyString = (value: unknown, message: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(message);
  }

  return value;
};

export const normalizeMfaCode = (value: string): string => {
  const normalizedValue = value.replaceAll(/\s/gu, '');

  if (!/^\d{6}$/u.test(normalizedValue)) {
    throw new MfaCodeInputError('Enter the 6-digit authenticator code.');
  }

  return normalizedValue;
};

export const buildMfaPath = (returnPath: string): string => {
  const safeReturnPath = getSafeMfaReturnPath(returnPath, '/');
  const parameters = new URLSearchParams({ next: safeReturnPath });
  return `/auth/mfa?${parameters.toString()}`;
};

export const getMfaFlowState = async (supabase: SupabaseClient): Promise<MfaFlowState> => {
  const assuranceResult = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (assuranceResult.error) {
    throw assuranceResult.error;
  }

  if (!assuranceResult.data?.currentLevel) {
    throw new Error('The current authenticator assurance level is unavailable.');
  }

  if (assuranceResult.data.currentLevel === 'aal2') {
    return { status: 'verified' };
  }

  const factorsResult = await supabase.auth.mfa.listFactors();

  if (factorsResult.error) {
    throw factorsResult.error;
  }

  if (!factorsResult.data || !Array.isArray(factorsResult.data.totp)) {
    throw new Error('Authenticator factors are unavailable.');
  }

  const verifiedFactors = [...factorsResult.data.totp]
    .filter((factor) => factor.status === 'verified' && factor.id.length > 0)
    .sort(
      (left, right) =>
        left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id),
    );
  const factor = verifiedFactors[0];

  return factor ? { factorId: factor.id, status: 'challenge' } : { status: 'enrollment-required' };
};

const getQrCodeSource = (qrCode: string): string =>
  qrCode.startsWith('data:image/')
    ? qrCode
    : `data:image/svg+xml;utf-8,${encodeURIComponent(qrCode)}`;

export const enrollTotpFactor = async (supabase: SupabaseClient): Promise<TotpEnrollment> => {
  const result = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: GOVERNMENT_TOTP_FRIENDLY_NAME,
  });

  if (result.error) {
    throw result.error;
  }

  if (!result.data || result.data.type !== 'totp' || !result.data.totp) {
    throw new Error('Authenticator enrollment data is unavailable.');
  }

  const factorId = requireNonEmptyString(result.data.id, 'Authenticator factor ID is unavailable.');
  const qrCode = requireNonEmptyString(
    result.data.totp.qr_code,
    'Authenticator QR code is unavailable.',
  );
  const secret = requireNonEmptyString(
    result.data.totp.secret,
    'Authenticator setup key is unavailable.',
  );

  return {
    factorId,
    qrCodeSource: getQrCodeSource(qrCode),
    secret,
  };
};

export const verifyTotpFactor = async (
  supabase: SupabaseClient,
  factorId: string,
  codeInput: string,
): Promise<void> => {
  const code = normalizeMfaCode(codeInput);
  const result = await supabase.auth.mfa.challengeAndVerify({ factorId, code });

  if (result.error) {
    throw result.error;
  }

  if (!result.data?.access_token) {
    throw new Error('Authenticator verification did not establish an AAL2 session.');
  }

  const assuranceResult = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (assuranceResult.error) {
    throw assuranceResult.error;
  }

  if (assuranceResult.data?.currentLevel !== 'aal2') {
    throw new Error('Authenticator verification did not establish an AAL2 session.');
  }
};

export const cleanupTotpFactor = async (
  supabase: SupabaseClient,
  factorId: string,
): Promise<void> => {
  const result = await supabase.auth.mfa.unenroll({ factorId });

  if (result.error) {
    throw result.error;
  }

  if (result.data?.id !== factorId) {
    throw new Error('Authenticator enrollment cleanup could not be confirmed.');
  }
};

export const getMfaError = (error: unknown): string => {
  if (error instanceof MfaCodeInputError) {
    return error.message;
  }

  if (error instanceof Error) {
    const normalizedMessage = error.message.toLowerCase();

    if (
      normalizedMessage.includes('invalid') ||
      normalizedMessage.includes('expired') ||
      normalizedMessage.includes('challenge')
    ) {
      return 'The authenticator code is invalid or expired.';
    }

    if (normalizedMessage.includes('rate') || normalizedMessage.includes('too many')) {
      return 'Too many attempts. Wait a moment before trying again.';
    }
  }

  return 'Authenticator verification could not be completed. Please try again.';
};
