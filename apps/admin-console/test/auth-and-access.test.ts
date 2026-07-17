import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  governmentInvitationRoleCodes,
  governmentInvitationRoleScopes,
} from '@local-wellness/types';

import {
  hasGovernmentInvitationAccess,
  hasPlatformAdminAccess,
  type AdminAccessScope,
} from '../lib/api/access-scope';
import { ApiError, getUserFacingApiError } from '../lib/api/client';
import {
  completeEmailAuthCallback,
  getAdminEmailCallbackUrl,
  getSupportedEmailOtpType,
  resolveEmailAuthCallback,
} from '../lib/auth/callback';
import { EmailInputError, normalizeEmail, normalizeOtp, OtpInputError } from '../lib/auth/input';
import { getSafeReturnPath } from '../lib/auth/return-path';
import {
  getSignedInAdminEmail,
  requestAdminOtp,
  signOutAdminSession,
  verifyAdminOtp,
} from '../lib/auth/service';
import { isPublicAuthRoute } from '../proxy';

test('normalizes administrator email and constrains callbacks', () => {
  assert.equal(normalizeEmail(' Admin@Example.ORG '), 'admin@example.org');
  assert.equal(normalizeOtp('123 456'), '123456');
  assert.throws(() => normalizeEmail('invalid'), EmailInputError);
  assert.throws(() => normalizeOtp('12345'), OtpInputError);
  assert.equal(getSupportedEmailOtpType('invite'), 'invite');
  assert.equal(getSupportedEmailOtpType('recovery'), null);
  assert.equal(getSafeReturnPath('//attacker.example', '/'), '/');
});

test('uses the exact queryless administrator callback URL', () => {
  assert.equal(
    getAdminEmailCallbackUrl('http://localhost:3004'),
    'http://localhost:3004/auth/callback',
  );
});

test('rejects fragment sessions and accepts only reviewed administrator token hashes', async () => {
  assert.throws(() =>
    resolveEmailAuthCallback(
      'https://admin.example.org/auth/callback#access_token=access&refresh_token=refresh',
    ),
  );
  assert.throws(() =>
    resolveEmailAuthCallback(
      'https://admin.example.org/auth/callback?token_hash=hash&type=recovery',
    ),
  );

  const calls: unknown[] = [];
  const supabase = {
    auth: {
      exchangeCodeForSession: async () => {
        throw new Error('PKCE must not run for an invite token hash.');
      },
      verifyOtp: async (request: unknown) => {
        calls.push(request);
        return { data: { session: { access_token: 'admin-access-token' } }, error: null };
      },
    },
  } as unknown as SupabaseClient;

  assert.equal(
    await completeEmailAuthCallback(
      supabase,
      'https://admin.example.org/auth/callback?token_hash=invite-hash&type=invite',
    ),
    'admin-access-token',
  );
  assert.deepEqual(calls, [{ token_hash: 'invite-hash', type: 'invite' }]);
});

test('requests an administrator email code without creating an account', async () => {
  const requests: unknown[] = [];
  const supabase = {
    auth: {
      signInWithOtp: async (request: unknown) => {
        requests.push(request);
        return { data: {}, error: null };
      },
    },
  } as unknown as SupabaseClient;

  const email = await requestAdminOtp(
    supabase,
    ' Admin@Example.ORG ',
    'https://admin.example.org/auth/callback',
  );

  assert.equal(email, 'admin@example.org');
  assert.deepEqual(requests, [
    {
      email: 'admin@example.org',
      options: {
        emailRedirectTo: 'https://admin.example.org/auth/callback',
        shouldCreateUser: false,
      },
    },
  ]);
});

test('reads and normalizes the exact signed-in administrator email', async () => {
  const supabase = {
    auth: {
      getUser: async () => ({
        data: { user: { email: ' Platform.Admin@Example.ORG ' } },
        error: null,
      }),
    },
  } as unknown as SupabaseClient;

  assert.equal(await getSignedInAdminEmail(supabase), 'platform.admin@example.org');
});

test('fails closed when the signed-in administrator email is unavailable', async () => {
  const supabase = {
    auth: {
      getUser: async () => ({ data: { user: { email: null } }, error: null }),
    },
  } as unknown as SupabaseClient;

  await assert.rejects(getSignedInAdminEmail(supabase), /email is unavailable/u);
});

