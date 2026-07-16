import { Inject, Injectable } from '@nestjs/common';

import { HealthDataAccessError, HealthStore } from '../data/health.store.js';
import { SupabaseClients } from './supabase-clients.js';

@Injectable()
export class SupabaseHealthStore extends HealthStore {
  public constructor(@Inject(SupabaseClients) private readonly clients: SupabaseClients) {
    super();
  }

  public async isReady(): Promise<boolean> {
    const { data, error } = await this.clients.serviceRoleClient.rpc('api_readiness_check');

    if (error || typeof data !== 'boolean') {
      throw new HealthDataAccessError();
    }

    return data;
  }
}
