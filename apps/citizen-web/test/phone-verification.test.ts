import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient, User } from '@supabase/supabase-js';

import {
  beginCitizenPhoneVerification,
  buildCitizenPhoneVerificationPath,
  getCitizenPhoneVerificationState,
  getCitizenPostPasswordDestination,
  resendCitizenPhoneVerificationCode,
  verifyCitizenPhoneVerification,
} from '../lib/auth/phone-verification';

const user = (overrides: Partial<User> = {}): User =>
  ({
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2026-07-16T10:00:00.000Z',
    id: 'citizen-user-id',
    user_metadata: {},
    ...overrides,
  }) as User;

test('uses authoritative auth.users phone confirmation state without an assurance-level check', async () => {
  const confirmedUser = user({
    phone: '919876543210',
    phone_confirmed_at: '2026-07-16T10:01:00.000Z',
  });
  const supabase = {
    auth: {
      getUser: async () => ({ data: { user: confirmedUser }, error: null }),
    },
  } as unknown as SupabaseClient;

  assert.deepEqual(await getCitizenPhoneVerificationState(supabase), {
    phone: '+919876543210',
    status: 'verified',
    userId: confirmedUser.id,
  });
});

test('exposes a pending phone-change verification after a page reload', async () => {
  const pendingUser = user({ new_phone: '+919876543210' });
  const supabase = {
    auth: {
      getUser: async () => ({ data: { user: pendingUser }, error: null }),
    },
  } as unknown as SupabaseClient;

  assert.deepEqual(await getCitizenPhoneVerificationState(supabase), {
    phone: '+919876543210',
    status: 'verification-required',
    userId: pendingUser.id,
  });
});

test('requires a phone when the signed-in user has no pending or confirmed number', async () => {
  const currentUser = user();
  const supabase = {
    auth: {
      getUser: async () => ({ data: { user: currentUser }, error: null }),
    },
  } as unknown as SupabaseClient;

  assert.deepEqual(await getCitizenPhoneVerificationState(supabase), {
    status: 'phone-required',
    userId: currentUser.id,
  });
});

test('starts ordinary phone-change verification with a normalized phone and stable user', async () => {
  const calls: unknown[] = [];
  const initialUser = user();
  const pendingUser = user({ new_phone: '+919876543210' });
  let getUserCall = 0;
  const supabase = {
    auth: {
      getUser: async () => {
        getUserCall += 1;
        calls.push({ getUser: getUserCall });
        return {
          data: { user: getUserCall === 1 ? initialUser : pendingUser },
          error: null,
        };
      },
      updateUser: async (input: unknown) => {
        calls.push({ updateUser: input });
        return { data: { user: pendingUser }, error: null };
      },
    },
  } as unknown as SupabaseClient;

  assert.deepEqual(await beginCitizenPhoneVerification(supabase, '+91 (98765) 43210'), {
    phone: '+919876543210',
    userId: initialUser.id,
  });
  assert.deepEqual(calls, [
    { getUser: 1 },
    { updateUser: { phone: '+919876543210' } },
    { getUser: 2 },
  ]);
});

test('resends a phone-change code only for the initiating user and pending phone', async () => {
  const calls: unknown[] = [];
  const pendingUser = user({ new_phone: '+919876543210' });
  const supabase = {
    auth: {
      getUser: async () => ({ data: { user: pendingUser }, error: null }),
      resend: async (input: unknown) => {
        calls.push(input);
        return { data: {}, error: null };
      },
    },
  } as unknown as SupabaseClient;

  await resendCitizenPhoneVerificationCode(supabase, pendingUser.id, '+91 (98765) 43210');

  assert.deepEqual(calls, [{ phone: '+919876543210', type: 'phone_change' }]);
});

test('verifies phone-change OTP and checks authoritative id, phone, and confirmation time', async () => {
  const calls: unknown[] = [];
  const pendingUser = user({ new_phone: '+919876543210' });
  const confirmedUser = user({
    phone: '+919876543210',
    phone_confirmed_at: '2026-07-16T10:02:00.000Z',
  });
  let getUserCall = 0;
  const supabase = {
    auth: {
      getSession: async () => ({
        data: { session: { access_token: 'verified-access-token' } },
        error: null,
      }),
      getUser: async () => {
        getUserCall += 1;
        return {
          data: { user: getUserCall === 1 ? pendingUser : confirmedUser },
          error: null,
        };
      },
      verifyOtp: async (input: unknown) => {
        calls.push(input);
        return { data: { session: null, user: confirmedUser }, error: null };
      },
    },
  } as unknown as SupabaseClient;

  await verifyCitizenPhoneVerification(
    supabase,
    pendingUser.id,
    '+91 (98765) 43210',
    '123 456',
    async (accessToken, eventType) => {
      calls.push({ accessToken, eventType });
      return true;
    },
  );

  assert.deepEqual(calls, [
    { phone: '+919876543210', token: '123456', type: 'phone_change' },
    { accessToken: 'verified-access-token', eventType: 'otp_verified' },
  ]);
});

for (const [name, confirmedUser] of [
  [
    'a different user id',
    user({
      id: 'different-user-id',
      phone: '+919876543210',
      phone_confirmed_at: '2026-07-16T10:02:00.000Z',
    }),
  ],
  [
    'a different phone',
    user({
      phone: '+919999999999',
      phone_confirmed_at: '2026-07-16T10:02:00.000Z',
    }),
  ],
  ['a missing confirmation timestamp', user({ phone: '+919876543210' })],
] as const) {
  test(`signs out when post-verification state has ${name}`, async () => {
    const pendingUser = user({ new_phone: '+919876543210' });
    let getUserCall = 0;
    let signOutCalls = 0;
    const supabase = {
      auth: {
        getUser: async () => {
          getUserCall += 1;
          return {
            data: { user: getUserCall === 1 ? pendingUser : confirmedUser },
            error: null,
          };
        },
        signOut: async () => {
          signOutCalls += 1;
          return { error: null };
        },
        verifyOtp: async () => ({
          data: { session: null, user: null },
          error: null,
        }),
      },
    } as unknown as SupabaseClient;

    await assert.rejects(
      verifyCitizenPhoneVerification(supabase, pendingUser.id, '+919876543210', '123456'),
    );
    assert.equal(signOutCalls, 1);
  });
}

test('signs out if the active user changes while phone verification is being started', async () => {
  const initialUser = user();
  const differentUser = user({ id: 'different-user-id', new_phone: '+919876543210' });
  let signOutCalls = 0;
  const supabase = {
    auth: {
      getUser: async () => ({ data: { user: initialUser }, error: null }),
      signOut: async () => {
        signOutCalls += 1;
        return { error: null };
      },
      updateUser: async () => ({ data: { user: differentUser }, error: null }),
    },
  } as unknown as SupabaseClient;

  await assert.rejects(beginCitizenPhoneVerification(supabase, '+919876543210'));
  assert.equal(signOutCalls, 1);
});

test('encodes only a safe local return path in the phone verification URL', () => {
  assert.equal(
    buildCitizenPhoneVerificationPath('/account?tab=profile'),
    '/auth/verify-phone?next=%2Faccount%3Ftab%3Dprofile',
  );
  assert.equal(
    buildCitizenPhoneVerificationPath('https://attacker.example'),
    '/auth/verify-phone?next=%2Faccount',
  );
});

test('stages phone verification without blocking password access in observe mode', () => {
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
