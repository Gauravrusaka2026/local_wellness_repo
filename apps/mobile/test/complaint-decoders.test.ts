import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  decodeComplaintDraft,
  decodeComplaintMediaUploadIntent,
  decodeRoutingCategories,
} from '../src/complaints/response-decoders';

const media = {
  complaintId: null,
  createdAt: '2026-07-14T10:00:00.000Z',
  draftId: '11111111-1111-4111-8111-111111111111',
  id: '33333333-3333-4333-8333-333333333333',
  metadata: {
    byteSize: 1_024,
    captureLocation: null,
    captureSource: 'live_camera',
    capturedAt: '2026-07-14T10:00:00.000Z',
    durationMilliseconds: null,
    heightPixels: 720,
    kind: 'photo',
    mimeType: 'image/jpeg',
    sha256: 'a'.repeat(64),
    widthPixels: 1_280,
  },
  moderationStatus: 'pending',
  processingStatus: 'pending',
  updatedAt: '2026-07-14T10:00:00.000Z',
  uploadStatus: 'reserved',
};

describe('complaint response decoders', () => {
  it('accepts only the public verified category response shape', () => {
    const category = {
      code: 'POTHOLE',
      description: null,
      id: '22222222-2222-4222-8222-222222222222',
      isEmergency: false,
      name: 'Pothole',
      parentCategoryId: null,
      requiresAsset: false,
      requiresLocation: true,
    };

    assert.deepEqual(decodeRoutingCategories([category]), [category]);
    assert.throws(() => decodeRoutingCategories([{ ...category, officerPhone: 'private' }]));
  });

  it('rejects malformed or secret-bearing draft responses', () => {
    const draft = {
      assetId: null,
      categoryId: null,
      createdAt: '2026-07-14T10:00:00.000Z',
      description: null,
      expiresAt: '2026-07-15T10:00:00.000Z',
      id: '11111111-1111-4111-8111-111111111111',
      location: null,
      media: [],
      status: 'active',
      updatedAt: '2026-07-14T10:00:00.000Z',
      visibility: 'private',
    };

    assert.deepEqual(decodeComplaintDraft(draft), draft);
    assert.throws(() => decodeComplaintDraft({ ...draft, authorization: 'Bearer secret' }));
  });

  it('decodes a signed upload target only in the transient intent response', () => {
    const captureLocation = {
      accuracyMeters: 12,
      capturedAt: '2026-07-14T10:00:00.000Z',
      deviceRecordedAt: '2026-07-14T10:00:01.000Z',
      id: '44444444-4444-4444-8444-444444444444',
      isMockLocation: false,
      latitude: 18.5204,
      longitude: 73.8567,
      provider: 'gps',
      verificationScore: 0.98,
      verificationStatus: 'verified',
    };
    const intent = {
      expiresAt: '2026-07-14T10:10:00.000Z',
      media: { ...media, metadata: { ...media.metadata, captureLocation } },
      upload: {
        bucket: 'complaint-originals-private',
        objectPath: 'user/draft/media',
        token: 'transient-token',
      },
    };

    assert.deepEqual(decodeComplaintMediaUploadIntent(intent), intent);
    assert.throws(() =>
      decodeComplaintMediaUploadIntent({ ...intent, upload: { ...intent.upload, token: '' } }),
    );
    assert.throws(() =>
      decodeComplaintMediaUploadIntent({
        ...intent,
        media: {
          ...intent.media,
          metadata: {
            ...intent.media.metadata,
            captureLocation: { ...captureLocation, authorization: 'Bearer secret' },
          },
        },
      }),
    );
  });
});
