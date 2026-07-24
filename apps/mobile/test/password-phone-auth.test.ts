import assert from 'node:assert/strict';
import test from 'node:test';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

import { normalizePassword } from '../src/auth/auth-input';
import {
  createPasswordAccount,
  establishPasswordRecoverySession,
  exchangePasswordRecoveryCode,
  PASSWORD_CHANGED_AUDIT_TIMEOUT_MS,
  recordPasswordChangedAuditWithin,
  requestPasswordPhoneOtp,
  requestPasswordRecovery,
  signInWithPassword,
  updatePasswordWithPhoneOtp,
} from '../src/auth/password-auth';
import {
  getConfirmedPhone,
  getPhoneUpdateAssurance,
  getUserFacingPhoneVerificationError,
  normalizeAuthenticatorCode,
  PhoneConfirmationConfigurationError,
  PhoneVerificationSecurityError,
  requestPhoneVerification,
  resendPhoneVerification,
  shouldInspectPhoneVerificationForUser,
  verifyPhoneUpdateAuthenticator,
  verifyPhoneVerification,
} from '../src/auth/phone-verification';
import { getOtpResendSecondsRemaining, OTP_RESEND_COOLDOWN_MS } from '../src/auth/otp-challenge';

type UserOverrides = Omit<Partial<User>, 'phone' | 'phone_confirmed_at'> & {
  phone?: string | undefined;
  phone_confirmed_at?: string | undefined;
};

const confirmedUser = (overrides: UserOverrides = {}): User =>
  ({
    id: 'citizen-user-id',
    phone: '+919876543210',
    phone_confirmed_at: '2026-07-23T08:00:00.000Z',
    ...overrides,
  }) as User;

const sessionFor = (user = confirmedUser(), accessToken = 'access-token'): Session =>
  ({
    access_token: accessToken,
    user,
  }) as Session;

const asClient = (auth: Record<string, unknown>): SupabaseClient =>
  ({ auth }) as unknown as SupabaseClient;

test('validates the configured password boundary without altering the password', () => {
  assert.equal(normalizePassword('correct horse battery staple'), 'correct horse battery staple');
  assert.throws(() => normalizePassword('short'), /at least 8/u);
  assert.throws(() => normalizePassword('x'.repeat(73)), /no more than 72/u);
});

test('signs in with normalized email and audits only an established session', async () => {
  const calls: unknown[] = [];
  const session = sessionFor();
  const supabase = asClient({
    signInWithPassword: async (credentials: unknown) => {
      calls.push(credentials);
      return { data: { session }, error: null };
    },
  });

  await signInWithPassword(
    supabase,
    ' Citizen@Example.org ',
    'password123',
    async (accessToken, eventType) => {
      calls.push([accessToken, eventType]);
      return true;
    },
  );

  assert.deepEqual(calls, [
    { email: 'citizen@example.org', password: 'password123' },
    ['access-token', 'sign_in_succeeded'],
  ]);
});

test('keeps confirmation-dependent sign-up explicit when Supabase returns no session', async () => {
  const supabase = asClient({
    signUp: async () => ({ data: { session: null }, error: null }),
  });

  assert.deepEqual(await createPasswordAccount(supabase, 'new@example.org', 'password123'), {
    status: 'email-confirmation-required',
  });
});

