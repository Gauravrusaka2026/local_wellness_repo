import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  buildMfaPath,
  cleanupTotpFactor,
  enrollTotpFactor,
  getMfaError,
  getMfaFlowState,
  MfaCodeInputError,
  normalizeMfaCode,
  verifyTotpFactor,
} from '../lib/auth/mfa';
import { getSafeMfaReturnPath } from '../lib/auth/return-path';

const asSupabaseClient = (mfa: Record<string, unknown>): SupabaseClient =>
  ({ auth: { mfa } }) as unknown as SupabaseClient;

test('accepts only six-digit authenticator codes and strict non-auth return paths', () => {
  assert.equal(normalizeMfaCode('123 456'), '123456');
  assert.throws(() => normalizeMfaCode('12345'), MfaCodeInputError);
  assert.throws(() => normalizeMfaCode('12345a'), MfaCodeInputError);
  assert.equal(getSafeMfaReturnPath('/audit?filter=open#active', '/'), '/audit?filter=open#active');
  assert.equal(getSafeMfaReturnPath('//attacker.example/path', '/'), '/');
  assert.equal(getSafeMfaReturnPath('https://attacker.example/path', '/'), '/');
  assert.equal(getSafeMfaReturnPath('/auth/mfa?next=/audit', '/'), '/');
  assert.equal(getSafeMfaReturnPath('/auth/login', '/'), '/');
  assert.equal(buildMfaPath('/audit?filter=open'), '/auth/mfa?next=%2Faudit%3Ffilter%3Dopen');
});

test('passes an existing AAL2 session through without listing factors', async () => {
  let listCalls = 0;
  const supabase = asSupabaseClient({
    getAuthenticatorAssuranceLevel: async () => ({
      data: { currentAuthenticationMethods: [], currentLevel: 'aal2', nextLevel: 'aal2' },
      error: null,
    }),
    listFactors: async () => {
      listCalls += 1;
      return { data: null, error: null };
    },
  });

  assert.deepEqual(await getMfaFlowState(supabase), { status: 'verified' });
  assert.equal(listCalls, 0);
});

test('requires enrollment when AAL1 has no verified TOTP factor', async () => {
  const supabase = asSupabaseClient({
    getAuthenticatorAssuranceLevel: async () => ({
      data: { currentAuthenticationMethods: [], currentLevel: 'aal1', nextLevel: 'aal1' },
      error: null,
    }),
    listFactors: async () => ({
      data: { all: [], phone: [], totp: [], webauthn: [] },
      error: null,
    }),
  });

  assert.deepEqual(await getMfaFlowState(supabase), { status: 'enrollment-required' });
});

test('returns the oldest verified TOTP factor for an AAL1 challenge', async () => {
  const factors = [
    {
      created_at: '2026-07-16T10:00:00.000Z',
      factor_type: 'totp',
      id: 'factor-new',
      status: 'verified',
      updated_at: '2026-07-16T10:00:00.000Z',
    },
    {
      created_at: '2026-07-15T10:00:00.000Z',
      factor_type: 'totp',
      id: 'factor-old',
      status: 'verified',
      updated_at: '2026-07-15T10:00:00.000Z',
    },
  ];
  const supabase = asSupabaseClient({
    getAuthenticatorAssuranceLevel: async () => ({
      data: { currentAuthenticationMethods: [], currentLevel: 'aal1', nextLevel: 'aal2' },
      error: null,
    }),
    listFactors: async () => ({
      data: { all: factors, phone: [], totp: factors, webauthn: [] },
      error: null,
    }),
  });

  assert.deepEqual(await getMfaFlowState(supabase), {
    factorId: 'factor-old',
    status: 'challenge',
  });
});

test('enrolls and can clean up only the exact TOTP factor created by this flow', async () => {
  const calls: unknown[] = [];
  const supabase = asSupabaseClient({
    enroll: async (request: unknown) => {
      calls.push(request);
      return {
        data: {
          id: 'new-factor',
          totp: {
            qr_code: '<svg><path /></svg>',
            secret: 'setup-key',
            uri: 'otpauth://totp/private',
          },
          type: 'totp',
        },
        error: null,
      };
    },
    unenroll: async (request: unknown) => {
      calls.push(request);
      return { data: { id: 'new-factor' }, error: null };
    },
  });

  const enrollment = await enrollTotpFactor(supabase);
  assert.deepEqual(calls[0], {
    factorType: 'totp',
    friendlyName: 'Local Wellness admin console',
  });
  assert.equal(enrollment.factorId, 'new-factor');
  assert.equal(enrollment.secret, 'setup-key');
  assert.match(enrollment.qrCodeSource, /^data:image\/svg\+xml;utf-8,/u);
  await cleanupTotpFactor(supabase, enrollment.factorId);
  assert.deepEqual(calls[1], { factorId: 'new-factor' });
});

test('verifies a challenge only after valid input and confirmed AAL2', async () => {
  const challenges: unknown[] = [];
  const supabase = asSupabaseClient({
    challengeAndVerify: async (request: unknown) => {
      challenges.push(request);
      return { data: { access_token: 'aal2-access-token' }, error: null };
    },
    getAuthenticatorAssuranceLevel: async () => ({
      data: { currentAuthenticationMethods: [], currentLevel: 'aal2', nextLevel: 'aal2' },
      error: null,
    }),
  });

  await verifyTotpFactor(supabase, 'verified-factor', '123 456');
  assert.deepEqual(challenges, [{ code: '123456', factorId: 'verified-factor' }]);

  await assert.rejects(verifyTotpFactor(supabase, 'verified-factor', '12345'), MfaCodeInputError);
  assert.equal(challenges.length, 1);
  assert.equal(
    getMfaError(new Error('Challenge expired for internal factor identifier')),
    'The authenticator code is invalid or expired.',
  );
});

test('fails closed on null assurance, factor, enrollment, and challenge data', async () => {
  await assert.rejects(
    getMfaFlowState(
      asSupabaseClient({
        getAuthenticatorAssuranceLevel: async () => ({ data: null, error: null }),
      }),
    ),
    /assurance level is unavailable/u,
  );

  await assert.rejects(
    getMfaFlowState(
      asSupabaseClient({
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentAuthenticationMethods: [], currentLevel: 'aal1', nextLevel: 'aal1' },
          error: null,
        }),
        listFactors: async () => ({ data: null, error: null }),
      }),
    ),
    /factors are unavailable/u,
  );

  await assert.rejects(
    enrollTotpFactor(asSupabaseClient({ enroll: async () => ({ data: null, error: null }) })),
    /enrollment data is unavailable/u,
  );

  await assert.rejects(
    verifyTotpFactor(
      asSupabaseClient({
        challengeAndVerify: async () => ({ data: null, error: null }),
      }),
      'factor-id',
      '123456',
    ),
    /did not establish an AAL2 session/u,
  );
});
