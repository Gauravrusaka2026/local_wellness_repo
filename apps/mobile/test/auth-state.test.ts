import assert from 'node:assert/strict';
import test from 'node:test';
import type { Session, User } from '@supabase/supabase-js';

import {
  resolveSessionPhoneVerification,
  restoreAuthSession,
  scheduleAuthStateFollowUp,
} from '../src/auth/auth-state';

const session = {
  access_token: 'verified-access-token',
  user: { id: 'citizen-user-id' },
} as Session;

type UserOverrides = Omit<Partial<User>, 'phone' | 'phone_confirmed_at'> & {
  phone?: string | undefined;
  phone_confirmed_at?: string | undefined;
};

const user = (overrides: UserOverrides = {}): User =>
  ({
    id: 'citizen-user-id',
    phone: '+919876543210',
    phone_confirmed_at: '2026-07-23T08:00:00.000Z',
    ...overrides,
  }) as User;

test('restores a mobile session and fails closed on storage errors', async () => {
  assert.deepEqual(await restoreAuthSession(async () => ({ data: { session }, error: null })), {
    session,
    status: 'signed-in',
  });
  assert.deepEqual(
    await restoreAuthSession(async () => ({ data: { session: null }, error: null })),
    { status: 'signed-out' },
  );
  assert.deepEqual(
    await restoreAuthSession(async () => {
      throw new Error('secure storage unavailable');
    }),
    { status: 'signed-out' },
  );
});

test('grants private access to the matching user only after phone confirmation', async () => {
  assert.deepEqual(
    await resolveSessionPhoneVerification(session, async () => ({
      data: { user: user() },
      error: null,
    })),
    { session, status: 'signed-in' },
  );

  for (const authoritativeUser of [
    user({ phone_confirmed_at: undefined }),
    user({ phone: undefined }),
    user({ id: 'different-user-id' }),
  ]) {
    assert.deepEqual(
      await resolveSessionPhoneVerification(session, async () => ({
        data: { user: authoritativeUser },
        error: null,
      })),
      { session, status: 'phone-verification-required' },
    );
  }
});

test('fails the phone gate closed when authoritative user inspection fails', async () => {
  assert.deepEqual(
    await resolveSessionPhoneVerification(session, async () => {
      throw new Error('provider unavailable');
    }),
    { session, status: 'phone-verification-required' },
  );
  assert.deepEqual(
    await resolveSessionPhoneVerification(session, async () => ({
      data: { user: null },
      error: new Error('expired'),
    })),
    { session, status: 'phone-verification-required' },
  );
});

test('allows email-password sessions during the explicit observe rollout', async () => {
  assert.deepEqual(
    await resolveSessionPhoneVerification(
      session,
      async () => {
        throw new Error('phone provider is not configured');
      },
      false,
    ),
    { session, status: 'signed-in' },
  );
});

test('defers Supabase auth follow-up work until after the auth callback returns', async () => {
  let invoked = false;

  scheduleAuthStateFollowUp(() => {
    invoked = true;
  });

  assert.equal(invoked, false);
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(invoked, true);
});

test('cancels stale Supabase auth follow-up work', async () => {
  let invoked = false;
  const cancel = scheduleAuthStateFollowUp(() => {
    invoked = true;
  });

  cancel();
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(invoked, false);
});