test('verifies an administrator email code and records successful OTP verification', async () => {
  const calls: unknown[] = [];
  const supabase = {
    auth: {
      verifyOtp: async (request: unknown) => {
        calls.push(request);
        return {
          data: { session: { access_token: 'admin-access-token' } },
          error: null,
        };
      },
    },
  } as unknown as SupabaseClient;

  await verifyAdminOtp(supabase, ' Admin@Example.ORG ', '123 456', async (...audit) => {
    calls.push(audit);
    return true;
  });

  assert.deepEqual(calls, [
    { email: 'admin@example.org', token: '123456', type: 'email' },
    ['admin-access-token', 'otp_verified'],
  ]);
});

test('rejects administrator OTP verification without a session and skips audit', async () => {
  const calls: unknown[] = [];
  const supabase = {
    auth: {
      verifyOtp: async (request: unknown) => {
        calls.push(request);
        return { data: { session: null }, error: null };
      },
    },
  } as unknown as SupabaseClient;

  await assert.rejects(
    verifyAdminOtp(supabase, 'admin@example.org', '123456', async (...audit) => {
      calls.push(audit);
      return true;
    }),
    /session was not established/u,
  );
  assert.deepEqual(calls, [{ email: 'admin@example.org', token: '123456', type: 'email' }]);
});

test('exempts only the exact authentication route segment from session protection', () => {
  assert.equal(isPublicAuthRoute('/auth'), true);
  assert.equal(isPublicAuthRoute('/auth/login'), true);
  assert.equal(isPublicAuthRoute('/auth/callback'), true);
  assert.equal(isPublicAuthRoute('/auth/help'), true);
  assert.equal(isPublicAuthRoute('/authority'), false);
  assert.equal(isPublicAuthRoute('/authentication'), false);
});

test('requires a global platform_admin role before rendering privileged forms', () => {
  const baseScope: AdminAccessScope = { authorities: [], roles: [] };
  assert.equal(hasPlatformAdminAccess(baseScope), false);
  assert.equal(hasGovernmentInvitationAccess(baseScope), false);
  assert.equal(
    hasPlatformAdminAccess({
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
});

test('admits an active municipal administrator only for a matching authority membership', () => {
  const municipalScope: AdminAccessScope = {
    authorities: [
      {
        authorityId: 'authority-id',
        effectiveFrom: '2026-07-13T00:00:00.000Z',
        effectiveUntil: null,
        invitationEmail: 'admin@example.org',
        membershipId: 'membership-id',
        status: 'active',
      },
    ],
    roles: [
      {
        assignmentId: 'assignment-id',
        authorityId: 'authority-id',
        code: 'municipal_admin',
        description: null,
        effectiveFrom: '2026-07-13T00:00:00.000Z',
        effectiveUntil: null,
        isGovernment: true,
        isPrivileged: true,
        name: 'Municipal administrator',
        roleId: 'role-id',
        scopeId: 'authority-id',
        scopeType: 'authority',
      },
    ],
  };

  assert.equal(hasGovernmentInvitationAccess(municipalScope), true);
  assert.equal(hasGovernmentInvitationAccess({ ...municipalScope, authorities: [] }), false);
});

test('describes both administrator roles when authorization is denied', () => {
  const error = new ApiError({
    code: 'ACCESS_DENIED',
    message: 'Internal authorization wording.',
    status: 403,
  });

  assert.equal(
    getUserFacingApiError(error),
    'An active platform or municipal administrator role is required.',
  );
});

test('shared invitation roles map to their required scope types', () => {
  assert.deepEqual(governmentInvitationRoleCodes, [
    'government_operator',
    'ward_officer',
    'department_officer',
    'municipal_admin',
    'moderator',
  ]);
  assert.equal(governmentInvitationRoleScopes.ward_officer, 'ward');
  assert.equal(governmentInvitationRoleScopes.department_officer, 'department');
  assert.equal(governmentInvitationRoleScopes.municipal_admin, 'authority');
});

test('records administrator sign-out success only after Supabase signs out', async () => {
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

  await signOutAdminSession(supabase, async (accessToken, eventType) => {
    calls.push(`audit:${accessToken}:${eventType}`);
    return true;
  });

  assert.deepEqual(calls, ['sign-out', 'audit:saved-access-token:sign_out_succeeded']);
});
