import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  completeEmailAuthCallback,
  getSupportedEmailOtpType,
  resolveEmailAuthCallback,
} from '../lib/auth/callback';
import {
  AuthInputError,
  normalizeEmail,
  normalizeOtp,
  normalizePassword,
  normalizePhone,
} from '../lib/auth/input';
import { getSafeReturnPath } from '../lib/auth/return-path';
import { parseCitizenPhoneMfaMode } from '../lib/environment';
import {
  createCitizenPasswordAccount,
  EmailConfirmationRequiredError,
  establishCitizenPasswordRecoverySession,
  requestCitizenPasswordReset,
  signInCitizenWithPassword,
  signOutCitizenSession,
  updateCitizenPassword,
} from '../lib/auth/service';

test('accepts local return paths and rejects cross-origin redirects', () => {
  assert.equal(getSafeReturnPath('/account?tab=profile', '/account'), '/account?tab=profile');
  assert.equal(getSafeReturnPath('//attacker.example/path', '/account'), '/account');
  assert.equal(getSafeReturnPath('https://attacker.example/path', '/account'), '/account');
});

test('defaults citizen Phone MFA to observe and validates explicit rollout modes', () => {
  assert.equal(parseCitizenPhoneMfaMode(undefined), 'observe');
  assert.equal(parseCitizenPhoneMfaMode(''), 'observe');
  assert.equal(parseCitizenPhoneMfaMode('observe'), 'observe');
  assert.equal(parseCitizenPhoneMfaMode('enforce'), 'enforce');
  assert.throws(() => parseCitizenPhoneMfaMode('disabled'));
});

test('normalizes citizen authentication inputs', () => {
  assert.equal(normalizeEmail(' Citizen@Example.ORG '), 'citizen@example.org');
  assert.equal(normalizePhone('+91 (98765) 43210'), '+919876543210');
  assert.equal(normalizeOtp('123 456'), '123456');
  assert.equal(normalizePassword('secure password'), 'secure password');
  assert.throws(() => normalizePhone('9876543210'), AuthInputError);
  assert.throws(() => normalizePassword('short'), AuthInputError);
});

test('allows only sign-in-safe legacy email callback types', () => {
  assert.equal(getSupportedEmailOtpType('magiclink'), 'magiclink');
  assert.equal(getSupportedEmailOtpType('invite'), null);
  assert.equal(getSupportedEmailOtpType('recovery'), null);
  assert.equal(getSupportedEmailOtpType(null), null);
});

test('accepts PKCE and reviewed token hashes while rejecting fragment sessions', () => {
  assert.deepEqual(resolveEmailAuthCallback('https://citizen.example/auth/callback?code=pkce'), {
    code: 'pkce',
    method: 'pkce',
  });
  assert.deepEqual(
    resolveEmailAuthCallback('https://citizen.example/auth/callback?token_hash=hashed&type=signup'),
    { method: 'token_hash', tokenHash: 'hashed', type: 'signup' },
  );
  assert.throws(() =>
    resolveEmailAuthCallback(
      'https://citizen.example/auth/callback#access_token=access&refresh_token=refresh',
    ),
  );
  assert.throws(() =>
    resolveEmailAuthCallback(
      'https://citizen.example/auth/callback?code=one&code=two#access_token=a&refresh_token=r',
    ),
  );
});

test('exchanges a legacy PKCE link and requires a verified session', async () => {
  const calls: unknown[] = [];
  const supabase = {
    auth: {
      exchangeCodeForSession: async (code: string) => {
        calls.push(code);
        return { data: { session: { access_token: 'verified-access-token' } }, error: null };
      },
      verifyOtp: async () => {
        throw new Error('OTP verification must not run for a PKCE callback.');
      },
    },
  } as unknown as SupabaseClient;

  assert.equal(
    await completeEmailAuthCallback(
      supabase,
      'https://citizen.example/auth/callback?code=pkce-code',
    ),
    'verified-access-token',
  );
  assert.deepEqual(calls, ['pkce-code']);
});

