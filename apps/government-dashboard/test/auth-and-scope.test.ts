import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  getScopeTypeLabel,
  hasGovernmentAccess,
  type GovernmentAccessScope,
} from '../lib/api/access-scope';
import {
  completeEmailAuthCallback,
  getGovernmentEmailCallbackUrl,
  getSupportedEmailOtpType,
  resolveEmailAuthCallback,
} from '../lib/auth/callback';
import { EmailInputError, normalizeEmail, normalizeOtp, OtpInputError } from '../lib/auth/input';
import { getSafeReturnPath } from '../lib/auth/return-path';
import {
  requestGovernmentOtp,
  signOutGovernmentSession,
  verifyGovernmentOtp,
} from '../lib/auth/service';
import { isPublicAuthRoute } from '../proxy';

test('normalizes official email addresses without revealing invitation state', () => {
  assert.equal(normalizeEmail(' Officer@Municipality.GOV.IN '), 'officer@municipality.gov.in');
  assert.equal(normalizeOtp('123 456'), '123456');
  assert.throws(() => normalizeEmail('not-an-email'), EmailInputError);
  assert.throws(() => normalizeOtp('12345'), OtpInputError);
});

test('constrains callback types and return paths', () => {
  assert.equal(getSupportedEmailOtpType('invite'), 'invite');
  assert.equal(getSupportedEmailOtpType('recovery'), null);
  assert.equal(getSafeReturnPath('/?queue=new', '/'), '/?queue=new');
  assert.equal(getSafeReturnPath('//attacker.example', '/'), '/');
});

test('uses the exact queryless government callback URL for managed Auth allow-lists', () => {
  assert.equal(
    getGovernmentEmailCallbackUrl('http://localhost:3003'),
    'http://localhost:3003/auth/callback',
  );
  assert.equal(new URL(getGovernmentEmailCallbackUrl('https://government.example.org')).search, '');
});

test('accepts a one-time PKCE callback and rejects ambiguous government links', async () => {
  assert.deepEqual(
    resolveEmailAuthCallback('https://government.example.org/auth/callback?code=pkce-code'),
    { code: 'pkce-code', method: 'pkce' },
  );
  assert.throws(() =>
    resolveEmailAuthCallback(
      'https://government.example.org/auth/callback?code=pkce&token_hash=hash&type=email',
    ),
  );

  const calls: unknown[] = [];
  const supabase = {
    auth: {
      exchangeCodeForSession: async (code: string) => {
        calls.push(code);
        return {
          data: { session: { access_token: 'government-access-token' } },
          error: null,
        };
      },
      setSession: async () => {
        throw new Error('Implicit session must not run for PKCE.');
      },
      verifyOtp: async () => {
        throw new Error('OTP verification must not run for PKCE.');
      },
    },
  } as unknown as SupabaseClient;

  assert.equal(
    await completeEmailAuthCallback(
      supabase,
      'https://government.example.org/auth/callback?code=pkce-code',
    ),
    'government-access-token',
  );
  assert.deepEqual(calls, ['pkce-code']);
});

test('accepts only a complete default fragment session for a government invitation', async () => {
  assert.deepEqual(
    resolveEmailAuthCallback(
      'https://government.example.org/auth/callback#access_token=access&refresh_token=refresh&type=invite',
    ),
    {
      accessToken: 'access',
      method: 'implicit',
      refreshToken: 'refresh',
      type: 'invite',
    },
  );
  assert.throws(() =>
    resolveEmailAuthCallback(
      'https://government.example.org/auth/callback#access_token=access&refresh_token=refresh&type=magiclink',
    ),
  );
  assert.throws(() =>
    resolveEmailAuthCallback(
      'https://government.example.org/auth/callback#access_token=access&type=invite',
    ),
  );

  const sessions: unknown[] = [];
  const supabase = {
    auth: {
      exchangeCodeForSession: async () => {
        throw new Error('PKCE must not run for an invitation fragment.');
      },
      setSession: async (session: unknown) => {
        sessions.push(session);
        return {
          data: { session: { access_token: 'government-access-token' } },
          error: null,
        };
      },
      verifyOtp: async () => {
        throw new Error('Token hash verification must not run for an invitation fragment.');
      },
    },
  } as unknown as SupabaseClient;

  assert.equal(
    await completeEmailAuthCallback(
      supabase,
      'https://government.example.org/auth/callback#access_token=access&refresh_token=refresh&type=invite',
    ),
    'government-access-token',
  );
  assert.deepEqual(sessions, [{ access_token: 'access', refresh_token: 'refresh' }]);
});

test('requests a government email code without creating an account', async () => {
  const requests: unknown[] = [];
  const supabase = {
    auth: {
      signInWithOtp: async (request: unknown) => {
        requests.push(request);
        return { data: {}, error: null };
      },
    },
  } as unknown as SupabaseClient;

  const email = await requestGovernmentOtp(
    supabase,
    ' Officer@Municipality.GOV.IN ',
    'https://government.example.org/auth/callback',
  );

  assert.equal(email, 'officer@municipality.gov.in');
  assert.deepEqual(requests, [
    {
      email: 'officer@municipality.gov.in',
      options: {
        emailRedirectTo: 'https://government.example.org/auth/callback',
        shouldCreateUser: false,
      },
    },
  ]);
});

test('verifies a government email code and records successful OTP verification', async () => {
  const calls: unknown[] = [];
  const supabase = {
    auth: {
      verifyOtp: async (request: unknown) => {
        calls.push(request);
        return {
          data: { session: { access_token: 'government-access-token' } },
          error: null,
        };
      },
    },
  } as unknown as SupabaseClient;

  await verifyGovernmentOtp(
    supabase,
    ' Officer@Municipality.GOV.IN ',
    '123 456',
    async (...audit) => {
      calls.push(audit);
      return true;
    },
  );

  assert.deepEqual(calls, [
    { email: 'officer@municipality.gov.in', token: '123456', type: 'email' },
    ['government-access-token', 'otp_verified'],
  ]);
});

test('exempts only the exact authentication route segment from session protection', () => {
  assert.equal(isPublicAuthRoute('/auth'), true);
  assert.equal(isPublicAuthRoute('/auth/login'), true);
  assert.equal(isPublicAuthRoute('/auth/callback'), true);
  assert.equal(isPublicAuthRoute('/authority'), false);
  assert.equal(isPublicAuthRoute('/authentication'), false);
});

test('shows dashboard access only when the API returns an active role', () => {
  const noAccess: GovernmentAccessScope = { authorities: [], roles: [] };
  assert.equal(hasGovernmentAccess(noAccess), false);
  assert.equal(
    hasGovernmentAccess({
      authorities: [],
      roles: [
        {
          assignmentId: 'assignment-id',
          authorityId: null,
          code: 'platform_admin',
          description: null,
          effectiveFrom: '2026-07-13T00:00:00.000Z',
          effectiveUntil: null,
          isGovernment: false,
          isPrivileged: true,
          name: 'Platform administrator',
          roleId: 'role-id',
          scopeId: null,
          scopeType: 'global',
        },
      ],
    }),
    true,
  );
  assert.equal(getScopeTypeLabel('ward'), 'Ward');
});

test('records government sign-out success only after Supabase signs out', async () => {
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

  await signOutGovernmentSession(supabase, async (accessToken, eventType) => {
    calls.push(`audit:${accessToken}:${eventType}`);
    return true;
  });

  assert.deepEqual(calls, ['sign-out', 'audit:saved-access-token:sign_out_succeeded']);
});