test('requests password recovery with the reviewed redirect and accepts one recovery credential', async () => {
  const calls: unknown[] = [];
  const session = sessionFor();
  const supabase = asClient({
    exchangeCodeForSession: async (code: string) => {
      calls.push(['code', code]);
      return { data: { session }, error: null };
    },
    resetPasswordForEmail: async (...parameters: unknown[]) => {
      calls.push(['reset', ...parameters]);
      return { error: null };
    },
    verifyOtp: async (input: unknown) => {
      calls.push(['token', input]);
      return { data: { session }, error: null };
    },
  });

  assert.equal(
    await requestPasswordRecovery(
      supabase,
      ' Citizen@Example.org ',
      'jagruksetu://auth/reset-password',
    ),
    'citizen@example.org',
  );
  assert.equal(await exchangePasswordRecoveryCode(supabase, ' recovery-code '), session);
  assert.equal(await establishPasswordRecoverySession(supabase, { code: 'pkce-code' }), session);
  assert.equal(
    await establishPasswordRecoverySession(supabase, {
      tokenHash: 'recovery-token',
      type: 'recovery',
    }),
    session,
  );
  await assert.rejects(
    establishPasswordRecoverySession(supabase, {
      code: 'pkce-code',
      tokenHash: 'recovery-token',
      type: 'recovery',
    }),
    /recovery link is invalid/u,
  );
  await assert.rejects(
    establishPasswordRecoverySession(supabase, {
      tokenHash: 'recovery-token',
      type: 'signup',
    }),
    /recovery link is invalid/u,
  );

  assert.deepEqual(calls, [
    ['reset', 'citizen@example.org', { redirectTo: 'jagruksetu://auth/reset-password' }],
    ['code', 'recovery-code'],
    ['code', 'pkce-code'],
    ['token', { token_hash: 'recovery-token', type: 'recovery' }],
  ]);
});

test('reads only a normalized, confirmed phone from the authoritative user', async () => {
  const confirmedClient = asClient({
    getUser: async () => ({
      data: { user: confirmedUser({ phone: '919876543210' }) },
      error: null,
    }),
  });
  const unconfirmedClient = asClient({
    getUser: async () => ({
      data: { user: confirmedUser({ phone_confirmed_at: undefined }) },
      error: null,
    }),
  });

  assert.deepEqual(await getConfirmedPhone(confirmedClient), {
    phone: '+919876543210',
    userId: 'citizen-user-id',
  });
  assert.equal(await getConfirmedPhone(unconfirmedClient), null);
});

test('inspects phone state once per authenticated user across USER_UPDATED events', () => {
  assert.equal(shouldInspectPhoneVerificationForUser(null, 'citizen-user-id'), true);
  assert.equal(shouldInspectPhoneVerificationForUser('citizen-user-id', 'citizen-user-id'), false);
  assert.equal(shouldInspectPhoneVerificationForUser('citizen-user-id', 'other-user-id'), true);
});

test('requires a verified legacy authenticator before changing a citizen phone', async () => {
  const calls: unknown[] = [];
  const existingUser = confirmedUser({
    phone: undefined,
    phone_confirmed_at: undefined,
  });
  const supabase = asClient({
    getUser: async () => {
      calls.push(['getUser']);
      return { data: { user: existingUser }, error: null };
    },
    mfa: {
      getAuthenticatorAssuranceLevel: async () => {
        calls.push(['getAuthenticatorAssuranceLevel']);
        return {
          data: {
            currentAuthenticationMethods: [],
            currentLevel: 'aal1',
            nextLevel: 'aal2',
          },
          error: null,
        };
      },
      listFactors: async () => {
        calls.push(['listFactors']);
        return {
          data: {
            all: [],
            phone: [],
            totp: [
              {
                created_at: '2026-07-17T07:33:05.120159Z',
                factor_type: 'totp',
                friendly_name: 'Local Wellness government dashboard',
                id: 'verified-factor-id',
                status: 'verified',
                updated_at: '2026-07-17T11:26:09.278436Z',
              },
            ],
            webauthn: [],
          },
          error: null,
        };
      },
    },
  });

  assert.deepEqual(await getPhoneUpdateAssurance(supabase, 'citizen-user-id'), {
    factorId: 'verified-factor-id',
    factorLabel: 'Local Wellness government dashboard',
    status: 'authenticator-required',
  });
  assert.deepEqual(calls, [['getUser'], ['getAuthenticatorAssuranceLevel'], ['listFactors']]);
});

