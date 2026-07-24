import type { PhoneVerificationMode } from '../config/environment';

export interface PhoneVerificationSignInCopy {
  description: string;
  trustText: string;
}

export const getPhoneVerificationSignInCopy = (
  mode: PhoneVerificationMode,
): PhoneVerificationSignInCopy =>
  mode === 'enforce'
    ? {
        description:
          'Use your email and password, then confirm your mobile number with a one-time SMS code.',
        trustText:
          'Your password is managed by Supabase and never stored by JagrukSetu. A confirmed phone is required before private complaints and profile data become available.',
      }
    : {
        description:
          'Use your email and password. Phone confirmation is optional in this environment.',
        trustText:
          'Your password is managed by Supabase and never stored by JagrukSetu. You can add and confirm a phone from your profile.',
      };
