import type { EmailOtpType } from '@supabase/supabase-js';

const supportedEmailOtpTypes: readonly EmailOtpType[] = ['email', 'magiclink', 'signup'];

export const getSupportedEmailOtpType = (value: string | null): EmailOtpType | null =>
  supportedEmailOtpTypes.includes(value as EmailOtpType) ? (value as EmailOtpType) : null;

export const getCitizenEmailCallbackUrl = (origin: string): string =>
  new URL('/auth/callback', origin).toString();
