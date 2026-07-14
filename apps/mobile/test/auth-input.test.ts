import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  AuthInputError,
  normalizeEmail,
  normalizeOtp,
  normalizePhone,
} from '../src/auth/auth-input';
import { resolveMobileAuthCallback, type MobileAuthCallbackParameters } from '../src/auth/callback';
import {
  createSecureStorageManifest,
  parseSecureStorageManifest,
  SECURE_STORAGE_CHUNK_SIZE,
  splitSecureStorageValue,
} from '../src/auth/secure-storage-format';
import { signOutWithAudit } from '../src/auth/sign-out';

test('normalizes supported citizen identifiers and OTPs', () => {
  assert.equal(normalizeEmail(' Citizen@Example.ORG '), 'citizen@example.org');
  assert.equal(normalizePhone('+91 (98765) 43210'), '+919876543210');
  assert.equal(normalizeOtp('123 456'), '123456');
});

test('rejects identifiers that cannot be sent safely to Supabase Auth', () => {
  assert.throws(() => normalizeEmail('not-an-email'), AuthInputError);
  assert.throws(() => normalizePhone('9876543210'), AuthInputError);
  assert.throws(() => normalizeOtp('12ab56'), AuthInputError);
});

test('chunks and reconstructs values larger than a SecureStore item', () => {
  const value = 'a'.repeat(SECURE_STORAGE_CHUNK_SIZE * 2 + 17);
  const chunks = splitSecureStorageValue(value);

  assert.equal(chunks.length, 3);
  assert.equal(chunks.join(''), value);
  assert.equal(parseSecureStorageManifest(createSecureStorageManifest(chunks.length)), 3);
  assert.equal(parseSecureStorageManifest('not-a-manifest'), null);
});

test('accepts only PKCE codes and hashed email tokens in mobile callbacks', () => {
  assert.deepEqual(resolveMobileAuthCallback({ code: 'pkce-code' }), {
    code: 'pkce-code',
    type: 'pkce',
  });
  assert.deepEqual(resolveMobileAuthCallback({ tokenHash: 'hashed-email-token' }), {
    tokenHash: 'hashed-email-token',
    type: 'email_otp',
  });
  assert.throws(
    () =>
      resolveMobileAuthCallback({
        access_token: 'raw-access-token',
        refresh_token: 'raw-refresh-token',
      } as unknown as MobileAuthCallbackParameters),
    /authentication callback is incomplete/i,
  );
});

test('records mobile sign-out success only after Supabase signs out', async () => {
  const calls: string[] = [];
  const supabase = {
    auth: {
      getSession: async () => {
        calls.push('get-session');
        return { data: { session: { access_token: 'saved-access-token' } }, error: null };
      },
      signOut: async () => {
        calls.push('sign-out');
        return { error: null };
      },
    },
  } as unknown as SupabaseClient;

  await signOutWithAudit(supabase, async (accessToken, eventType) => {
    calls.push(`audit:${accessToken}:${eventType}`);
    return true;
  });

  assert.deepEqual(calls, [
    'get-session',
    'sign-out',
    'audit:saved-access-token:sign_out_succeeded',
  ]);
});

test('does not record mobile sign-out success when Supabase rejects sign-out', async () => {
  const calls: string[] = [];
  const signOutError = new Error('sign-out failed');
  const supabase = {
    auth: {
      getSession: async () => ({
        data: { session: { access_token: 'saved-access-token' } },
        error: null,
      }),
      signOut: async () => {
        calls.push('sign-out');
        return { error: signOutError };
      },
    },
  } as unknown as SupabaseClient;

  await assert.rejects(
    signOutWithAudit(supabase, async () => {
      calls.push('audit');
      return true;
    }),
    signOutError,
  );
  assert.deepEqual(calls, ['sign-out']);
});
