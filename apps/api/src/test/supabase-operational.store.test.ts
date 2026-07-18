import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HealthDataAccessError } from '../data/health.store.js';
import { RateLimitDataAccessError } from '../data/rate-limit.store.js';
import { SupabaseClients } from '../supabase/supabase-clients.js';
import { SupabaseHealthStore } from '../supabase/supabase-health.store.js';
import { SupabaseRateLimitStore } from '../supabase/supabase-rate-limit.store.js';

const clientsWithRpc = (
  rpc: (name: string, input?: unknown) => Promise<unknown>,
): SupabaseClients => ({ serviceRoleClient: { rpc } }) as unknown as SupabaseClients;

describe('Supabase operational stores', () => {
  it('decodes the narrow readiness result and fails closed on malformed data', async () => {
    const readyStore = new SupabaseHealthStore(
      clientsWithRpc(async (name) => {
        assert.equal(name, 'api_readiness_check');
        return { data: true, error: null };
      }),
    );
    assert.equal(await readyStore.isReady(), true);

    const malformedStore = new SupabaseHealthStore(
      clientsWithRpc(async () => ({ data: 'true', error: null })),
    );
    await assert.rejects(malformedStore.isReady(), HealthDataAccessError);
  });

  it('sends only the hashed quota subject and strictly decodes the result', async () => {
    const calls: Array<Readonly<{ input: unknown; name: string }>> = [];
    const store = new SupabaseRateLimitStore(
      clientsWithRpc(async (name, input) => {
        calls.push({ input, name });
        return {
          data: {
            allowed: true,
            limit: 10,
            remaining: 9,
            reset_at: '2026-07-16T12:01:00.000Z',
          },
          error: null,
        };
      }),
    );
    const input = {
      limit: 10,
      scope: 'test_scope',
      subjectSha256: 'a'.repeat(64),
      windowSeconds: 60,
    };

    assert.deepEqual(await store.consume(input), {
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: '2026-07-16T12:01:00.000Z',
    });
    assert.deepEqual(calls, [
      {
        name: 'consume_api_rate_limit',
        input: {
          p_limit: 10,
          p_scope: 'test_scope',
          p_subject_sha256: 'a'.repeat(64),
          p_window_seconds: 60,
        },
      },
    ]);
  });

  it('rejects malformed or failed quota responses without exposing database details', async () => {
    const malformedStore = new SupabaseRateLimitStore(
      clientsWithRpc(async () => ({
        data: {
          allowed: true,
          limit: 10,
          remaining: 11,
          reset_at: 'not-a-date',
        },
        error: null,
      })),
    );
    const failedStore = new SupabaseRateLimitStore(
      clientsWithRpc(async () => ({
        data: null,
        error: { code: 'PGRST202', message: 'sensitive detail' },
      })),
    );
    const input = {
      limit: 10,
      scope: 'test_scope',
      subjectSha256: 'b'.repeat(64),
      windowSeconds: 60,
    };

    await assert.rejects(malformedStore.consume(input), RateLimitDataAccessError);
    await assert.rejects(
      failedStore.consume(input),
      (error: unknown) =>
        error instanceof RateLimitDataAccessError && error.dependencyCode === 'PGRST202',
    );
  });
});