test('keeps ordinary citizens on the phone flow without an MFA challenge', async () => {
  let factorsListed = false;
  const existingUser = confirmedUser({
    phone: undefined,
    phone_confirmed_at: undefined,
  });
  const supabase = asClient({
    getUser: async () => ({ data: { user: existingUser }, error: null }),
    mfa: {
      getAuthenticatorAssuranceLevel: async () => ({
        data: {
          currentAuthenticationMethods: [],
          currentLevel: 'aal1',
          nextLevel: 'aal1',
        },
        error: null,
      }),
      listFactors: async () => {
        factorsListed = true;
        return { data: null, error: null };
      },
    },
  });

  assert.deepEqual(await getPhoneUpdateAssurance(supabase, 'citizen-user-id'), {
    status: 'ready',
  });
  assert.equal(factorsListed, false);
});

test('steps up an existing authenticator and confirms the same account reached AAL2', async () => {
  const calls: unknown[] = [];
  const existingUser = confirmedUser({
    phone: undefined,
    phone_confirmed_at: undefined,
  });
  const supabase = asClient({
    getUser: async () => {
      calls.push(['getUser']);
      return { data: { user: existingUser }, error: null };
    },
    mfa: {
      challengeAndVerify: async (input: unknown) => {
        calls.push(['challengeAndVerify', input]);
        return { data: { access_token: 'aal2-token' }, error: null };
      },
      getAuthenticatorAssuranceLevel: async () => {
        calls.push(['getAuthenticatorAssuranceLevel']);
        return {
          data: {
            currentAuthenticationMethods: [],
            currentLevel: 'aal2',
            nextLevel: 'aal2',
          },
          error: null,
        };
      },
    },
  });

  await verifyPhoneUpdateAuthenticator(
    supabase,
    'citizen-user-id',
    'verified-factor-id',
    ' 123456 ',
  );
  assert.deepEqual(calls, [
    ['getUser'],
    [
      'challengeAndVerify',
      {
        code: '123456',
        factorId: 'verified-factor-id',
      },
    ],
    ['getAuthenticatorAssuranceLevel'],
    ['getUser'],
  ]);
  assert.equal(normalizeAuthenticatorCode(' 123 456 '), '123456');
  assert.throws(() => normalizeAuthenticatorCode('12345'), /6-digit/u);
});

test('starts phone confirmation with updateUser and binds it to the initiating user', async () => {
  const calls: unknown[] = [];
  const existingUser = confirmedUser({
    phone: undefined,
    phone_confirmed_at: undefined,
  });
  const supabase = asClient({
    getUser: async () => {
      calls.push(['getUser']);
      return { data: { user: existingUser }, error: null };
    },
    updateUser: async (attributes: unknown) => {
      calls.push(['updateUser', attributes]);
      return {
        data: {
          user: {
            ...existingUser,
            new_phone: '919999999999',
          },
        },
        error: null,
      };
    },
  });

  assert.deepEqual(
    await requestPhoneVerification(supabase, 'citizen-user-id', '+91 99999 99999', 1_000),
    {
      phone: '+919999999999',
      requestedAt: 1_000,
      userId: 'citizen-user-id',
    },
  );
  assert.deepEqual(calls, [['getUser'], ['updateUser', { phone: '+919999999999' }]]);
});

test('fails closed when Supabase returns a malformed pending phone', async () => {
  const signOutCalls: unknown[] = [];
  const existingUser = confirmedUser({
    phone: undefined,
    phone_confirmed_at: undefined,
  });
  const supabase = asClient({
    getUser: async () => ({ data: { user: existingUser }, error: null }),
    signOut: async (options: unknown) => {
      signOutCalls.push(options);
      return { error: null };
    },
    updateUser: async () => ({
      data: {
        user: {
          ...existingUser,
          new_phone: 'not-a-phone',
        },
      },
      error: null,
    }),
  });

  await assert.rejects(
    requestPhoneVerification(supabase, 'citizen-user-id', '+919999999999'),
    PhoneVerificationSecurityError,
  );
  assert.deepEqual(signOutCalls, [{ scope: 'local' }]);
});

