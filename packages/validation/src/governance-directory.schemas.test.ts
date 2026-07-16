import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  governingBodyResolutionSchema,
  resolveGoverningBodiesRequestSchema,
} from './governance-directory.schemas.js';

const entity = (kind: 'state' | 'authority' | 'local_body') => ({
  kind,
  name: `Verified ${kind}`,
  type: kind,
  verificationStatus: 'verified' as const,
  lastVerifiedOn: '2026-07-16',
  sourceUrl: `https://example.gov.test/${kind}`,
});

const match = {
  state: entity('state'),
  district: null,
  taluka: null,
  authority: entity('authority'),
  localBody: entity('local_body'),
  ward: null,
};

describe('governing-body validation schemas', () => {
  it('accepts a strict resolved public projection', () => {
    assert.equal(
      governingBodyResolutionSchema.safeParse({
        status: 'resolved',
        reason: 'verified_governing_body_match',
        maximumAccuracyMeters: 100,
        matches: [match],
      }).success,
      true,
    );
  });

  it('rejects inconsistent resolution cardinality', () => {
    assert.equal(
      governingBodyResolutionSchema.safeParse({
        status: 'resolved',
        reason: 'verified_governing_body_match',
        maximumAccuracyMeters: 100,
        matches: [],
      }).success,
      false,
    );
  });

  it('rejects unverified entity summaries and extra public fields', () => {
    assert.equal(
      governingBodyResolutionSchema.safeParse({
        status: 'resolved',
        reason: 'verified_governing_body_match',
        maximumAccuracyMeters: 100,
        matches: [
          {
            ...match,
            localBody: {
              ...match.localBody,
              verificationStatus: 'unverified',
              phone: '+910000000000',
            },
          },
        ],
      }).success,
      false,
    );
  });

  it('reuses strict location-evidence validation for requests', () => {
    assert.equal(
      resolveGoverningBodiesRequestSchema.safeParse({
        latitude: 18.52,
        longitude: 73.86,
        accuracyMeters: 25,
        capturedAt: '2026-07-16T10:00:00.000+00:00',
      }).success,
      true,
    );
    assert.equal(
      resolveGoverningBodiesRequestSchema.safeParse({
        latitude: 18.52,
        longitude: 73.86,
        accuracyMeters: 25,
        capturedAt: '2026-07-16T10:00:00.000+00:00',
        municipality: 'hardcoded',
      }).success,
      false,
    );
  });
});
