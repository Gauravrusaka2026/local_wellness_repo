import type { CitizenPhoneMfaState } from './phone-mfa';

export type CitizenAuthIdentity = Readonly<{
  email?: string | null | undefined;
  phone?: string | null | undefined;
}>;

export const getCitizenAccountLabel = (
  identity: CitizenAuthIdentity,
  fallback = 'Verified citizen account',
): string => identity.email ?? identity.phone ?? fallback;

export type CitizenPhoneVerificationStatus = Readonly<{
  detail: string;
  label: string;
  needsAction: boolean;
}>;

export const getCitizenPhoneVerificationStatus = (
  state: CitizenPhoneMfaState | null,
  isRequired: boolean,
): CitizenPhoneVerificationStatus => {
  if (state === null) {
    return {
      detail: 'Phone verification status could not be checked. Try again before relying on it.',
      label: 'Temporarily unavailable',
      needsAction: true,
    };
  }

  if (state.status === 'verified') {
    return {
      detail: 'This session has a verified Supabase Phone MFA factor.',
      label: 'Verified for this session',
      needsAction: false,
    };
  }

  if (state.status === 'challenge-required' && state.factorStatus === 'verified') {
    return {
      detail: 'Your phone is enrolled. Enter a fresh SMS code to verify this session.',
      label: isRequired ? 'Verification required' : 'Enrolled',
      needsAction: true,
    };
  }

  if (state.status === 'challenge-required') {
    return {
      detail: 'A phone was added but its first SMS verification is not complete.',
      label: 'Setup incomplete',
      needsAction: true,
    };
  }

  return {
    detail: isRequired
      ? 'Add and verify a phone number before continuing to protected citizen features.'
      : 'Phone verification is optional during the current rollout.',
    label: isRequired ? 'Required' : 'Not verified',
    needsAction: true,
  };
};
