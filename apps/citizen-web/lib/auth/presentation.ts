import type { CitizenPhoneVerificationState } from './phone-verification';

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
  state: CitizenPhoneVerificationState | null,
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
      detail: 'This account has a confirmed phone number.',
      label: 'Phone confirmed',
      needsAction: false,
    };
  }

  if (state.status === 'verification-required') {
    return {
      detail: 'A phone number was added, but its SMS verification is not complete.',
      label: isRequired ? 'Verification required' : 'Pending verification',
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
