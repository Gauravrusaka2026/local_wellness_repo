import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  completeEmailAuthCallback,
  getEmailAuthCallbackPurpose,
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
import {
  getCitizenPhoneVerificationMode,
  parseCitizenPhoneVerificationMode,
} from '../lib/environment';
import {
  CitizenPasswordRecoveryPhoneRequiredError,
  CitizenPasswordRecoverySecurityError,
  CitizenPasswordSessionRevocationError,
  createCitizenPasswordAccount,
  establishCitizenPasswordRecoverySession,
  getUserFacingAuthError,
  requestCitizenPasswordPhoneOtp,
  requestCitizenPasswordReset,
  signInCitizenWithPassword,
  signOutCitizenSession,
  updateCitizenPasswordWithPhoneOtp,
} from '../lib/auth/service';
import { recordAuthAuditEventWithin } from '../lib/api/auth-audit';

test('accepts local return paths and rejects cross-origin redirects', () => {
  assert.equal(getSafeReturnPath('/account?tab=profile', '/account'), '/account?tab=profile');
  assert.equal(getSafeReturnPath('//attacker.example/path', '/account'), '/account');
  assert.equal(getSafeReturnPath('https://attacker.example/path', '/account'), '/account');
});

test('defaults citizen phone verification to enforce and validates rollout modes', () => {
  assert.equal(parseCitizenPhoneVerificationMode(undefined), 'enforce');
  assert.equal(parseCitizenPhoneVerificationMode(''), 'enforce');
  assert.equal(parseCitizenPhoneVerificationMode('observe'), 'observe');
  assert.equal(parseCitizenPhoneVerificationMode('enforce'), 'enforce');
  assert.throws(() => parseCitizenPhoneVerificationMode('disabled'));
});

