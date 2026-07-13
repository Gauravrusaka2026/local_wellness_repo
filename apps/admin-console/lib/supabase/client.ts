import { createBrowserClient } from '@supabase/ssr';

import { getPublicSupabaseConfiguration } from '../environment';

export const createBrowserSupabaseClient = () => {
  const configuration = getPublicSupabaseConfiguration();
  return createBrowserClient(configuration.url, configuration.anonKey);
};