test('fails closed if Supabase auto-confirms a phone without checking an OTP', async () => {
  const signOutCalls: unknown[] = [];
  const existingUser = confirmedUser({
    phone: undefined,
    phone_confirmed_at: undefined,
  });
  const supabase = asClient({
    getUser: async () => ({ data: { user: existingUser }, error: null }),
    signOut: async (options: unknown) => {
      signOutCalls.push(options);
      return { error: null };
    },
    updateUser: async () => ({
      data: {
        user: confirmedUser({ phone: '+919999999999' }),
      },
      error: null,
    }),
  });

  await assert.rejects(
    requestPhoneVerification(supabase, 'citizen-user-id', '+919999999999'),
    PhoneConfirmationConfigurationError,
  );
  assert.deepEqual(signOutCalls, [{ scope: 'local' }]);
});

test('resends and verifies a phone-change OTP with exact user and phone postchecks', async () => {
  const calls: unknown[] = [];
  let getUserCalls = 0;
  const existingUser = confirmedUser({
    phone: undefined,
    phone_confirmed_at: undefined,
  });
  const verifiedUser = confirmedUser({ phone: '919999999999' });
  const pending = {
    phone: '+919999999999',
    requestedAt: 1_000,
    userId: 'citizen-user-id',
  } as const;
  const supabase = asClient({
    getSession: async () => ({ data: { session: sessionFor(verifiedUser) }, error: null }),
    getUser: async () => {
      getUserCalls += 1;
      return {
        data: { user: getUserCalls <= 2 ? existingUser : verifiedUser },
        error: null,
      };
    },
    resend: async (input: unknown) => {
      calls.push(['resend', input]);
      return { data: {}, error: null };
    },
    verifyOtp: async (input: unknown) => {
      calls.push(['verifyOtp', input]);
      return {
        data: { session: sessionFor(verifiedUser), user: verifiedUser },
        error: null,
      };
    },
  });

  assert.deepEqual(await resendPhoneVerification(supabase, pending, 2_000), {
    ...pending,
    requestedAt: 2_000,
  });
  assert.deepEqual(
    await verifyPhoneVerification(supabase, pending, '123456', async (accessToken, eventType) => {
      calls.push(['audit', accessToken, eventType]);
      return true;
    }),
    {
      phone: '+919999999999',
      userId: 'citizen-user-id',
    },
  );
  await Promise.resolve();

  assert.deepEqual(calls, [
    [
      'resend',
      {
        phone: '+919999999999',
        type: 'phone_change',
      },
    ],
    [
      'verifyOtp',
      {
        phone: '+919999999999',
        token: '123456',
        type: 'phone_change',
      },
    ],
    ['audit', 'access-token', 'otp_verified'],
  ]);
});

test('signs out and rejects a phone verification response for another account', async () => {
  const signOutCalls: unknown[] = [];
  const existingUser = confirmedUser({
    phone: undefined,
    phone_confirmed_at: undefined,
  });
  const otherUser = confirmedUser({
    id: 'other-user-id',
    phone: '+919999999999',
  });
  const supabase = asClient({
    getUser: async () => ({ data: { user: existingUser }, error: null }),
    signOut: async (options: unknown) => {
      signOutCalls.push(options);
      return { error: null };
    },
    verifyOtp: async () => ({
      data: { session: sessionFor(otherUser), user: otherUser },
      error: null,
    }),
  });

  await assert.rejects(
    verifyPhoneVerification(
      supabase,
      {
        phone: '+919999999999',
        requestedAt: 1_000,
        userId: 'citizen-user-id',
      },
      '123456',
    ),
    PhoneVerificationSecurityError,
  );
  assert.deepEqual(signOutCalls, [{ scope: 'local' }]);
});

