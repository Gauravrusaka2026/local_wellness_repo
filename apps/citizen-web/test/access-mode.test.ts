import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { NextRequest } from 'next/server';

import {
  CITIZEN_ACCESS_UNAVAILABLE_PATH,
  CitizenAccessUnavailableError,
  citizenRouteRequiresSession,
  getCitizenRouteAccess,
} from '../lib/access-policy';
import { apiRequest } from '../lib/api/client';
import { listPublicComplaints } from '../lib/api/transparency';
import { parseCitizenAccessMode } from '../lib/environment';
import { proxy } from '../proxy';

const originalAccessMode = process.env['NEXT_PUBLIC_CITIZEN_ACCESS_MODE'];
const originalApiUrl = process.env['NEXT_PUBLIC_API_URL'];
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;

  if (originalAccessMode === undefined) {
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_CITIZEN_ACCESS_MODE');
  } else {
    Reflect.set(process.env, 'NEXT_PUBLIC_CITIZEN_ACCESS_MODE', originalAccessMode);
  }

  if (originalApiUrl === undefined) {
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_API_URL');
  } else {
    Reflect.set(process.env, 'NEXT_PUBLIC_API_URL', originalApiUrl);
  }
});

describe('citizen web access mode', () => {
  it('defaults to public-only and rejects unknown modes', () => {
    assert.equal(parseCitizenAccessMode(undefined), 'public-only');
    assert.equal(parseCitizenAccessMode(''), 'public-only');
    assert.equal(parseCitizenAccessMode('public-only'), 'public-only');
    assert.equal(parseCitizenAccessMode('full'), 'full');
    assert.throws(() => parseCitizenAccessMode('observe'));
  });

  it('uses an explicit public allowlist and fails closed for future surfaces', () => {
    const routeMatrix = [
      ['/', 'public', false],
      ['/transparency', 'public', false],
      ['/transparency/public-report-id', 'public', false],
      ['/directory', 'public', false],
      [CITIZEN_ACCESS_UNAVAILABLE_PATH, 'public', false],
      ['/auth/login', 'protected', false],
      ['/auth/callback', 'protected', false],
      ['/auth/reset-password', 'protected', false],
      ['/auth/verify-phone', 'protected', false],
      ['/report', 'protected', false],
      ['/account', 'protected', true],
      ['/account/preferences', 'protected', true],
      ['/complaints', 'protected', true],
      ['/complaints/private-id', 'protected', true],
      ['/future-citizen-feature', 'protected', false],
    ] as const;

    for (const [pathname, access, requiresSession] of routeMatrix) {
      assert.equal(getCitizenRouteAccess(pathname), access, pathname);
      assert.equal(citizenRouteRequiresSession(pathname), requiresSession, pathname);
    }
  });

  it('redirects protected and callback surfaces without requiring Supabase configuration', async () => {
    Reflect.set(process.env, 'NEXT_PUBLIC_CITIZEN_ACCESS_MODE', 'public-only');

    const response = await proxy(
      new NextRequest('https://citizen.example/auth/callback?code=secret-recovery-code'),
    );

    assert.equal(response.status, 307);
    assert.equal(
      response.headers.get('location'),
      `https://citizen.example${CITIZEN_ACCESS_UNAVAILABLE_PATH}`,
    );
    assert.doesNotMatch(response.headers.get('location') ?? '', /secret-recovery-code/u);
  });

  it('serves public transparency routes without invoking session middleware', async () => {
    Reflect.set(process.env, 'NEXT_PUBLIC_CITIZEN_ACCESS_MODE', 'public-only');

    const response = await proxy(
      new NextRequest('https://citizen.example/transparency?status=reported'),
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-middleware-next'), '1');
    assert.equal(response.headers.get('location'), null);
  });

  it('blocks protected API fetches while leaving anonymous transparency fetches available', async () => {
    Reflect.set(process.env, 'NEXT_PUBLIC_CITIZEN_ACCESS_MODE', 'public-only');
    Reflect.set(process.env, 'NEXT_PUBLIC_API_URL', 'https://api.example');
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      return new Response(
        JSON.stringify({ data: { hasMore: false, items: [], nextCursor: null } }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 },
      );
    }) as typeof fetch;

    await assert.rejects(
      apiRequest('/api/v1/me', { accessToken: 'must-not-be-used' }),
      CitizenAccessUnavailableError,
    );
    assert.equal(fetchCalls, 0);

    const publicResult = await listPublicComplaints({
      east: 73,
      limit: 10,
      north: 19,
      south: 18,
      west: 72,
      zoom: 12,
    });
    assert.deepEqual(publicResult, { hasMore: false, items: [], nextCursor: null });
    assert.equal(fetchCalls, 1);
  });
});
