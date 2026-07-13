import {
  firstConfiguredValue,
  parsePublicHttpUrl,
  parsePublicSupabaseConfiguration,
} from '@local-wellness/config';

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