test('requests password OTP on an isolated client without allowing user creation', async () => {
  const isolatedCalls: unknown[] = [];
  const persistent = asClient({
    getUser: async () => ({ data: { user: confirmedUser() }, error: null }),
  });
  const isolated = asClient({
    signInWithOtp: async (input: unknown) => {
      isolatedCalls.push(input);
      return { data: { session: null, user: null }, error: null };
    },
  });

  assert.deepEqual(await requestPasswordPhoneOtp(persistent, 'citizen-user-id', () => isolated), {
    phone: '+919876543210',
    userId: 'citizen-user-id',
  });
  assert.deepEqual(isolatedCalls, [
    {
      phone: '+919876543210',
      options: { shouldCreateUser: false },
    },
  ]);
});

test('rejects password OTP requests when no phone was confirmed before recovery', async () => {
  let isolatedCreated = false;
  const persistent = asClient({
    getUser: async () => ({
      data: { user: confirmedUser({ phone_confirmed_at: undefined }) },
      error: null,
    }),
  });

  await assert.rejects(
    requestPasswordPhoneOtp(persistent, 'citizen-user-id', () => {
      isolatedCreated = true;
      return asClient({});
    }),
    /previously verified phone number is required/u,
  );
  assert.equal(isolatedCreated, false);
});

test('verifies SMS identity, changes password, audits, and clears all sessions', async () => {
  const calls: unknown[] = [];
  const user = confirmedUser();
  const isolatedSession = sessionFor(user, 'isolated-access-token');
  const persistent = asClient({
    getUser: async () => {
      calls.push(['persistent.getUser']);
      return { data: { user }, error: null };
    },
    signOut: async (options: unknown) => {
      calls.push(['persistent.signOut', options]);
      return { error: null };
    },
  });
  const isolated = asClient({
    getUser: async () => {
      calls.push(['isolated.getUser']);
      return { data: { user }, error: null };
    },
    signOut: async (options: unknown) => {
      calls.push(['isolated.signOut', options]);
      return { error: null };
    },
    updateUser: async (attributes: unknown) => {
      calls.push(['isolated.updateUser', attributes]);
      return { data: { user }, error: null };
    },
    verifyOtp: async (input: unknown) => {
      calls.push(['isolated.verifyOtp', input]);
      return { data: { session: isolatedSession, user }, error: null };
    },
  });

  const result = await updatePasswordWithPhoneOtp(
    persistent,
    'new-password-123',
    '123456',
    { phone: '+919876543210', userId: 'citizen-user-id' },
    () => isolated,
    async (accessToken, eventType) => {
      calls.push(['password-audit', accessToken, eventType]);
      return true;
    },
    async (accessToken, eventType) => {
      calls.push(['otp-audit', accessToken, eventType]);
      return true;
    },
  );
  await Promise.resolve();

  assert.deepEqual(result, { status: 'globally-signed-out' });
  assert.deepEqual(calls, [
    ['persistent.getUser'],
    [
      'isolated.verifyOtp',
      {
        phone: '+919876543210',
        token: '123456',
        type: 'sms',
      },
    ],
    ['isolated.getUser'],
    ['isolated.updateUser', { password: 'new-password-123' }],
    ['otp-audit', 'isolated-access-token', 'otp_verified'],
    ['password-audit', 'isolated-access-token', 'password_changed'],
    ['isolated.signOut', { scope: 'global' }],
    ['persistent.signOut', { scope: 'local' }],
  ]);
});

