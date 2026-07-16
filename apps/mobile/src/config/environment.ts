import {
  firstConfiguredValue,
  parsePublicHttpUrl,
  parsePublicSupabaseConfiguration,
} from '@local-wellness/config';

export const getPublicSupabaseConfiguration = () =>
  parsePublicSupabaseConfiguration({
    anonKey: firstConfiguredValue(
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    ),
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  });

export const getPublicApiUrl = (): string =>
  parsePublicHttpUrl(process.env.EXPO_PUBLIC_API_URL, 'EXPO_PUBLIC_API_URL');

export const getPublicRealtimeUrl = (): string | null => {
  const value = process.env.EXPO_PUBLIC_REALTIME_URL?.trim();
  return value ? parsePublicHttpUrl(value, 'EXPO_PUBLIC_REALTIME_URL') : null;
};
