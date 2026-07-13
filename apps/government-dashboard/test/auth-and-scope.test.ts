import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  getScopeTypeLabel,
  hasGovernmentAccess,
  type GovernmentAccessScope,
} from '../lib/api/access-scope';
import { getSupportedEmailOtpType } from '../lib/auth/callback';
import { EmailInputError, normalizeEmail } from '../lib/auth/input';
import { getSafeReturnPath } from '../lib/auth/return-path';
import { signOutGovernmentSession } from '../lib/auth/service';
import { isPublicAuthRoute } from '../proxy';

test('normalizes official email addresses without revealing invitation state', () => {
  assert.equal(normalizeEmail(' Officer@Municipality.GOV.IN '), 'officer@municipality.gov.in');
  assert.throws(() => normalizeEmail('not-an-email'), EmailInputError);
});

test('constrains callback types and return paths', () => {
  assert.equal(getSupportedEmailOtpType('invite'), 'invite');
  assert.equal(getSupportedEmailOtpType('recovery'), null);
  assert.equal(getSafeReturnPath('/?queue=new', '/'), '/?queue=new');
  assert.equal(getSafeReturnPath('//attacker.example', '/'), '/');
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