test('creates a citizen with normalized email and password then records sign-in', async () => {
  const calls: unknown[] = [];
  const supabase = {
    auth: {
      signUp: async (input: unknown) => {
        calls.push(input);
        return { data: { session: { access_token: 'new-token' } }, error: null };
      },
    },
  } as unknown as SupabaseClient;

  await createCitizenPasswordAccount(
    supabase,
    ' Citizen@Example.ORG ',
    'secure password',
    async (accessToken, eventType) => {
      calls.push({ accessToken, eventType });
      return true;
    },
  );

  assert.deepEqual(calls, [
    { email: 'citizen@example.org', password: 'secure password' },
    { accessToken: 'new-token', eventType: 'sign_in_succeeded' },
  ]);
});

test('fails account creation clearly when Supabase still requires email confirmation', async () => {
  const supabase = {
    auth: {
      signUp: async () => ({ data: { session: null }, error: null }),
    },
  } as unknown as SupabaseClient;

  await assert.rejects(
    createCitizenPasswordAccount(supabase, 'citizen@example.org', 'secure password'),
    EmailConfirmationRequiredError,
  );
});

test('signs in with email and password and requires a real session', async () => {
  const calls: unknown[] = [];
  const supabase = {
    auth: {
      signInWithPassword: async (input: unknown) => {
        calls.push(input);
        return { data: { session: { access_token: 'access-token' } }, error: null };
      },
    },
  } as unknown as SupabaseClient;

  await signInCitizenWithPassword(
    supabase,
    'Citizen@Example.ORG',
    'secure password',
    async (accessToken, eventType) => {
      calls.push({ accessToken, eventType });
      return true;
    },
  );

  assert.deepEqual(calls, [
    { email: 'citizen@example.org', password: 'secure password' },
    { accessToken: 'access-token', eventType: 'sign_in_succeeded' },
  ]);
});

test('requests a non-enumerating password recovery redirect', async () => {
  const calls: unknown[] = [];
  const supabase = {
    auth: {
      resetPasswordForEmail: async (email: string, options: unknown) => {
        calls.push({ email, options });
        return { data: {}, error: null };
      },
    },
  } as unknown as SupabaseClient;

  await requestCitizenPasswordReset(
    supabase,
    ' Citizen@Example.ORG ',
    'https://citizen.example/auth/reset-password',
  );
  assert.deepEqual(calls, [
    {
      email: 'citizen@example.org',
      options: { redirectTo: 'https://citizen.example/auth/reset-password' },
    },
  ]);
});

test('establishes password recovery only from PKCE or a recovery token hash', async () => {
  const calls: unknown[] = [];
  const supabase = {
    auth: {
      exchangeCodeForSession: async (code: string) => {
        calls.push({ code });
        return { data: { session: { access_token: 'recovery-token' } }, error: null };
      },
      verifyOtp: async (input: unknown) => {
        calls.push(input);
        return { data: { session: { access_token: 'recovery-token' } }, error: null };
      },
    },
  } as unknown as SupabaseClient;

  await establishCitizenPasswordRecoverySession(
    supabase,
    'https://citizen.example/auth/reset-password?code=pkce',
  );
  await establishCitizenPasswordRecoverySession(
    supabase,
    'https://citizen.example/auth/reset-password?token_hash=hashed&type=recovery',
  );
  await assert.rejects(
    establishCitizenPasswordRecoverySession(
      supabase,
      'https://citizen.example/auth/reset-password#access_token=unsafe',
    ),
  );
  await assert.rejects(
    establishCitizenPasswordRecoverySession(
      supabase,
      'https://citizen.example/auth/reset-password?code=one&token_hash=two&type=recovery',
    ),
  );

  assert.deepEqual(calls, [{ code: 'pkce' }, { token_hash: 'hashed', type: 'recovery' }]);
});

test('updates the password and globally revokes prior sessions', async () => {
  const calls: unknown[] = [];
  const supabase = {
    auth: {
      signOut: async (input: unknown) => {
        calls.push(input);
        return { error: null };
      },
      updateUser: async (input: unknown) => {
        calls.push(input);
        return { data: {}, error: null };
      },
    },
  } as unknown as SupabaseClient;

  await updateCitizenPassword(supabase, 'new secure password');
  assert.deepEqual(calls, [{ password: 'new secure password' }, { scope: 'global' }]);
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
