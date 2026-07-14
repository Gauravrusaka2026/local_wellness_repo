import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ComplaintDraft, ComplaintLocationCapture } from '@local-wellness/types';

import {
  complaintCaptureReducer,
  getDraftReadiness,
  initialComplaintCaptureState,
} from '../src/complaints/capture-state';
import { formatComplaintIdempotencyKey } from '../src/complaints/idempotency-format';
import {
  assessLocation,
  assessMediaDistance,
  distanceBetweenLocationsMeters,
  inferLocationProvider,
} from '../src/complaints/location-evidence';
import { buildMediaUploadIntentInput } from '../src/complaints/media-upload';
import type { PreparedComplaintMedia } from '../src/complaints/media-service';
import {
  createPendingMediaResume,
  decodePendingMediaResume,
  pendingMediaToPreparedMedia,
  serializePendingMediaResume,
} from '../src/complaints/resume-record';

const draft = (overrides: Partial<ComplaintDraft> = {}): ComplaintDraft => ({
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
  ...overrides,
});

const location = (overrides: Partial<ComplaintLocationCapture> = {}): ComplaintLocationCapture => ({
  accuracyMeters: 12,
  capturedAt: '2026-07-14T10:00:00.000Z',
  deviceRecordedAt: '2026-07-14T10:00:01.000Z',
  isMockLocation: false,
  latitude: 18.5204,
  longitude: 73.8567,
  provider: 'gps',
  ...overrides,
});

describe('complaint capture reducer and readiness', () => {
  it('keeps verified categories while clearing a completed draft', () => {
    const categories = [
      {
        code: 'POTHOLE',
        description: null,
        id: '22222222-2222-4222-8222-222222222222',
        isEmergency: false,
        name: 'Pothole',
        parentCategoryId: null,
        requiresAsset: false,
        requiresLocation: true,
      },
    ];
    const loaded = complaintCaptureReducer(initialComplaintCaptureState, {
      categories,
      type: 'categories_loaded',
    });
    const withDraft = complaintCaptureReducer(loaded, {
      draft: draft(),
      type: 'draft_loaded',
    });
    const cleared = complaintCaptureReducer(withDraft, { type: 'draft_cleared' });

    assert.equal(cleared.draft, null);
    assert.deepEqual(cleared.categories, categories);
  });

  it('reports every missing server submission prerequisite', () => {
    assert.deepEqual(getDraftReadiness(draft()).missing, [
      'category',
      'description',
      'location',
      'media',
    ]);
  });

  it('requires a server-verified location and explicit duplicate acknowledgement', () => {
    const withLowAccuracyLocation = draft({
      categoryId: '22222222-2222-4222-8222-222222222222',
      description: 'Road surface is damaged.',
      location: {
        ...location(),
        id: '33333333-3333-4333-8333-333333333333',
        verificationScore: 0.4,
        verificationStatus: 'low_accuracy',
      },
    });
    assert.equal(getDraftReadiness(withLowAccuracyLocation).missing.includes('location'), true);

    const withDuplicates = complaintCaptureReducer(initialComplaintCaptureState, {
      duplicateCheck: {
        checkedAt: '2026-07-14T10:01:00.000Z',
        draftId: withLowAccuracyLocation.id,
        id: '44444444-4444-4444-8444-444444444444',
        policyId: '55555555-5555-4555-8555-555555555555',
        policyVersion: 1,
        policyVersionId: '66666666-6666-4666-8666-666666666666',
        suggestions: [],
      },
      type: 'duplicates_loaded',
    });
    const acknowledged = complaintCaptureReducer(withDuplicates, {
      type: 'duplicates_acknowledged',
      value: true,
    });
    assert.equal(acknowledged.duplicatesAcknowledged, true);
  });
});

describe('location evidence', () => {
  const now = Date.parse('2026-07-14T10:01:00.000Z');

  it('accepts fresh accurate device evidence and rejects risk states', () => {
    assert.equal(assessLocation(location(), now).status, 'verified');
    assert.equal(assessLocation(location({ accuracyMeters: 150 }), now).status, 'low_accuracy');
    assert.equal(assessLocation(location({ isMockLocation: true }), now).status, 'mocked');
    assert.equal(
      assessLocation(location({ capturedAt: '2026-07-14T09:50:00.000Z' }), now).status,
      'stale',
    );
    assert.equal(
      assessLocation(location({ capturedAt: '2026-07-14T10:04:00.000Z' }), now).status,
      'future',
    );
  });

  it('calculates media distance without retaining coordinates in resume state', () => {
    assert.equal(distanceBetweenLocationsMeters(location(), location()), 0);
    assert.equal(assessMediaDistance(location(), location()).isAcceptable, true);
    assert.equal(
      assessMediaDistance(location(), location({ latitude: 19.076, longitude: 72.8777 }))
        .isAcceptable,
      false,
    );
  });

  it('reports only device-supported location provider evidence', () => {
    assert.equal(inferLocationProvider({ gpsAvailable: true, networkAvailable: true }), 'fused');
    assert.equal(inferLocationProvider({ gpsAvailable: true }), 'gps');
    assert.equal(inferLocationProvider(null), 'unknown');
  });
});

describe('resume, idempotency, and upload helpers', () => {
  const prepared: PreparedComplaintMedia = {
    byteSize: 1_024,
    captureSource: 'live_camera',
    capturedAt: '2026-07-14T10:00:00.000Z',
    heightPixels: 720,
    kind: 'photo',
    localUri: 'file:///private/photo.jpg',
    mimeType: 'image/jpeg',
    sha256: 'a'.repeat(64),
    widthPixels: 1_280,
  };

  it('formats stable operation-specific keys', () => {
    const identifier = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    assert.equal(
      formatComplaintIdempotencyKey('submit', identifier),
      `complaint-submit:${identifier}`,
    );
  });

  it('stores only an allow-listed resumable media shape', () => {
    const resume = {
      ...createPendingMediaResume(prepared, 'complaint-media:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      latitude: 18.52,
      longitude: 73.85,
      token: 'signed-secret',
    };
    const serialized = serializePendingMediaResume(resume);

    assert.equal(serialized.includes('signed-secret'), false);
    assert.equal(serialized.includes('latitude'), false);
    assert.equal(serialized.includes('longitude'), false);
    const decoded = decodePendingMediaResume(JSON.parse(serialized));
    assert.ok(decoded);
    assert.deepEqual(pendingMediaToPreparedMedia(decoded), prepared);
  });

  it('builds a strict media intent without any routing target or upload token', () => {
    const input = buildMediaUploadIntentInput(draft().id, prepared, location());

    assert.equal(input.draftId, draft().id);
    assert.equal(input.sha256, prepared.sha256);
    assert.equal('token' in input, false);
    assert.equal('departmentId' in input, false);
  });
});