test('fails closed before changing a password when the SMS authenticates another account', async () => {
  const signOutCalls: unknown[] = [];
  let passwordUpdated = false;
  const persistentUser = confirmedUser();
  const otherUser = confirmedUser({ id: 'other-user-id' });
  const persistent = asClient({
    getUser: async () => ({ data: { user: persistentUser }, error: null }),
    signOut: async (options: unknown) => {
      signOutCalls.push(['persistent', options]);
      return { error: null };
    },
  });
  const isolated = asClient({
    signOut: async (options: unknown) => {
      signOutCalls.push(['isolated', options]);
      return { error: null };
    },
    updateUser: async () => {
      passwordUpdated = true;
      return { data: { user: otherUser }, error: null };
    },
    verifyOtp: async () => ({
      data: {
        session: sessionFor(otherUser, 'other-access-token'),
        user: otherUser,
      },
      error: null,
    }),
  });

  await assert.rejects(
    updatePasswordWithPhoneOtp(
      persistent,
      'new-password-123',
      '123456',
      { phone: '+919876543210', userId: 'citizen-user-id' },
      () => isolated,
    ),
    PhoneVerificationSecurityError,
  );
  assert.equal(passwordUpdated, false);
  assert.deepEqual(signOutCalls, [
    ['isolated', { scope: 'local' }],
    ['persistent', { scope: 'local' }],
    ['isolated', { scope: 'local' }],
  ]);
});

test('reports local fallback when global session revocation fails after password change', async () => {
  const signOutCalls: unknown[] = [];
  const user = confirmedUser();
  const persistent = asClient({
    getUser: async () => ({ data: { user }, error: null }),
    signOut: async (options: unknown) => {
      signOutCalls.push(['persistent', options]);
      return { error: null };
    },
  });
  const isolated = asClient({
    getUser: async () => ({ data: { user }, error: null }),
    signOut: async (options: unknown) => {
      signOutCalls.push(['isolated', options]);
      return options && (options as { scope?: string }).scope === 'global'
        ? { error: new Error('provider unavailable') }
        : { error: null };
    },
    updateUser: async () => ({ data: { user }, error: null }),
    verifyOtp: async () => ({
      data: { session: sessionFor(user, 'isolated-access-token'), user },
      error: null,
    }),
  });

  assert.deepEqual(
    await updatePasswordWithPhoneOtp(
      persistent,
      'new-password-123',
      '123456',
      { phone: '+919876543210', userId: 'citizen-user-id' },
      () => isolated,
      async () => true,
      async () => true,
    ),
    { status: 'locally-signed-out-global-revocation-failed' },
  );
  assert.deepEqual(signOutCalls, [
    ['isolated', { scope: 'global' }],
    ['isolated', { scope: 'local' }],
    ['persistent', { scope: 'local' }],
  ]);
});

test('bounds password-change audit delivery and preserves cooldown behavior', async () => {
  assert.equal(PASSWORD_CHANGED_AUDIT_TIMEOUT_MS, 2_000);
  assert.equal(
    await recordPasswordChangedAuditWithin(
      async () => new Promise<boolean>(() => undefined),
      'access-token',
      5,
    ),
    false,
  );

  const now = 1_000;
  assert.equal(getOtpResendSecondsRemaining(now + OTP_RESEND_COOLDOWN_MS, now), 30);
  assert.equal(getOtpResendSecondsRemaining(now, now), 0);
});

test('maps ordinary Phone Auth provider failures without Advanced MFA guidance', () => {
  const smsError = Object.assign(new Error('Sending an SMS failed'), {
    code: 'sms_send_failed',
  });
  const message = getUserFacingPhoneVerificationError(smsError);

  assert.match(message, /Phone provider and Twilio Verify/u);
  assert.doesNotMatch(message, /Advanced|MFA|AAL2/u);
});

test('explains the Supabase AAL2 phone-update rejection before retrying SMS', () => {
  assert.equal(
    getUserFacingPhoneVerificationError(
      Object.assign(new Error('AAL2 session is required'), { code: 'insufficient_aal' }),
    ),
    'This account already has an authenticator. Enter its 6-digit code before requesting the phone SMS.',
  );
});
