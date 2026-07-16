import assert from 'node:assert/strict';
import test from 'node:test';
import type { Factor, SupabaseClient } from '@supabase/supabase-js';

import {
  buildCitizenPhoneMfaPath,
  challengeCitizenPhoneFactor,
  enrollCitizenPhoneFactor,
  getCitizenPostPasswordDestination,
  getCitizenPhoneMfaState,
  verifyCitizenPhoneFactor,
} from '../lib/auth/phone-mfa';

const factor = (
  factorType: Factor['factor_type'],
  status: Factor['status'],
  id: string,
): Factor => ({
  created_at: '2026-07-16T10:00:00.000Z',
  factor_type: factorType,
  id,
  status,
  updated_at: '2026-07-16T10:00:00.000Z',
});

test('requires both a verified phone factor and current AAL2', async () => {
  const phoneFactor = factor('phone', 'verified', 'phone-factor');
  const supabase = {
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: 'aal2' },
          error: null,
        }),
        listFactors: async () => ({
          data: { all: [phoneFactor], phone: [phoneFactor], totp: [], webauthn: [] },
          error: null,
        }),
      },
    },
  } as unknown as SupabaseClient;

  assert.deepEqual(await getCitizenPhoneMfaState(supabase), { status: 'verified' });
});

test('does not accept a TOTP-only AAL2 session as citizen phone verification', async () => {
  const totpFactor = factor('totp', 'verified', 'totp-factor');
  const supabase = {
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: 'aal2' },
          error: null,
        }),
        listFactors: async () => ({
          data: { all: [totpFactor], phone: [], totp: [totpFactor], webauthn: [] },
          error: null,
        }),
      },
    },
  } as unknown as SupabaseClient;

  assert.deepEqual(await getCitizenPhoneMfaState(supabase), {
    status: 'enrollment-required',
  });
});

test('challenges an existing verified phone factor when the session is AAL1', async () => {
  const phoneFactor = factor('phone', 'verified', 'phone-factor');
  const supabase = {
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: 'aal1' },
          error: null,
        }),
        listFactors: async () => ({
          data: { all: [phoneFactor], phone: [phoneFactor], totp: [], webauthn: [] },
          error: null,
        }),
      },
    },
  } as unknown as SupabaseClient;

  assert.deepEqual(await getCitizenPhoneMfaState(supabase), {
    factorId: 'phone-factor',
    factorStatus: 'verified',
    status: 'challenge-required',
  });
});

test('enrolls an E.164 phone factor after cleaning stale unverified phone factors', async () => {
  const calls: unknown[] = [];
  const stalePhoneFactor = factor('phone', 'unverified', 'stale-factor');
  const supabase = {
    auth: {
      mfa: {
        enroll: async (input: unknown) => {
          calls.push({ enroll: input });
          return {
            data: { id: 'new-factor', phone: '+919876543210', type: 'phone' },
            error: null,
          };
        },
        listFactors: async () => ({
          data: { all: [stalePhoneFactor], phone: [], totp: [], webauthn: [] },
          error: null,
        }),
        unenroll: async (input: unknown) => {
          calls.push({ unenroll: input });
          return { data: { id: 'stale-factor' }, error: null };
        },
      },
    },
  } as unknown as SupabaseClient;

  assert.equal(await enrollCitizenPhoneFactor(supabase, '+91 (98765) 43210'), 'new-factor');
  assert.deepEqual(calls, [
    { unenroll: { factorId: 'stale-factor' } },
    {
      enroll: {
        factorType: 'phone',
        friendlyName: 'Local Wellness citizen phone',
        phone: '+919876543210',
      },
    },
  ]);
});

test('creates an SMS challenge for the selected phone factor', async () => {
  const calls: unknown[] = [];
  const supabase = {
    auth: {
      mfa: {
        challenge: async (input: unknown) => {
          calls.push(input);
          return { data: { id: 'challenge-id', type: 'phone' }, error: null };
        },
      },
    },
  } as unknown as SupabaseClient;

  assert.equal(await challengeCitizenPhoneFactor(supabase, 'factor-id'), 'challenge-id');
  assert.deepEqual(calls, [{ channel: 'sms', factorId: 'factor-id' }]);
});

test('verifies the phone challenge, confirms AAL2, and records the OTP audit', async () => {
  const calls: unknown[] = [];
  const phoneFactor = factor('phone', 'verified', 'factor-id');
  const supabase = {
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: 'aal2' },
          error: null,
        }),
        listFactors: async () => ({
          data: { all: [phoneFactor], phone: [phoneFactor], totp: [], webauthn: [] },
          error: null,
        }),
        verify: async (input: unknown) => {
          calls.push(input);
          return { data: { access_token: 'aal2-token' }, error: null };
        },
      },
    },
  } as unknown as SupabaseClient;

  await verifyCitizenPhoneFactor(
    supabase,
    'factor-id',
    'challenge-id',
    '123 456',
    async (accessToken, eventType) => {
      calls.push({ accessToken, eventType });
      return true;
    },
  );
  assert.deepEqual(calls, [
    { challengeId: 'challenge-id', code: '123456', factorId: 'factor-id' },
    { accessToken: 'aal2-token', eventType: 'otp_verified' },
  ]);
});

test('encodes only a safe local return path in the phone verification URL', () => {
  assert.equal(
    buildCitizenPhoneMfaPath('/account?tab=profile'),
    '/auth/verify-phone?next=%2Faccount%3Ftab%3Dprofile',
  );
  assert.equal(
    buildCitizenPhoneMfaPath('https://attacker.example'),
    '/auth/verify-phone?next=%2Faccount',
  );
});

test('stages phone MFA without blocking password access in observe mode', () => {
  assert.equal(getCitizenPostPasswordDestination('observe', '/account'), '/account');
  assert.equal(
    getCitizenPostPasswordDestination('enforce', '/account'),
    '/auth/verify-phone?next=%2Faccount',
  );
  assert.equal(
    getCitizenPostPasswordDestination('observe', 'https://attacker.example'),
    '/account',
  );
});
