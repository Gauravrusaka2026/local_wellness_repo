import { createBrowserClient } from '@supabase/ssr';

import { assertCitizenProtectedAccessAvailable } from '../access-policy';
import { getPublicSupabaseConfiguration } from '../environment';

export const createBrowserSupabaseClient = () => {
  if (typeof window !== 'undefined') {
    assertCitizenProtectedAccessAvailable();
  }
  const configuration = getPublicSupabaseConfiguration();

  return createBrowserClient(configuration.url, configuration.anonKey);
};
