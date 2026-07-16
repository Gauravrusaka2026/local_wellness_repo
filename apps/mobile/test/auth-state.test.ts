import assert from 'node:assert/strict';
import test from 'node:test';
import type { Session } from '@supabase/supabase-js';

import { resolveSessionAssurance, restoreAuthSession } from '../src/auth/auth-state';

const session = { access_token: 'verified-access-token' } as Session;

test('restores a verified mobile session', async () => {
  assert.deepEqual(await restoreAuthSession(async () => ({ data: { session }, error: null })), {
    session,
    status: 'signed-in',
  });
});

test('fails closed when mobile session restoration errors or rejects', async () => {
  assert.deepEqual(
    await restoreAuthSession(async () => ({ data: { session: null }, error: null })),
    { status: 'signed-out' },
  );
  assert.deepEqual(
    await restoreAuthSession(async () => ({
      data: { session },
      error: new Error('storage failed'),
    })),
    { status: 'signed-out' },
  );
  assert.deepEqual(
    await restoreAuthSession(async () => {
      throw new Error('secure storage unavailable');
    }),
    { status: 'signed-out' },
  );
});

test('grants private mobile access only to AAL2 sessions with a verified phone factor', async () => {
  assert.deepEqual(
    await resolveSessionAssurance(
      session,
      async () => ({ data: { currentLevel: 'aal2' }, error: null }),
      async () => true,
    ),
    { session, status: 'signed-in' },
  );
  assert.deepEqual(
    await resolveSessionAssurance(
      session,
      async () => ({ data: { currentLevel: 'aal2' }, error: null }),
      async () => false,
    ),
    { session, status: 'mfa-required' },
  );
  assert.deepEqual(
    await resolveSessionAssurance(
      session,
      async () => ({ data: { currentLevel: 'aal1' }, error: null }),
      async () => true,
    ),
    { session, status: 'mfa-required' },
  );
});

test('fails the private mobile gate closed when assurance inspection fails', async () => {
  assert.deepEqual(
    await resolveSessionAssurance(
      session,
      async () => {
        throw new Error('provider unavailable');
      },
      async () => true,
    ),
    { session, status: 'mfa-required' },
  );
});

test('allows email-password sessions during the staged phone MFA observe rollout', async () => {
  assert.deepEqual(
    await resolveSessionAssurance(
      session,
      async () => {
        throw new Error('phone MFA provider is not configured');
      },
      async () => false,
      false,
    ),
    { session, status: 'signed-in' },
  );
});
