import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  DuplicateCandidateEvidence,
  DuplicateDetectionInput,
  DuplicateDetectionPolicy,
} from '@local-wellness/types';

import { detectDuplicates } from '../duplicate-detection.js';
import { RoutingConfigurationError } from '../errors.js';

const input: DuplicateDetectionInput = {
  categoryId: '10000000-0000-4000-8000-000000000001',
  location: { latitude: 18.52, longitude: 73.85 },
  occurredAt: '2026-07-13T10:00:00.000Z',
  assetId: '20000000-0000-4000-8000-000000000001',
  description: 'Waste is blocking the footpath.',
  mediaHashes: ['a'.repeat(64), 'b'.repeat(64)],
};

const policy: DuplicateDetectionPolicy = {
  id: '30000000-0000-4000-8000-000000000001',
  versionId: '30000000-0000-4000-8000-000000000002',
  version: 1,
  maximumDistanceMeters: 250,
  maximumAgeSeconds: 86_400,
  minimumScore: 0.6,
  maximumResults: 2,
  weights: {
    category: 2,
    location: 2,
    time: 1,
    description: 2,
    media: 2,
    asset: 1,
  },
};

const closeMatch: DuplicateCandidateEvidence = {
  complaintId: '40000000-0000-4000-8000-000000000001',
  categoryId: input.categoryId,
  assetId: input.assetId,
  distanceMeters: 10,
  ageSeconds: 600,
  descriptionSimilarity: 0.9,
  matchingMediaHashes: 1,
};

describe('duplicate detection', () => {
  it('scores, filters, and deterministically ranks provider evidence using DB policy weights', () => {
    const weakerMatch: DuplicateCandidateEvidence = {
      ...closeMatch,
      complaintId: '40000000-0000-4000-8000-000000000002',
      distanceMeters: 200,
      ageSeconds: 80_000,
      descriptionSimilarity: 0.2,
      matchingMediaHashes: 0,
    };
    const result = detectDuplicates(input, [weakerMatch, closeMatch], policy);

    assert.equal(result.policyId, policy.id);
    assert.equal(result.policyVersionId, policy.versionId);
    assert.equal(result.matches[0]?.complaintId, closeMatch.complaintId);
    assert.equal((result.matches[0]?.score ?? 0) > (result.matches[1]?.score ?? 0), true);
    assert.equal(
      result.matches[0]?.factors.some((factor) => factor.code === 'asset'),
      true,
    );
  });

  it('omits optional evidence factors when the request did not supply them', () => {
    const result = detectDuplicates(
      { ...input, assetId: null, description: null, mediaHashes: [] },
      [{ ...closeMatch, descriptionSimilarity: null, matchingMediaHashes: 0 }],
      { ...policy, minimumScore: 0 },
    );

    assert.deepEqual(
      result.matches[0]?.factors.map((factor) => factor.code),
      ['category', 'location', 'time'],
    );
  });

  it('excludes candidates outside the DB-policy distance or time window', () => {
    const result = detectDuplicates(
      input,
      [
        {
          ...closeMatch,
          complaintId: '40000000-0000-4000-8000-000000000010',
          distanceMeters: policy.maximumDistanceMeters + 1,
        },
        {
          ...closeMatch,
          complaintId: '40000000-0000-4000-8000-000000000011',
          ageSeconds: policy.maximumAgeSeconds + 1,
        },
      ],
      { ...policy, minimumScore: 0 },
    );

    assert.deepEqual(result.matches, []);
  });

  it('rejects malformed candidate evidence instead of silently normalizing it', () => {
    assert.throws(
      () => detectDuplicates(input, [{ ...closeMatch, distanceMeters: -1 }], policy),
      RoutingConfigurationError,
    );
  });

  it('rejects more matching media hashes than the request supplied', () => {
    assert.throws(
      () =>
        detectDuplicates(
          input,
          [{ ...closeMatch, matchingMediaHashes: input.mediaHashes.length + 1 }],
          policy,
        ),
      RoutingConfigurationError,
    );
  });

  it('requires zero matching media hashes when the request supplied none', () => {
    assert.throws(
      () =>
        detectDuplicates(
          { ...input, mediaHashes: [] },
          [{ ...closeMatch, matchingMediaHashes: 1 }],
          policy,
        ),
      RoutingConfigurationError,
    );
  });

  it('rejects a policy with no usable score weight', () => {
    assert.throws(
      () =>
        detectDuplicates(input, [closeMatch], {
          ...policy,
          weights: {
            category: 0,
            location: 0,
            time: 0,
            description: 0,
            media: 0,
            asset: 0,
          },
        }),
      RoutingConfigurationError,
    );
  });
});
