import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform, type NativeEventSubscription } from 'react-native';

import { getPublicSupabaseConfiguration } from '../config/environment';
import { secureSessionStorage } from './secure-storage';

let client: SupabaseClient | undefined;
let appStateSubscription: NativeEventSubscription | undefined;

const configureAutoRefresh = (supabase: SupabaseClient): void => {
  if (Platform.OS === 'web' || appStateSubscription !== undefined) {
    return;
  }

  if (AppState.currentState === 'active') {
    supabase.auth.startAutoRefresh();
  }

  appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
      return;
    }

    supabase.auth.stopAutoRefresh();
  });
};

export const getSupabaseClient = (): SupabaseClient => {
  if (client !== undefined) {
    return client;
  }

  const configuration = getPublicSupabaseConfiguration();
  client = createClient(configuration.url, configuration.anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      persistSession: true,
      storage: secureSessionStorage,
    },
  });
  configureAutoRefresh(client);

  return client;
};

export { createIsolatedSupabaseClient } from './isolated-supabase';
