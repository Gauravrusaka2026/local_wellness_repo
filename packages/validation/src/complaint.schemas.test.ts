import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  complaintDraftIdParametersSchema,
  complaintListQuerySchema,
  complaintLocationCaptureSchema,
  complaintMediaIdParametersSchema,
  createComplaintDraftSchema,
  createComplaintMediaUploadIntentSchema,
  finalizeComplaintMediaSchema,
  idempotencyKeySchema,
  submitComplaintSchema,
  updateComplaintDraftSchema,
} from './complaint.schemas.js';

const draftId = '11111111-1111-4111-8111-111111111111';
const validLocation = {
  latitude: 18.5204,
  longitude: 73.8567,
  accuracyMeters: 12,
  capturedAt: '2026-07-14T10:00:00+05:30',
  deviceRecordedAt: '2026-07-14T10:00:01+05:30',
  provider: 'fused' as const,
  isMockLocation: false,
};

describe('complaint request validation', () => {
  it('accepts explicit location-provider and mock-location evidence', () => {
    assert.deepEqual(complaintLocationCaptureSchema.parse(validLocation), validLocation);
    assert.equal(
      complaintLocationCaptureSchema.safeParse({ ...validLocation, isMockLocation: null }).success,
      true,
    );
  });

  it('requires offset timestamps and bounded WGS84 location evidence', () => {
    assert.equal(
      complaintLocationCaptureSchema.safeParse({
        ...validLocation,
        capturedAt: '2026-07-14T10:00:00',
      }).success,
      false,
    );
    assert.equal(
      complaintLocationCaptureSchema.safeParse({ ...validLocation, longitude: 180.1 }).success,
      false,
    );
    assert.equal(
      complaintLocationCaptureSchema.safeParse({ ...validLocation, accuracyMeters: 5_001 }).success,
      false,
    );
  });

  it('keeps routing targets, assignments, statuses, and visibility server-owned', () => {
    const forbiddenFields = [
      'authorityId',
      'departmentId',
      'officerRoleId',
      'assignmentId',
      'status',
      'visibility',
    ];

    for (const field of forbiddenFields) {
      assert.equal(createComplaintDraftSchema.safeParse({ [field]: draftId }).success, false);
    }

    assert.equal(
      submitComplaintSchema.safeParse({ routingTarget: { departmentId: draftId } }).success,
      false,
    );
  });

  it('allows an empty new draft but requires at least one field in a patch', () => {
    assert.deepEqual(createComplaintDraftSchema.parse({}), {});
    assert.equal(updateComplaintDraftSchema.safeParse({}).success, false);
    assert.deepEqual(updateComplaintDraftSchema.parse({ categoryId: null }), {
      categoryId: null,
    });
    assert.equal(createComplaintDraftSchema.safeParse({ categoryId: null }).success, false);
    assert.deepEqual(updateComplaintDraftSchema.parse({ description: '  Broken light  ' }), {
      description: 'Broken light',
    });
  });

  it('accepts bounded category attributes and rejects unsafe keys or empty values', () => {
    assert.deepEqual(
      updateComplaintDraftSchema.parse({
        customAttributes: { flooding_observed: true, hazard_level: 'high' },
      }),
      { customAttributes: { flooding_observed: true, hazard_level: 'high' } },
    );
    assert.equal(
      updateComplaintDraftSchema.safeParse({ customAttributes: { 'Unsafe Key': 'value' } }).success,
      false,
    );
    assert.equal(
      updateComplaintDraftSchema.safeParse({ customAttributes: { hazard_level: '   ' } }).success,
      false,
    );
    assert.equal(
      updateComplaintDraftSchema.safeParse({
        customAttributes: Object.fromEntries(
          Array.from({ length: 21 }, (_, index) => [`field_${index}`, 'value']),
        ),
      }).success,
      false,
    );
  });

  it('accepts supported photo metadata with a lowercase SHA-256 checksum', () => {
    const result = createComplaintMediaUploadIntentSchema.safeParse({
      draftId,
      kind: 'photo',
      captureSource: 'live_camera',
      mimeType: 'image/jpeg',
      byteSize: 1_024,
      sha256: 'a'.repeat(64),
      capturedAt: '2026-07-14T10:00:00+05:30',
      widthPixels: 1_920,
      heightPixels: 1_080,
      captureLocation: validLocation,
    });

    assert.equal(result.success, true);
  });

  it('rejects mismatched media kinds, capture sources, dimensions, and durations', () => {
    const base = {
      draftId,
      byteSize: 1_024,
      sha256: 'a'.repeat(64),
      capturedAt: '2026-07-14T10:00:00+05:30',
    };

    assert.equal(
      createComplaintMediaUploadIntentSchema.safeParse({
        ...base,
        kind: 'photo',
        captureSource: 'live_camera',
        mimeType: 'video/mp4',
      }).success,
      false,
    );
    assert.equal(
      createComplaintMediaUploadIntentSchema.safeParse({
        ...base,
        kind: 'voice',
        captureSource: 'live_camera',
        mimeType: 'audio/mp4',
        durationMilliseconds: 2_000,
      }).success,
      false,
    );
    assert.equal(
      createComplaintMediaUploadIntentSchema.safeParse({
        ...base,
        kind: 'video',
        captureSource: 'live_video',
        mimeType: 'video/mp4',
        widthPixels: 1_920,
      }).success,
      false,
    );
    assert.equal(
      createComplaintMediaUploadIntentSchema.safeParse({
        ...base,
        kind: 'video',
        captureSource: 'live_video',
        mimeType: 'video/mp4',
      }).success,
      false,
    );
  });

  it('rejects uppercase, padded, and malformed media digests', () => {
    for (const sha256 of ['A'.repeat(64), ` ${'a'.repeat(64)}`, 'not-a-digest']) {
      assert.equal(
        finalizeComplaintMediaSchema.safeParse({ byteSize: 1_024, sha256 }).success,
        false,
      );
    }
  });

  it('validates UUID parameters, bounded pagination, and opaque cursors', () => {
    assert.equal(complaintDraftIdParametersSchema.safeParse({ draftId }).success, true);
    assert.equal(complaintMediaIdParametersSchema.safeParse({ mediaId: 'media-1' }).success, false);
    assert.deepEqual(complaintListQuerySchema.parse({}), { limit: 25 });
    assert.deepEqual(complaintListQuerySchema.parse({ cursor: 'abc_123', limit: '100' }), {
      cursor: 'abc_123',
      limit: 100,
    });
    assert.equal(complaintListQuerySchema.safeParse({ limit: 101 }).success, false);
    assert.equal(complaintListQuerySchema.safeParse({ cursor: 'not/a/cursor' }).success, false);
  });

  it('accepts safe idempotency keys and rejects short or unsafe values', () => {
    assert.equal(
      idempotencyKeySchema.safeParse('018f8b20-7f64-7af1-9d90-123456789abc').success,
      true,
    );
    assert.equal(idempotencyKeySchema.safeParse('short').success, false);
    assert.equal(idempotencyKeySchema.safeParse(`unsafe key ${'x'.repeat(20)}`).success, false);
    assert.equal(idempotencyKeySchema.safeParse(`x${'a'.repeat(128)}`).success, false);
  });

  it('accepts unique acknowledged duplicate suggestions only', () => {
    assert.equal(
      submitComplaintSchema.safeParse({ acknowledgedDuplicateSuggestionIds: [draftId] }).success,
      true,
    );
    assert.equal(
      submitComplaintSchema.safeParse({
        acknowledgedDuplicateSuggestionIds: [draftId, draftId],
      }).success,
      false,
    );
    assert.equal(
      submitComplaintSchema.safeParse({ emergencyDisclaimerAcknowledged: false }).success,
      false,
    );
  });
});
