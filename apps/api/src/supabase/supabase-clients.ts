import { Inject, Injectable } from '@nestjs/common';
import type { ApiConfiguration } from '@local-wellness/config';
import type { Database } from '@local-wellness/database';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { API_CONFIGURATION } from '../configuration.js';

const serverAuthOptions = {
  autoRefreshToken: false,
  detectSessionInUrl: false,
  persistSession: false,
} as const;

@Injectable()
export class SupabaseClients {
  public readonly publicClient: SupabaseClient<Database>;
  public readonly serviceRoleClient: SupabaseClient<Database>;

  public constructor(@Inject(API_CONFIGURATION) configuration: ApiConfiguration) {
    this.publicClient = createClient<Database>(
      configuration.supabase.url,
      configuration.supabase.anonKey,
      { auth: serverAuthOptions },
    );
    this.serviceRoleClient = createClient<Database>(
      configuration.supabase.url,
      configuration.supabase.serviceRoleKey,
      { auth: serverAuthOptions },
    );
  }
}
