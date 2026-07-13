import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupportedEmailOtpType } from '../lib/auth/callback';
import { AuthInputError, normalizeEmail, normalizeOtp, normalizePhone } from '../lib/auth/input';
import { getSafeReturnPath } from '../lib/auth/return-path';
import { requestCitizenOtp, signOutCitizenSession } from '../lib/auth/service';

test('accepts local return paths and rejects cross-origin redirects', () => {
  assert.equal(getSafeReturnPath('/account?tab=profile', '/account'), '/account?tab=profile');
  assert.equal(getSafeReturnPath('//attacker.example/path', '/account'), '/account');
  assert.equal(getSafeReturnPath('https://attacker.example/path', '/account'), '/account');
});

test('normalizes citizen OTP identifiers', () => {
  assert.equal(normalizeEmail(' Citizen@Example.ORG '), 'citizen@example.org');
  assert.equal(normalizePhone('+91 (98765) 43210'), '+919876543210');
  assert.equal(normalizeOtp('123 456'), '123456');
  assert.throws(() => normalizePhone('9876543210'), AuthInputError);
});

test('allows only sign-in-safe email callback types', () => {
  assert.equal(getSupportedEmailOtpType('magiclink'), 'magiclink');
  assert.equal(getSupportedEmailOtpType('invite'), null);
  assert.equal(getSupportedEmailOtpType('recovery'), null);
  assert.equal(getSupportedEmailOtpType(null), null);
});

test('requests phone OTP through Supabase with a normalized E.164 number', async () => {
  const requests: unknown[] = [];
  const supabase = {
    auth: {
      signInWithOtp: async (request: unknown) => {
        requests.push(request);
        return { data: {}, error: null };
      },
    },
  } as unknown as SupabaseClient;

  const phone = await requestCitizenOtp(
    supabase,
    'phone',
    '+91 (98765) 43210',
    'https://citizen.example/auth/callback',
  );

  assert.equal(phone, '+919876543210');
  assert.deepEqual(requests, [{ phone: '+919876543210' }]);
});

test('records citizen sign-out success only after Supabase signs out', async () => {
  const calls: string[] = [];
  const supabase = {
    auth: {
      getSession: async () => ({
        data: { session: { access_token: 'saved-access-token' } },
        error: null,
      }),
      signOut: async () => {
        calls.push('sign-out');
        return { error: null };
      },
    },
  } as unknown as SupabaseClient;

  await signOutCitizenSession(supabase, async (accessToken, eventType) => {
    calls.push(`audit:${accessToken}:${eventType}`);
    return true;
  });

  assert.deepEqual(calls, ['sign-out', 'audit:saved-access-token:sign_out_succeeded']);
});

test('does not record citizen sign-out success when Supabase rejects sign-out', async () => {
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
    signOutCitizenSession(supabase, async () => {
      calls.push('audit');
      return true;
    }),
    signOutError,
  );
  assert.deepEqual(calls, ['sign-out']);
});
