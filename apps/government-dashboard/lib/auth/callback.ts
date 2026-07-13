import type { EmailOtpType } from '@supabase/supabase-js';

const supportedTypes: readonly EmailOtpType[] = ['invite', 'magiclink', 'email'];

export const getSupportedEmailOtpType = (value: string | null): EmailOtpType | null =>
  supportedTypes.includes(value as EmailOtpType) ? (value as EmailOtpType) : null;
