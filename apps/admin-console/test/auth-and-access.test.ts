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
import { getSupportedEmailOtpType } from '../lib/auth/callback';
import { EmailInputError, normalizeEmail } from '../lib/auth/input';
import { getSafeReturnPath } from '../lib/auth/return-path';
import { signOutAdminSession } from '../lib/auth/service';
import { isPublicAuthRoute } from '../proxy';

test('normalizes administrator email and constrains callbacks', () => {
  assert.equal(normalizeEmail(' Admin@Example.ORG '), 'admin@example.org');
  assert.throws(() => normalizeEmail('invalid'), EmailInputError);
  assert.equal(getSupportedEmailOtpType('invite'), 'invite');
  assert.equal(getSupportedEmailOtpType('recovery'), null);
  assert.equal(getSafeReturnPath('//attacker.example', '/'), '/');
});

test('exempts only the exact authentication route segment from session protection', () => {
  assert.equal(isPublicAuthRoute('/auth'), true);
  assert.equal(isPublicAuthRoute('/auth/login'), true);
  assert.equal(isPublicAuthRoute('/auth/callback'), true);
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
