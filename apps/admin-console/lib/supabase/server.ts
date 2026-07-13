import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { getPublicSupabaseConfiguration } from '../environment';

export const createServerSupabaseClient = async () => {
  const configuration = getPublicSupabaseConfiguration();
  const cookieStore = await cookies();

  return createServerClient(configuration.url, configuration.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies; proxy.ts performs refresh writes.
        }
      },
    },
  });
};