test('uses the legacy phone rollout variable only when the preferred variable is absent', () => {
  const environment = process.env as Record<string, string | undefined>;
  const preferred = environment['NEXT_PUBLIC_CITIZEN_PHONE_VERIFICATION_MODE'];
  const legacy = environment['NEXT_PUBLIC_CITIZEN_PHONE_MFA_MODE'];

  try {
    delete environment['NEXT_PUBLIC_CITIZEN_PHONE_VERIFICATION_MODE'];
    environment['NEXT_PUBLIC_CITIZEN_PHONE_MFA_MODE'] = 'observe';
    assert.equal(getCitizenPhoneVerificationMode(), 'observe');

    environment['NEXT_PUBLIC_CITIZEN_PHONE_VERIFICATION_MODE'] = 'enforce';
    assert.equal(getCitizenPhoneVerificationMode(), 'enforce');
  } finally {
    if (preferred === undefined) {
      delete environment['NEXT_PUBLIC_CITIZEN_PHONE_VERIFICATION_MODE'];
    } else {
      environment['NEXT_PUBLIC_CITIZEN_PHONE_VERIFICATION_MODE'] = preferred;
    }

    if (legacy === undefined) {
      delete environment['NEXT_PUBLIC_CITIZEN_PHONE_MFA_MODE'];
    } else {
      environment['NEXT_PUBLIC_CITIZEN_PHONE_MFA_MODE'] = legacy;
    }
  }
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
  assert.equal(
    getEmailAuthCallbackPurpose(
      'https://citizen.example/auth/callback?token_hash=hashed&type=signup',
    ),
    'email-confirmation',
  );
  assert.equal(
    getEmailAuthCallbackPurpose('https://citizen.example/auth/callback?code=pkce'),
    'sign-in',
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

  assert.deepEqual(
    await createCitizenPasswordAccount(
      supabase,
      ' Citizen@Example.ORG ',
      'secure password',
      async (accessToken, eventType) => {
        calls.push({ accessToken, eventType });
        return true;
      },
    ),
    { status: 'authenticated' },
  );

  assert.deepEqual(calls, [
    { email: 'citizen@example.org', password: 'secure password' },
    { accessToken: 'new-token', eventType: 'sign_in_succeeded' },
  ]);
});

test('keeps a selected email explicit when account creation requires confirmation', async () => {
  const supabase = {
    auth: {
      signUp: async () => ({ data: { session: null }, error: null }),
    },
  } as unknown as SupabaseClient;

  assert.deepEqual(
    await createCitizenPasswordAccount(supabase, ' Citizen@Example.org ', 'secure password'),
    { email: 'citizen@example.org', status: 'email-confirmation-required' },
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

  assert.equal(
    await requestCitizenPasswordReset(
      supabase,
      ' Citizen@Example.ORG ',
      'https://citizen.example/auth/reset-password',
    ),
    'citizen@example.org',
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
  const recoveryUser = {
    email: 'citizen@example.org',
    id: 'citizen-user-id',
    phone: '919876543210',
    phone_confirmed_at: '2026-07-23T08:00:00.000Z',
  };
  const supabase = {
    auth: {
      exchangeCodeForSession: async (code: string) => {
        calls.push({ code });
        return {
          data: {
            session: {
              access_token: 'recovery-token',
              user: recoveryUser,
            },
            user: recoveryUser,
          },
          error: null,
        };
      },
      getUser: async () => ({ data: { user: recoveryUser }, error: null }),
      verifyOtp: async (input: unknown) => {
        calls.push(input);
        return {
          data: {
            session: {
              access_token: 'recovery-token',
              user: recoveryUser,
            },
            user: recoveryUser,
          },
          error: null,
        };
      },
    },
  } as unknown as SupabaseClient;

  assert.deepEqual(
    await establishCitizenPasswordRecoverySession(
      supabase,
      'https://citizen.example/auth/reset-password?code=pkce',
    ),
    {
      email: 'citizen@example.org',
      phone: '+919876543210',
      userId: 'citizen-user-id',
    },
  );
  assert.deepEqual(
    await establishCitizenPasswordRecoverySession(
      supabase,
      'https://citizen.example/auth/reset-password?token_hash=hashed&type=recovery',
    ),
    {
      email: 'citizen@example.org',
      phone: '+919876543210',
      userId: 'citizen-user-id',
    },
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

test('closes a recovery session when the account has no previously confirmed phone', async () => {
  const signOutCalls: unknown[] = [];
  const recoveryUser = {
    email: 'citizen@example.org',
    id: 'citizen-user-id',
    phone: '+919876543210',
    phone_confirmed_at: null,
  };
  const supabase = {
    auth: {
      exchangeCodeForSession: async () => ({
        data: {
          session: { access_token: 'recovery-token', user: recoveryUser },
          user: recoveryUser,
        },
        error: null,
      }),
      getUser: async () => ({ data: { user: recoveryUser }, error: null }),
      signOut: async (input: unknown) => {
        signOutCalls.push(input);
        return { error: null };
      },
    },
  } as unknown as SupabaseClient;

  await assert.rejects(
    establishCitizenPasswordRecoverySession(
      supabase,
      'https://citizen.example/auth/reset-password?code=pkce',
    ),
    CitizenPasswordRecoveryPhoneRequiredError,
  );
  assert.deepEqual(signOutCalls, [{ scope: 'local' }]);
});

test('maps provider auth failures to specific safe recovery guidance', () => {
  assert.equal(
    getUserFacingAuthError(new Error('Email not confirmed')),
    'Confirm this email address before signing in. Check its inbox, including spam, for the confirmation message.',
  );
  assert.equal(
    getUserFacingAuthError(new Error('User already registered')),
    'An account may already use this email address. Sign in or reset its password.',
  );
  assert.equal(
    getUserFacingAuthError(new Error('Failed to fetch')),
    'The authentication service could not be reached. Check your connection and try again.',
  );
});

test('bounds best-effort authentication audit delivery', async () => {
  const startedAt = Date.now();
  const delivered = await recordAuthAuditEventWithin(
    'access-token',
    'otp_verified',
    async () => new Promise<boolean>(() => undefined),
    5,
  );

  assert.equal(delivered, false);
  assert.ok(Date.now() - startedAt < 1_000);
});

test('uses an isolated phone OTP session to update the password and revoke sessions', async () => {
  const calls: unknown[] = [];
  const recoveryUser = {
    email: 'citizen@example.org',
    id: 'citizen-user-id',
    phone: '+919876543210',
    phone_confirmed_at: '2026-07-23T08:00:00.000Z',
  };
  const recoveryClient = {
    auth: {
      getUser: async () => {
        calls.push('persistent:get-user');
        return { data: { user: recoveryUser }, error: null };
      },
      signOut: async (input: unknown) => {
        calls.push({ persistentSignOut: input });
        return { error: null };
      },
    },
  } as unknown as SupabaseClient;
  const sendClient = {
    auth: {
      signInWithOtp: async (input: unknown) => {
        calls.push({ signInWithOtp: input });
        return { data: {}, error: null };
      },
    },
  } as unknown as SupabaseClient;
  const verificationClient = {
    auth: {
      getUser: async () => {
        calls.push('isolated:get-user');
        return { data: { user: recoveryUser }, error: null };
      },
      signOut: async (input: unknown) => {
        calls.push({ isolatedSignOut: input });
        return { error: null };
      },
      updateUser: async (input: unknown) => {
        calls.push({ updateUser: input });
        return { data: { user: recoveryUser }, error: null };
      },
      verifyOtp: async (input: unknown) => {
        calls.push({ verifyOtp: input });
        return {
          data: {
            session: { access_token: 'phone-access-token', user: recoveryUser },
            user: recoveryUser,
          },
          error: null,
        };
      },
    },
  } as unknown as SupabaseClient;

  const identity = {
    email: recoveryUser.email,
    phone: recoveryUser.phone,
    userId: recoveryUser.id,
  };
  const request = await requestCitizenPasswordPhoneOtp(recoveryClient, identity, () => sendClient);
  await updateCitizenPasswordWithPhoneOtp(
    recoveryClient,
    'new secure password',
    '123 456',
    request,
    () => verificationClient,
    async (accessToken, eventType) => {
      calls.push({ otpAudit: { accessToken, eventType } });
      return true;
    },
    async (accessToken, eventType) => {
      calls.push({ passwordAudit: { accessToken, eventType } });
      return true;
    },
  );

  assert.deepEqual(calls, [
    'persistent:get-user',
    {
      signInWithOtp: {
        options: { shouldCreateUser: false },
        phone: '+919876543210',
      },
    },
    'persistent:get-user',
    {
      verifyOtp: {
        phone: '+919876543210',
        token: '123456',
        type: 'sms',
      },
    },
    'isolated:get-user',
    {
      otpAudit: {
        accessToken: 'phone-access-token',
        eventType: 'otp_verified',
      },
    },
    { updateUser: { password: 'new secure password' } },
    {
      passwordAudit: {
        accessToken: 'phone-access-token',
        eventType: 'password_changed',
      },
    },
    { isolatedSignOut: { scope: 'global' } },
    { persistentSignOut: { scope: 'local' } },
  ]);
});

test('fails closed when the phone OTP authenticates a different account', async () => {
  const calls: unknown[] = [];
  const recoveryUser = {
    id: 'citizen-user-id',
    phone: '+919876543210',
    phone_confirmed_at: '2026-07-23T08:00:00.000Z',
  };
  const unexpectedUser = {
    ...recoveryUser,
    id: 'different-user-id',
  };
  const recoveryClient = {
    auth: {
      getUser: async () => ({ data: { user: recoveryUser }, error: null }),
      signOut: async (input: unknown) => {
        calls.push({ persistentSignOut: input });
        return { error: null };
      },
    },
  } as unknown as SupabaseClient;
  const isolatedClient = {
    auth: {
      signOut: async (input: unknown) => {
        calls.push({ isolatedSignOut: input });
        return { error: null };
      },
      verifyOtp: async () => ({
        data: {
          session: { access_token: 'unexpected-token', user: unexpectedUser },
          user: unexpectedUser,
        },
        error: null,
      }),
    },
  } as unknown as SupabaseClient;

  await assert.rejects(
    updateCitizenPasswordWithPhoneOtp(
      recoveryClient,
      'new secure password',
      '123456',
      { phone: recoveryUser.phone, userId: recoveryUser.id },
      () => isolatedClient,
    ),
    CitizenPasswordRecoverySecurityError,
  );
  assert.deepEqual(calls, [
    { persistentSignOut: { scope: 'local' } },
    { isolatedSignOut: { scope: 'local' } },
  ]);
});

test('clears local sessions when global revocation fails after a password update', async () => {
  const calls: unknown[] = [];
  const recoveryUser = {
    id: 'citizen-user-id',
    phone: '+919876543210',
    phone_confirmed_at: '2026-07-23T08:00:00.000Z',
  };
  const recoveryClient = {
    auth: {
      getUser: async () => ({ data: { user: recoveryUser }, error: null }),
      signOut: async (input: unknown) => {
        calls.push({ persistentSignOut: input });
        return { error: null };
      },
    },
  } as unknown as SupabaseClient;
  const isolatedClient = {
    auth: {
      getUser: async () => ({ data: { user: recoveryUser }, error: null }),
      signOut: async (input: { scope: string }) => {
        calls.push({ isolatedSignOut: input });
        if (input.scope === 'global') {
          throw new Error('provider unavailable');
        }
        return { error: null };
      },
      updateUser: async () => ({ data: { user: recoveryUser }, error: null }),
      verifyOtp: async () => ({
        data: {
          session: { access_token: 'phone-access-token', user: recoveryUser },
          user: recoveryUser,
        },
        error: null,
      }),
    },
  } as unknown as SupabaseClient;
  const recordAudit = async (): Promise<boolean> => true;

  await assert.rejects(
    updateCitizenPasswordWithPhoneOtp(
      recoveryClient,
      'new secure password',
      '123456',
      { phone: recoveryUser.phone, userId: recoveryUser.id },
      () => isolatedClient,
      recordAudit,
      recordAudit,
    ),
    CitizenPasswordSessionRevocationError,
  );
  assert.deepEqual(calls, [
    { isolatedSignOut: { scope: 'global' } },
    { isolatedSignOut: { scope: 'local' } },
    { persistentSignOut: { scope: 'local' } },
  ]);
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
