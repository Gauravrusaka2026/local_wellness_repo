import assert from 'node:assert/strict';
import test from 'node:test';
import type { Factor, Session, SupabaseClient } from '@supabase/supabase-js';

import { normalizePassword } from '../src/auth/auth-input';
import {
  createPasswordAccount,
  exchangePasswordRecoveryCode,
  requestPasswordRecovery,
  signInWithPassword,
  updatePassword,
} from '../src/auth/password-auth';
import { enrollPhoneMfa, inspectPhoneMfa, verifyPhoneMfa } from '../src/auth/phone-mfa';

const session = { access_token: 'access-token' } as Session;
const factor = (overrides: Partial<Factor> = {}): Factor => ({
  created_at: '2026-07-16T10:00:00.000Z',
  factor_type: 'phone',
  id: 'phone-factor',
  status: 'verified',
  updated_at: '2026-07-16T10:00:00.000Z',
  ...overrides,
});

test('validates the configured mobile password boundary without altering the password', () => {
  assert.equal(normalizePassword('correct horse battery staple'), 'correct horse battery staple');
  assert.throws(() => normalizePassword('short'), /at least 8/u);
  assert.throws(() => normalizePassword('x'.repeat(73)), /no more than 72/u);
});

test('signs in with normalized email and records only an established password session', async () => {
  const calls: unknown[] = [];
  const supabase = {
    auth: {
      signInWithPassword: async (credentials: unknown) => {
        calls.push(credentials);
        return { data: { session }, error: null };
      },
    },
  } as unknown as SupabaseClient;

  await signInWithPassword(supabase, ' Citizen@Example.org ', 'password123', async (...audit) => {
    calls.push(audit);
    return true;
  });

  assert.deepEqual(calls, [
    { email: 'citizen@example.org', password: 'password123' },
    ['access-token', 'sign_in_succeeded'],
  ]);
});

test('keeps confirmation-dependent sign-up explicit when Supabase returns no session', async () => {
  const supabase = {
    auth: { signUp: async () => ({ data: { session: null }, error: null }) },
  } as unknown as SupabaseClient;

  assert.deepEqual(await createPasswordAccount(supabase, 'new@example.org', 'password123'), {
    status: 'email-confirmation-required',
  });
});

test('requests password recovery with a reviewed redirect and updates only valid passwords', async () => {
  const calls: unknown[] = [];
  const supabase = {
    auth: {
      resetPasswordForEmail: async (...parameters: unknown[]) => {
        calls.push(parameters);
        return { error: null };
      },
      updateUser: async (attributes: unknown) => {
        calls.push(attributes);
        return { error: null };
      },
    },
  } as unknown as SupabaseClient;

  assert.equal(
    await requestPasswordRecovery(
      supabase,
      ' Citizen@Example.org ',
      'localwellness://auth/reset-password',
    ),
    'citizen@example.org',
  );
  await updatePassword(supabase, 'new-password');
  assert.deepEqual(calls, [
    ['citizen@example.org', { redirectTo: 'localwellness://auth/reset-password' }],
    { password: 'new-password' },
  ]);
});

test('accepts a password-recovery code only when Supabase establishes a session', async () => {
  const calls: unknown[] = [];
  const supabase = {
    auth: {
      exchangeCodeForSession: async (code: string) => {
        calls.push(code);
        return { data: { session }, error: null };
      },
    },
  } as unknown as SupabaseClient;

  await exchangePasswordRecoveryCode(supabase, ' recovery-code ');
  assert.deepEqual(calls, ['recovery-code']);

  const missingSessionClient = {
    auth: {
      exchangeCodeForSession: async () => ({ data: { session: null }, error: null }),
    },
  } as unknown as SupabaseClient;
  await assert.rejects(
    exchangePasswordRecoveryCode(missingSessionClient, 'recovery-code'),
    /session was not established/u,
  );
});

test('does not accept TOTP-only AAL2 as verified phone MFA', async () => {
  const supabase = {
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: 'aal2' },
          error: null,
        }),
        listFactors: async () => ({
          data: { all: [factor({ factor_type: 'totp' })], phone: [] },
          error: null,
        }),
      },
    },
  } as unknown as SupabaseClient;

  assert.deepEqual(await inspectPhoneMfa(supabase), { status: 'enrollment-required' });
});

test('recognizes only the combination of a verified phone factor and AAL2', async () => {
  const phoneFactor = factor();
  const supabase = {
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: 'aal2' },
          error: null,
        }),
        listFactors: async () => ({
          data: { all: [phoneFactor], phone: [phoneFactor] },
          error: null,
        }),
      },
    },
  } as unknown as SupabaseClient;

  assert.deepEqual(await inspectPhoneMfa(supabase), { status: 'assured' });
});

test('cleans abandoned phone enrollment before enrolling and challenging a normalized number', async () => {
  const calls: unknown[] = [];
  const abandoned = factor({ id: 'abandoned', status: 'unverified' });
  const supabase = {
    auth: {
      mfa: {
        challenge: async (parameters: unknown) => {
          calls.push(['challenge', parameters]);
          return { data: { id: 'challenge-id' }, error: null };
        },
        enroll: async (parameters: unknown) => {
          calls.push(['enroll', parameters]);
          return { data: { id: 'new-factor' }, error: null };
        },
        listFactors: async () => ({ data: { all: [abandoned], phone: [] }, error: null }),
        unenroll: async (parameters: unknown) => {
          calls.push(['unenroll', parameters]);
          return { data: {}, error: null };
        },
      },
    },
  } as unknown as SupabaseClient;

  assert.deepEqual(await enrollPhoneMfa(supabase, '+91 98765 43210'), {
    challengeId: 'challenge-id',
    factorId: 'new-factor',
  });
  assert.deepEqual(calls, [
    ['unenroll', { factorId: 'abandoned' }],
    [
      'enroll',
      {
        factorType: 'phone',
        friendlyName: 'JagrukSetu mobile',
        phone: '+919876543210',
      },
    ],
    ['challenge', { channel: 'sms', factorId: 'new-factor' }],
  ]);
});

test('requires phone verification to return and prove an AAL2 access token', async () => {
  const calls: unknown[] = [];
  const supabase = {
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: async (accessToken: string) => {
          calls.push(['aal', accessToken]);
          return { data: { currentLevel: 'aal2' }, error: null };
        },
        verify: async (parameters: unknown) => {
          calls.push(['verify', parameters]);
          return { data: { access_token: 'aal2-token' }, error: null };
        },
      },
    },
  } as unknown as SupabaseClient;

  await verifyPhoneMfa(
    supabase,
    { challengeId: 'challenge-id', factorId: 'phone-factor' },
    '123 456',
  );
  assert.deepEqual(calls, [
    ['verify', { challengeId: 'challenge-id', code: '123456', factorId: 'phone-factor' }],
    ['aal', 'aal2-token'],
  ]);
});
