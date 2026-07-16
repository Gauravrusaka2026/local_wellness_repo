import {
  ConfigurationError,
  firstConfiguredValue,
  parsePublicHttpUrl,
  parsePublicSupabaseConfiguration,
} from '@local-wellness/config';

export type CitizenPhoneMfaMode = 'enforce' | 'observe';

export const parseCitizenPhoneMfaMode = (value: string | undefined): CitizenPhoneMfaMode => {
  if (value === undefined || value === '' || value === 'observe') {
    return 'observe';
  }

  if (value === 'enforce') {
    return 'enforce';
  }

  throw new ConfigurationError(
    'NEXT_PUBLIC_CITIZEN_PHONE_MFA_MODE must be either "observe" or "enforce".',
  );
};

export const getCitizenPhoneMfaMode = (): CitizenPhoneMfaMode =>
  parseCitizenPhoneMfaMode(process.env.NEXT_PUBLIC_CITIZEN_PHONE_MFA_MODE);

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
