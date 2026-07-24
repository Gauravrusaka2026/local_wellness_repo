import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  decodeComplaintDraft,
  decodeComplaintMediaUploadIntent,
  decodeComplaintReceipt,
  decodeComplaintResolutionContext,
  decodeComplaintTaxonomyCatalog,
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

  it('decodes only consistent public-safe detailed complaint taxonomy items', () => {
    const item = {
      handoffActions: [],
      id: '11111111-1111-4111-8111-111111111112',
      primaryCategoryId: '11111111-1111-4111-8111-111111111113',
      primaryCode: 'SWM',
      primaryName: 'Solid Waste Management',
      subcategoryCode: 'SWM-001',
      subcategoryName: 'Garbage dump',
      subcategoryDescription: 'Garbage accumulated in a public place.',
      workflowType: 'PUBLIC_HEALTH',
      sensitivityClass: 'PUBLIC',
      routingStatus: 'mapped',
      routingProfileCategoryId: '22222222-2222-4222-8222-222222222222',
      routingProfileCode: 'garbage_dump',
      routingProfileName: 'Garbage dump',
      submissionAvailability: 'available',
      requiresAsset: false,
      requiresLocation: true,
      isEmergency: false,
      minimumMediaCount: 1,
      maximumMediaCount: 5,
      requiredAttributes: [],
      recommendedMediaKinds: ['photo'],
    };

    assert.deepEqual(decodeComplaintTaxonomyCatalog([item]), [item]);
    assert.throws(() => decodeComplaintTaxonomyCatalog([{ ...item, routingProfileName: null }]));
    assert.throws(() =>
      decodeComplaintTaxonomyCatalog([{ ...item, recipientEmail: 'private@example.test' }]),
    );
    assert.throws(() => decodeComplaintTaxonomyCatalog([item, item]));
    assert.throws(() =>
      decodeComplaintTaxonomyCatalog([
        item,
        {
          ...item,
          id: '11111111-1111-4111-8111-111111111114',
          primaryCategoryId: '11111111-1111-4111-8111-111111111115',
          subcategoryCode: 'SWM-002',
        },
      ]),
    );

    const protectedHandoff = {
      ...item,
      handoffActions: [
        {
          description: 'Call emergency services when anyone is in immediate danger.',
          key: 'call_112',
          kind: 'call',
          label: 'Call 112',
          priority: 10,
          target: '112',
        },
        {
          description: 'Open the official Mumbai Police complaint page.',
          key: 'open_mumbai_police',
          kind: 'browser',
          label: 'Open Mumbai Police',
          priority: 20,
          target: 'https://mumbaipolice.gov.in/OnlineComplaints',
        },
      ],
      routingProfileCategoryId: null,
      routingProfileCode: null,
      routingProfileName: null,
      routingStatus: 'protected_handoff',
      sensitivityClass: 'EMERGENCY_PRIVATE',
      submissionAvailability: 'unavailable',
    } as const;

    assert.deepEqual(decodeComplaintTaxonomyCatalog([protectedHandoff]), [protectedHandoff]);
    assert.throws(() =>
      decodeComplaintTaxonomyCatalog([{ ...protectedHandoff, handoffActions: [] }]),
    );
    assert.throws(() =>
      decodeComplaintTaxonomyCatalog([
        {
          ...protectedHandoff,
          handoffActions: [
            {
              ...protectedHandoff.handoffActions[0],
              target: '+91112',
            },
          ],
        },
      ]),
    );
    assert.throws(() =>
      decodeComplaintTaxonomyCatalog([
        {
          ...protectedHandoff,
          handoffActions: [
            {
              ...protectedHandoff.handoffActions[1],
              target: 'http://mumbaipolice.gov.in/OnlineComplaints',
            },
          ],
        },
      ]),
    );
    assert.throws(() => decodeComplaintTaxonomyCatalog([{ ...item, sensitivityClass: 'PRIVATE' }]));
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

  it('normalizes the first-submit routing category while validating it against the receipt', () => {
    const categoryId = '22222222-2222-4222-8222-222222222222';
    const receipt = {
      categoryId,
      complaintNumber: 'LW-20260724-00000007',
      id: '11111111-1111-4111-8111-111111111111',
      routing: {
        categoryId,
        confidence: { band: 'high', score: 1 },
        explanation: {
          fallbackDepth: 0,
          fallbackUsed: false,
          jurisdictionStatus: 'resolved',
          localBodyBoundaryVersionId: '33333333-3333-4333-8333-333333333333',
          policyId: '44444444-4444-4444-8444-444444444444',
          policyVersion: 1,
          policyVersionId: '55555555-5555-4555-8555-555555555555',
          reason: 'The captured location resolved to a configured ward.',
          selectedRoutingRuleId: '66666666-6666-4666-8666-666666666666',
          selectedRoutingRuleVersionId: '77777777-7777-4777-8777-777777777777',
          wardBoundaryVersionId: '88888888-8888-4888-8888-888888888888',
        },
        status: 'routed',
        target: {
          assetId: null,
          assetMatchDistanceMeters: null,
          assetOwnershipVersionId: null,
          assetTypeId: null,
          assetVersionId: null,
          authorityDepartmentId: '99999999-9999-4999-8999-999999999999',
          authorityId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          departmentId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          localBodyId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          officerAssignmentId: null,
          officerRoleId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          wardId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        },
      },
      status: 'submitted',
      submittedAt: '2026-07-24T07:24:01.297061+00:00',
      visibility: 'private',
    } as const;

    const decoded = decodeComplaintReceipt(receipt);
    assert.equal(decoded.complaintNumber, receipt.complaintNumber);
    assert.equal(Object.hasOwn(decoded.routing, 'categoryId'), false);
    assert.deepEqual(
      decodeComplaintReceipt({
        ...receipt,
        routing: {
          confidence: receipt.routing.confidence,
          explanation: receipt.routing.explanation,
          status: receipt.routing.status,
          target: receipt.routing.target,
        },
      }),
      decoded,
    );
    assert.throws(() =>
      decodeComplaintReceipt({
        ...receipt,
        routing: {
          ...receipt.routing,
          categoryId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        },
      }),
    );
    assert.throws(() =>
      decodeComplaintReceipt({
        ...receipt,
        routing: { ...receipt.routing, recipientEmail: 'private@example.test' },
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
