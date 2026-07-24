import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getPublicSupabaseConfiguration } from '../environment';

export const createIsolatedBrowserSupabaseClient = (): SupabaseClient => {
  const configuration = getPublicSupabaseConfiguration();

  return createClient(configuration.url, configuration.anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'pkce',
      persistSession: false,
    },
  });
};
