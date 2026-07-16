import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  AuthInputError,
  normalizeEmail,
  normalizeOtp,
  normalizePhone,
} from '../src/auth/auth-input';
import {
  completeMobileAuthCallback,
  resolveMobileAuthCallback,
  type MobileAuthCallbackParameters,
} from '../src/auth/callback';
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

test('accepts only unambiguous PKCE codes and reviewed hashed email tokens', () => {
  assert.deepEqual(resolveMobileAuthCallback({ code: 'pkce-code' }), {
    code: 'pkce-code',
    method: 'pkce',
  });
  assert.deepEqual(
    resolveMobileAuthCallback({ tokenHash: 'hashed-email-token', type: 'magiclink' }),
    {
      method: 'token_hash',
      tokenHash: 'hashed-email-token',
      type: 'magiclink',
    },
  );
  assert.throws(() => resolveMobileAuthCallback({ tokenHash: 'hashed-email-token' }));
  assert.throws(() =>
    resolveMobileAuthCallback({ tokenHash: 'hashed-email-token', type: 'recovery' }),
  );
  assert.throws(() =>
    resolveMobileAuthCallback({
      code: 'pkce-code',
      tokenHash: 'hashed-email-token',
      type: 'email',
    }),
  );
  assert.throws(() => resolveMobileAuthCallback({ code: ['one', 'two'] }));
  assert.throws(() => resolveMobileAuthCallback({ code: 'pkce-code', error: 'access_denied' }));
  assert.throws(() =>
    resolveMobileAuthCallback({ code: 'pkce-code', errorDescription: 'Link expired' }),
  );
  assert.throws(
    () =>
      resolveMobileAuthCallback({
        access_token: 'raw-access-token',
        refresh_token: 'raw-refresh-token',
      } as unknown as MobileAuthCallbackParameters),
    /authentication callback is invalid/i,
  );
});

test('exchanges a mobile PKCE callback once and records only the verified session', async () => {
  const calls: unknown[] = [];
  const supabase = {
    auth: {
      exchangeCodeForSession: async (code: string) => {
        calls.push(['exchange', code]);
        return { data: { session: { access_token: 'verified-access-token' } }, error: null };
      },
      setSession: async () => {
        throw new Error('Raw fragment sessions are not accepted on mobile.');
      },
      verifyOtp: async () => {
        throw new Error('Token hash verification must not run for PKCE.');
      },
    },
  } as unknown as SupabaseClient;

  await completeMobileAuthCallback(supabase, { code: 'pkce-code' }, async (...audit) => {
    calls.push(['audit', ...audit]);
    return true;
  });

  assert.deepEqual(calls, [
    ['exchange', 'pkce-code'],
    ['audit', 'verified-access-token', 'sign_in_succeeded'],
  ]);
});

test('passes the reviewed mobile token-hash type and requires a returned session', async () => {
  const calls: unknown[] = [];
  const supabase = {
    auth: {
      exchangeCodeForSession: async () => {
        throw new Error('PKCE must not run for a token hash.');
      },
      setSession: async () => {
        throw new Error('Raw fragment sessions are not accepted on mobile.');
      },
      verifyOtp: async (request: unknown) => {
        calls.push(request);
        return { data: { session: null }, error: null };
      },
    },
  } as unknown as SupabaseClient;

  await assert.rejects(
    completeMobileAuthCallback(
      supabase,
      { tokenHash: 'hashed-email-token', type: 'signup' },
      async () => {
        calls.push('audit');
        return true;
      },
    ),
    /authentication callback is invalid/i,
  );
  assert.deepEqual(calls, [
    {
      token_hash: 'hashed-email-token',
      type: 'signup',
    },
  ]);
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
