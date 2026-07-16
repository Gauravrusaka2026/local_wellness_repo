import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@local-wellness/database';

import { RealtimeStore } from './realtime-store.js';

const serverAuthOptions = {
  autoRefreshToken: false,
  detectSessionInUrl: false,
  persistSession: false,
} as const;

export type AuthenticatedRealtimeUser = Readonly<{
  expiresAtMilliseconds: number;
  userId: string;
}>;

export class RealtimeAuthenticationUnavailableError extends Error {
  public constructor() {
    super('Realtime authentication is temporarily unavailable.');
    this.name = 'RealtimeAuthenticationUnavailableError';
  }
}

export abstract class RealtimeAuthenticationGateway {
  public abstract authenticate(accessToken: string): Promise<AuthenticatedRealtimeUser | null>;
}

const decodeExpiration = (accessToken: string): number | null => {
  const payloadSegment = accessToken.split('.')[1];
  if (!payloadSegment) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(payloadSegment, 'base64url').toString('utf8'),
    ) as unknown;
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('exp' in payload) ||
      typeof payload.exp !== 'number' ||
      !Number.isSafeInteger(payload.exp)
    ) {
      return null;
    }
    return payload.exp * 1_000;
  } catch {
    return null;
  }
};

export class SupabaseRealtimeAuthenticationGateway extends RealtimeAuthenticationGateway {
  private readonly client: SupabaseClient<Database>;

  public constructor(
    supabaseUrl: string,
    supabaseAnonKey: string,
    private readonly store: RealtimeStore,
  ) {
    super();
    this.client = createClient<Database>(supabaseUrl, supabaseAnonKey, { auth: serverAuthOptions });
  }

  public async authenticate(accessToken: string): Promise<AuthenticatedRealtimeUser | null> {
    const expiresAtMilliseconds = decodeExpiration(accessToken);
    if (expiresAtMilliseconds === null || expiresAtMilliseconds <= Date.now()) return null;

    const { data, error } = await this.client.auth.getUser(accessToken);
    if (error) {
      if (error.status === 400 || error.status === 401 || error.status === 403) return null;
      throw new RealtimeAuthenticationUnavailableError();
    }
    if (!data.user) return null;

    try {
      if (!(await this.store.isActiveAccount(data.user.id))) return null;
    } catch {
      throw new RealtimeAuthenticationUnavailableError();
    }

    return { expiresAtMilliseconds, userId: data.user.id };
  }
}
