import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  categoryIdParametersSchema,
  checkDuplicatesRequestSchema,
  resolveJurisdictionRequestSchema,
  resolveRoutingRequestSchema,
} from '../routing.schemas.js';

const validLocation = {
  latitude: 18.5204,
  longitude: 73.8567,
  accuracyMeters: 12,
  capturedAt: '2026-07-13T10:00:00+05:30',
};

const categoryId = '11111111-1111-4111-8111-111111111111';

describe('routing request validation', () => {
  it('accepts finite WGS84 coordinates including valid boundary values', () => {
    assert.equal(
      resolveJurisdictionRequestSchema.safeParse({
        ...validLocation,
        latitude: -90,
        longitude: 180,
      }).success,
      true,
    );
  });

  it('rejects out-of-range coordinates and unreasonable accuracy values', () => {
    assert.equal(
      resolveJurisdictionRequestSchema.safeParse({ ...validLocation, latitude: 90.01 }).success,
      false,
    );
    assert.equal(
      resolveJurisdictionRequestSchema.safeParse({ ...validLocation, accuracyMeters: -1 }).success,
      false,
    );
    assert.equal(
      resolveJurisdictionRequestSchema.safeParse({
        ...validLocation,
        accuracyMeters: Number.POSITIVE_INFINITY,
      }).success,
      false,
    );
    assert.equal(
      resolveJurisdictionRequestSchema.safeParse({ ...validLocation, accuracyMeters: 5_001 })
        .success,
      false,
    );
  });

  it('requires an offset-aware capture timestamp', () => {
    assert.equal(
      resolveJurisdictionRequestSchema.safeParse({
        ...validLocation,
        capturedAt: '2026-07-13T10:00:00',
      }).success,
      false,
    );
  });

  it('accepts only identifiers that routing may treat as citizen evidence', () => {
    assert.equal(
      resolveRoutingRequestSchema.safeParse({ ...validLocation, categoryId }).success,
      true,
    );
    assert.equal(
      resolveRoutingRequestSchema.safeParse({
        ...validLocation,
        categoryId,
        departmentId: '22222222-2222-4222-8222-222222222222',
      }).success,
      false,
    );
  });

  it('validates optional duplicate evidence without accepting repeated media digests', () => {
    const mediaHash = 'a'.repeat(64);

    assert.equal(
      checkDuplicatesRequestSchema.safeParse({
        ...validLocation,
        categoryId,
        description: '  overflowing waste near the footpath  ',
        mediaHashes: [mediaHash],
      }).success,
      true,
    );
    assert.equal(
      checkDuplicatesRequestSchema.safeParse({
        ...validLocation,
        categoryId,
        mediaHashes: [mediaHash, mediaHash],
      }).success,
      false,
    );
    assert.equal(
      checkDuplicatesRequestSchema.safeParse({
        ...validLocation,
        categoryId,
        mediaHashes: ['not-a-digest'],
      }).success,
      false,
    );
  });

  it('validates category path parameters as UUIDs', () => {
    assert.equal(categoryIdParametersSchema.safeParse({ categoryId }).success, true);
    assert.equal(
      categoryIdParametersSchema.safeParse({ categoryId: 'category-code' }).success,
      false,
    );
  });
});
