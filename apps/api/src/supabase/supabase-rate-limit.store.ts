import { Inject, Injectable } from '@nestjs/common';
import type { Json } from '@local-wellness/database';

import {
  RateLimitDataAccessError,
  RateLimitStore,
  type ConsumeRateLimitInput,
  type RateLimitConsumption,
} from '../data/rate-limit.store.js';
import { SupabaseClients } from './supabase-clients.js';

const isRecord = (value: Json): value is { [key: string]: Json | undefined } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const databaseErrorCode = (error: unknown): string | null =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  typeof error.code === 'string' &&
  /^[A-Z0-9_]{2,32}$/u.test(error.code)
    ? error.code
    : null;

const decodeConsumption = (value: Json): RateLimitConsumption => {
  if (!isRecord(value)) {
    throw new RateLimitDataAccessError();
  }

  const allowed = value['allowed'];
  const limit = value['limit'];
  const remaining = value['remaining'];
  const resetAt = value['reset_at'];

  if (
    typeof allowed !== 'boolean' ||
    typeof limit !== 'number' ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    typeof remaining !== 'number' ||
    !Number.isInteger(remaining) ||
    remaining < 0 ||
    remaining > limit ||
    typeof resetAt !== 'string' ||
    !Number.isFinite(Date.parse(resetAt))
  ) {
    throw new RateLimitDataAccessError();
  }

  return { allowed, limit, remaining, resetAt };
};

@Injectable()
export class SupabaseRateLimitStore extends RateLimitStore {
  public constructor(@Inject(SupabaseClients) private readonly clients: SupabaseClients) {
    super();
  }

  public async consume(input: ConsumeRateLimitInput): Promise<RateLimitConsumption> {
    const { data, error } = await this.clients.serviceRoleClient.rpc('consume_api_rate_limit', {
      p_limit: input.limit,
      p_scope: input.scope,
      p_subject_sha256: input.subjectSha256,
      p_window_seconds: input.windowSeconds,
    });

    if (error || data === null) {
      throw new RateLimitDataAccessError(databaseErrorCode(error));
    }

    return decodeConsumption(data);
  }
}
