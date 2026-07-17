import type { PhoneMfaMode } from '../config/environment';

export interface PhoneMfaSignInCopy {
  description: string;
  trustText: string;
}

export const getPhoneMfaSignInCopy = (mode: PhoneMfaMode): PhoneMfaSignInCopy =>
  mode === 'enforce'
    ? {
        description:
          'Use your email and password, then verify your registered phone with a one-time code.',
        trustText:
          'Your password is managed by Supabase and never stored by Local Wellness. A phone OTP is required before private complaints and profile data become available.',
      }
    : {
        description:
          'Use your email and password. Phone verification is optional while secure SMS delivery is being configured.',
        trustText:
          'Your password is managed by Supabase and never stored by Local Wellness. Phone verification is being introduced in stages and is not required in this environment yet.',
      };
