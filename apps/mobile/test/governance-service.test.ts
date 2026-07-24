import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
  getOfficeDialUrl,
  getOfficeEmailUrl,
  isGovernanceLookupCurrent,
  resolveGoverningBodies,
} from '../src/governance/governance-service';

const originalApiUrl = process.env['EXPO_PUBLIC_API_URL'];
const originalFetch = globalThis.fetch;

beforeEach(() => {
  Reflect.set(process.env, 'EXPO_PUBLIC_API_URL', 'http://127.0.0.1:3001');
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiUrl === undefined) Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_API_URL');
  else Reflect.set(process.env, 'EXPO_PUBLIC_API_URL', originalApiUrl);
});

describe('mobile verified governance directory service', () => {
  it('sends only bounded location evidence and decodes verified public summaries', async () => {
    let requestedUrl = '';
    let requestedInit: RequestInit | undefined;
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      requestedUrl = String(input);
      requestedInit = init;
      return new Response(
        JSON.stringify({
          data: {
            matches: [
              {
                authority: {
                  kind: 'authority',
                  lastVerifiedOn: '2026-07-15',
                  name: 'Verified authority',
                  sourceUrl: 'https://government.example/authority',
                  type: 'municipal_corporation',
                  verificationStatus: 'verified',
                },
                district: null,
                localBody: {
                  kind: 'local_body',
                  lastVerifiedOn: '2026-07-15',
                  name: 'Verified local body',
                  sourceUrl: 'https://government.example/local-body',
                  type: 'municipal_corporation',
                  verificationStatus: 'verified',
                },
                offices: [
                  {
                    address: '1 Civic Street',
                    email: 'ward@example.gov.test',
                    lastVerifiedOn: '2026-07-15',
                    name: 'Verified Ward Office',
                    phone: '12345678; 87654321',
                    sourceUrl: 'https://government.example/ward-office',
                    type: 'ward_office',
                  },
                ],
                state: {
                  kind: 'state',
                  lastVerifiedOn: '2026-07-15',
                  name: 'Maharashtra',
                  sourceUrl: 'https://government.example/state',
                  type: 'state',
                  verificationStatus: 'verified',
                },
                taluka: null,
                ward: null,
              },
            ],
            maximumAccuracyMeters: 100,
            reason: 'verified_exact_match',
            status: 'resolved',
          },
          meta: { requestId: 'governance-mobile-test' },
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 },
      );
    }) as typeof fetch;

    const result = await resolveGoverningBodies('citizen-token', {
      accuracyMeters: 12,
      capturedAt: '2026-07-16T08:00:00.000Z',
      latitude: 18.52,
      longitude: 73.85,
    });

    assert.equal(requestedUrl, 'http://127.0.0.1:3001/api/v1/governance/bodies/resolve');
    assert.equal(requestedInit?.method, 'POST');
    assert.equal(
      (requestedInit?.headers as Record<string, string>)['Authorization'],
      'Bearer citizen-token',
    );
    assert.deepEqual(JSON.parse(String(requestedInit?.body)), {
      accuracyMeters: 12,
      capturedAt: '2026-07-16T08:00:00.000Z',
      latitude: 18.52,
      longitude: 73.85,
    });
    assert.equal(result.matches[0]?.localBody.name, 'Verified local body');
    assert.deepEqual(result.matches[0]?.offices, [
      {
        address: '1 Civic Street',
        email: 'ward@example.gov.test',
        lastVerifiedOn: '2026-07-15',
        name: 'Verified Ward Office',
        phone: '12345678; 87654321',
        sourceUrl: 'https://government.example/ward-office',
        type: 'ward_office',
      },
    ]);
  });

  it('rejects undeclared or unverified governance response fields', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          data: {
            matches: [],
            maximumAccuracyMeters: 100,
            reason: 'not_supported',
            status: 'unsupported',
            privateContact: 'must-not-leak',
          },
          meta: { requestId: 'governance-mobile-private-field-test' },
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 },
      )) as typeof fetch;

    await assert.rejects(() =>
      resolveGoverningBodies('citizen-token', {
        accuracyMeters: 12,
        capturedAt: '2026-07-16T08:00:00.000Z',
        latitude: 18.52,
        longitude: 73.85,
      }),
    );
  });

  it('builds bounded dialer and email targets from verified display contacts', () => {
    assert.equal(getOfficeDialUrl('26237932; 26239131'), 'tel:26237932');
    assert.equal(getOfficeDialUrl('23861426-23861429'), 'tel:23861426');
    assert.equal(getOfficeDialUrl('+91 22 2262 0251 ext 4360'), 'tel:+912222620251');
    assert.equal(getOfficeDialUrl('https://malicious.example'), null);
    assert.equal(getOfficeEmailUrl('ward@example.gov.test'), 'mailto:ward%40example.gov.test');
  });

  it('rejects a late lookup after blur, account change, or a newer request', () => {
    const request = { accessToken: 'account-one-token', generation: 3 };
    assert.equal(
      isGovernanceLookupCurrent(request, {
        accessToken: 'account-one-token',
        generation: 3,
        isFocused: true,
      }),
      true,
    );
    assert.equal(
      isGovernanceLookupCurrent(request, {
        accessToken: 'account-one-token',
        generation: 4,
        isFocused: true,
      }),
      false,
    );
    assert.equal(
      isGovernanceLookupCurrent(request, {
        accessToken: 'account-two-token',
        generation: 3,
        isFocused: true,
      }),
      false,
    );
    assert.equal(
      isGovernanceLookupCurrent(request, {
        accessToken: 'account-one-token',
        generation: 3,
        isFocused: false,
      }),
      false,
    );
  });

  it('rejects undeclared private fields nested inside an office contact', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          data: {
            matches: [
              {
                authority: {
                  kind: 'authority',
                  lastVerifiedOn: '2026-07-15',
                  name: 'Verified authority',
                  sourceUrl: 'https://government.example/authority',
                  type: 'municipal_corporation',
                  verificationStatus: 'verified',
                },
                district: null,
                localBody: {
                  kind: 'local_body',
                  lastVerifiedOn: '2026-07-15',
                  name: 'Verified local body',
                  sourceUrl: 'https://government.example/local-body',
                  type: 'municipal_corporation',
                  verificationStatus: 'verified',
                },
                offices: [
                  {
                    lastVerifiedOn: '2026-07-15',
                    name: 'Verified Ward Office',
                    officerMobile: '+910000000000',
                    sourceUrl: 'https://government.example/ward-office',
                    type: 'ward_office',
                  },
                ],
                state: {
                  kind: 'state',
                  lastVerifiedOn: '2026-07-15',
                  name: 'Maharashtra',
                  sourceUrl: 'https://government.example/state',
                  type: 'state',
                  verificationStatus: 'verified',
                },
                taluka: null,
                ward: null,
              },
            ],
            maximumAccuracyMeters: 100,
            reason: 'verified_exact_match',
            status: 'resolved',
          },
          meta: { requestId: 'governance-mobile-private-office-field-test' },
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 },
      )) as typeof fetch;

    await assert.rejects(() =>
      resolveGoverningBodies('citizen-token', {
        accuracyMeters: 12,
        capturedAt: '2026-07-16T08:00:00.000Z',
        latitude: 18.52,
        longitude: 73.85,
      }),
    );
  });
});
