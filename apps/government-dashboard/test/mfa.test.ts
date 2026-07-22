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

  assert.equal(
    getSafeMfaReturnPath('/complaints?queue=new#active', '/'),
    '/complaints?queue=new#active',
  );
  assert.equal(getSafeMfaReturnPath('//attacker.example/path', '/'), '/');
  assert.equal(getSafeMfaReturnPath('https://attacker.example/path', '/'), '/');
  assert.equal(getSafeMfaReturnPath('/auth/mfa?next=/complaints', '/'), '/');
  assert.equal(getSafeMfaReturnPath('/auth/login', '/'), '/');
  assert.equal(buildMfaPath('/complaints?queue=new'), '/auth/mfa?next=%2Fcomplaints%3Fqueue%3Dnew');
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

test('offers recovery only for this dashboard unfinished TOTP factors', async () => {
  const factors = [
    {
      created_at: '2026-07-18T07:00:00.000Z',
      factor_type: 'totp',
      friendly_name: 'Local Wellness government dashboard',
      id: 'recoverable-factor-old',
      status: 'unverified',
      updated_at: '2026-07-18T07:00:00.000Z',
    },
    {
      created_at: '2026-07-18T08:00:00.000Z',
      factor_type: 'totp',
      friendly_name: 'Another application',
      id: 'other-factor',
      status: 'unverified',
      updated_at: '2026-07-18T08:00:00.000Z',
    },
    {
      created_at: '2026-07-18T09:00:00.000Z',
      factor_type: 'totp',
      friendly_name: 'Local Wellness government dashboard',
      id: 'recoverable-factor',
      status: 'unverified',
      updated_at: '2026-07-18T09:00:00.000Z',
    },
  ];
  const supabase = asSupabaseClient({
    getAuthenticatorAssuranceLevel: async () => ({
      data: { currentAuthenticationMethods: [], currentLevel: 'aal1', nextLevel: 'aal2' },
      error: null,
    }),
    listFactors: async () => ({
      data: { all: factors, phone: [], totp: [], webauthn: [] },
      error: null,
    }),
  });

  assert.deepEqual(await getMfaFlowState(supabase), {
    factorIds: ['recoverable-factor-old', 'recoverable-factor'],
    status: 'enrollment-recovery',
  });
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

test('enrolls a TOTP factor without persisting its setup material', async () => {
  const enrollmentRequests: unknown[] = [];
  const supabase = asSupabaseClient({
    enroll: async (request: unknown) => {
      enrollmentRequests.push(request);
      return {
        data: {
          id: 'new-factor',
          totp: {
            qr_code: 'data:image/svg+xml;utf-8,<svg><path /></svg>\n',
            secret: 'setup-key',
            uri: 'otpauth://totp/private',
          },
          type: 'totp',
        },
        error: null,
      };
    },
  });

  const enrollment = await enrollTotpFactor(supabase);

  assert.deepEqual(enrollmentRequests, [
    {
      factorType: 'totp',
      friendlyName: 'Local Wellness government dashboard',
    },
  ]);
  assert.equal(enrollment.factorId, 'new-factor');
  assert.equal(enrollment.secret, 'setup-key');
  assert.match(enrollment.qrCodeSource, /^data:image\/svg\+xml;utf-8,/u);
  assert.doesNotMatch(enrollment.qrCodeSource, /\s$/u);
});

test('verifies a valid TOTP challenge only after confirming the AAL2 session', async () => {
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
});

test('rejects an invalid code before starting a challenge and maps provider rejection safely', async () => {
  let challengeCalls = 0;
  const supabase = asSupabaseClient({
    challengeAndVerify: async () => {
      challengeCalls += 1;
      return { data: null, error: null };
    },
  });

  await assert.rejects(verifyTotpFactor(supabase, 'verified-factor', '12345'), MfaCodeInputError);
  assert.equal(challengeCalls, 0);
  assert.equal(
    getMfaError(new Error('Challenge expired for internal factor identifier')),
    'The authenticator code is invalid or expired.',
  );
  assert.equal(
    getMfaError(
      Object.assign(new Error('A factor with this name already exists'), {
        code: 'mfa_factor_name_conflict',
      }),
    ),
    'An earlier authenticator setup is unfinished. Reload this page and restart setup.',
  );
  assert.equal(
    getMfaError(
      Object.assign(new Error('TOTP enroll not enabled'), {
        code: 'mfa_totp_enroll_not_enabled',
      }),
    ),
    'Authenticator setup is not enabled for this environment. Contact the platform administrator.',
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

test('cleans up only the exact abandoned factor created by this flow', async () => {
  const removals: unknown[] = [];
  const supabase = asSupabaseClient({
    unenroll: async (request: unknown) => {
      removals.push(request);
      return { data: { id: 'abandoned-factor' }, error: null };
    },
  });

  await cleanupTotpFactor(supabase, 'abandoned-factor');
  assert.deepEqual(removals, [{ factorId: 'abandoned-factor' }]);
});
