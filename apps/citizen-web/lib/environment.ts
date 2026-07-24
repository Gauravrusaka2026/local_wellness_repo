import {
  ConfigurationError,
  firstConfiguredValue,
  parsePublicHttpUrl,
  parsePublicSupabaseConfiguration,
} from '@local-wellness/config';

export type CitizenAccessMode = 'full' | 'public-only';
export type CitizenPhoneVerificationMode = 'enforce' | 'observe';

export const parseCitizenAccessMode = (value: string | undefined): CitizenAccessMode => {
  if (value === undefined || value === '' || value === 'public-only') {
    return 'public-only';
  }

  if (value === 'full') {
    return 'full';
  }

  throw new ConfigurationError(
    'NEXT_PUBLIC_CITIZEN_ACCESS_MODE must be either "public-only" or "full".',
  );
};

export const getCitizenAccessMode = (): CitizenAccessMode =>
  parseCitizenAccessMode(process.env.NEXT_PUBLIC_CITIZEN_ACCESS_MODE);

export const parseCitizenPhoneVerificationMode = (
  value: string | undefined,
): CitizenPhoneVerificationMode => {
  if (value === undefined || value === '' || value === 'enforce') {
    return 'enforce';
  }

  if (value === 'observe') {
    return 'observe';
  }

  throw new ConfigurationError(
    'NEXT_PUBLIC_CITIZEN_PHONE_VERIFICATION_MODE must be either "observe" or "enforce".',
  );
};

export const getCitizenPhoneVerificationMode = (): CitizenPhoneVerificationMode =>
  parseCitizenPhoneVerificationMode(
    process.env.NEXT_PUBLIC_CITIZEN_PHONE_VERIFICATION_MODE ??
      process.env.NEXT_PUBLIC_CITIZEN_PHONE_MFA_MODE,
  );

export const getPublicSupabaseConfiguration = () =>
  parsePublicSupabaseConfiguration({
    anonKey: firstConfiguredValue(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });

export const getPublicApiUrl = (): string =>
  parsePublicHttpUrl(process.env.NEXT_PUBLIC_API_URL, 'NEXT_PUBLIC_API_URL');
