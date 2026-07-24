import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  ApiError,
  AuthenticationRequiredError,
  getVerifiedCitizenSession,
} from '../lib/api/client';
import {
  decodeProfile,
  isProfileOnboardingComplete,
  isProfileSetupRequired,
} from '../lib/api/profile';
import {
  getCitizenAccountLabel,
  getCitizenPhoneVerificationStatus,
} from '../lib/auth/presentation';

const incompleteProfile = {
  avatarObjectPath: null,
  avatarUpdatedAt: null,
  createdAt: '2026-07-14T10:00:00.000Z',
  displayName: null,
  email: 'citizen@example.org',
  id: '5724bc1f-754f-4da7-89fa-03a76e950d68',
  onboardingCompletedAt: null,
  phone: null,
  preferredLanguage: 'en',
  status: 'active',
  updatedAt: '2026-07-14T10:00:00.000Z',
} as const;

test('loads the verified citizen identity with the server access token', async () => {
  const supabase = {
    auth: {
      getUser: async () => ({
        data: {
          user: {
            email: 'citizen@example.org',
            id: incompleteProfile.id,
            phone: '+919876543210',
            phone_confirmed_at: '2026-07-14T10:00:00.000Z',
          },
        },
        error: null,
      }),
      getSession: async () => ({
        data: { session: { access_token: 'verified-access-token' } },
        error: null,
      }),
    },
  } as unknown as SupabaseClient;

  assert.deepEqual(await getVerifiedCitizenSession(supabase), {
    accessToken: 'verified-access-token',
    identity: {
      email: 'citizen@example.org',
      phone: '+919876543210',
      userId: incompleteProfile.id,
    },
  });
});

test('rejects a stale session that has no authoritative user', async () => {
  const supabase = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
  } as unknown as SupabaseClient;

  await assert.rejects(getVerifiedCitizenSession(supabase), AuthenticationRequiredError);
});

test('decodes an incomplete profile into an explicit onboarding state', () => {
  const profile = decodeProfile(incompleteProfile);

  assert.equal(isProfileOnboardingComplete(profile), false);
  assert.equal(
    isProfileOnboardingComplete({
      ...profile,
      displayName: 'Asha Patil',
      onboardingCompletedAt: '2026-07-14T10:05:00.000Z',
    }),
    true,
  );
});

test('rejects missing profile data instead of allowing a blank account render', () => {
  assert.throws(
    () => decodeProfile(null),
    (error: unknown) => error instanceof ApiError && error.code === 'INVALID_RESPONSE',
  );
  assert.throws(
    () => decodeProfile({ ...incompleteProfile, preferredLanguage: 'unsupported' }),
    (error: unknown) => error instanceof ApiError && error.code === 'INVALID_RESPONSE',
  );
  assert.throws(
    () => decodeProfile({ ...incompleteProfile, avatarObjectPath: 42 }),
    (error: unknown) => error instanceof ApiError && error.code === 'INVALID_RESPONSE',
  );
});

test('classifies missing or unavailable profiles as account-provisioning states', () => {
  assert.equal(
    isProfileSetupRequired(
      new ApiError({
        code: 'PROFILE_NOT_FOUND',
        message: 'The account profile was not found.',
        status: 404,
      }),
    ),
    true,
  );
  assert.equal(
    isProfileSetupRequired(
      new ApiError({
        code: 'ACCOUNT_UNAVAILABLE',
        message: 'The account profile is unavailable.',
        status: 403,
      }),
    ),
    true,
  );
  assert.equal(
    isProfileSetupRequired(
      new ApiError({ code: 'NETWORK_ERROR', message: 'Network unavailable.', status: 0 }),
    ),
    false,
  );
});

test('presents the active account and confirmed phone state without trusting profile data', () => {
  assert.equal(
    getCitizenAccountLabel({ email: 'citizen@example.org', phone: '+919876543210' }),
    'citizen@example.org',
  );
  assert.deepEqual(
    getCitizenPhoneVerificationStatus(
      {
        phone: '+919876543210',
        status: 'verified',
        userId: incompleteProfile.id,
      },
      true,
    ),
    {
      detail: 'This account has a confirmed phone number.',
      label: 'Phone confirmed',
      needsAction: false,
    },
  );
  assert.deepEqual(
    getCitizenPhoneVerificationStatus(
      { status: 'phone-required', userId: incompleteProfile.id },
      false,
    ),
    {
      detail: 'Phone verification is optional during the current rollout.',
      label: 'Not verified',
      needsAction: true,
    },
  );
});
