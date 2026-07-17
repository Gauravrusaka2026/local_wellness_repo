import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  decodeComplaintDraft,
  decodeComplaintMediaUploadIntent,
  decodeComplaintResolutionContext,
  decodeRoutingAssetDiscovery,
  decodeRoutingCategoryCatalog,
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
      code: 'pothole',
      description: null,
      id: '22222222-2222-4222-8222-222222222222',
      isEmergency: false,
      maximumMediaCount: 5,
      minimumMediaCount: 1,
      name: 'Pothole',
      parentCategoryId: null,
      requiresAsset: false,
      requiresLocation: true,
      requiredAttributes: [],
      recommendedMediaKinds: ['photo'],
    };

    assert.deepEqual(decodeRoutingCategories([category]), [category]);
    assert.throws(() => decodeRoutingCategories([{ ...category, officerPhone: 'private' }]));
  });

  it('decodes explicit catalog availability and rejects implicit or secret-bearing items', () => {
    const item = {
      code: 'awaiting_verified_route',
      description: null,
      id: '22222222-2222-4222-8222-222222222222',
      isEmergency: false,
      maximumMediaCount: 5,
      minimumMediaCount: 1,
      name: 'Awaiting verified route',
      parentCategoryId: null,
      requiresAsset: false,
      requiresLocation: true,
      requiredAttributes: [],
      recommendedMediaKinds: ['photo'],
      submissionAvailability: 'unavailable',
    };

    assert.deepEqual(decodeRoutingCategoryCatalog([item]), [item]);
    const withoutAvailability: Record<string, unknown> = { ...item };
    Reflect.deleteProperty(withoutAvailability, 'submissionAvailability');
    assert.throws(() => decodeRoutingCategoryCatalog([withoutAvailability]));
    assert.throws(() => decodeRoutingCategoryCatalog([{ ...item, officerPhone: 'private' }]));
    assert.throws(() => decodeRoutingCategoryCatalog(Array.from({ length: 501 }, () => item)));
  });

  it('accepts only bounded, unique, public-safe nearby asset options', () => {
    const result = {
      assets: [
        {
          assetTypeName: 'Streetlight',
          displayName: 'Verified pole 24',
          distanceMeters: 8.25,
          id: '55555555-5555-4555-8555-555555555555',
        },
      ],
      categoryId: '22222222-2222-4222-8222-222222222222',
    };

    assert.deepEqual(decodeRoutingAssetDiscovery(result), result);
    assert.throws(() =>
      decodeRoutingAssetDiscovery({
        ...result,
        assets: [{ ...result.assets[0], ownerPhone: 'private' }],
      }),
    );
    assert.throws(() =>
      decodeRoutingAssetDiscovery({ ...result, assets: [result.assets[0], result.assets[0]] }),
    );
  });

  it('rejects malformed or secret-bearing draft responses', () => {
    const draft = {
      assetId: null,
      categoryId: null,
      createdAt: '2026-07-14T10:00:00.000Z',
      customAttributes: {},
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

  it('fails closed when no verified resolution policy is available', () => {
    const context = {
      complaintId: '11111111-1111-4111-8111-111111111111',
      availableReopenEvidence: [],
      escalations: [],
      feedback: [],
      latestResolution: null,
      policy: null,
      policyUnavailableReason: 'No operational policy is configured for this complaint.',
      reopenRequests: [],
      status: 'submitted',
      workflowVersion: 1,
    };

    assert.deepEqual(decodeComplaintResolutionContext(context), context);
    assert.throws(() =>
      decodeComplaintResolutionContext({ ...context, policyUnavailableReason: null }),
    );
    assert.throws(() =>
      decodeComplaintResolutionContext({ ...context, officerPhone: 'unexpected-private-field' }),
    );
  });
});
