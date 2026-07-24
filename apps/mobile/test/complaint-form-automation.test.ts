import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ComplaintDraft } from '@local-wellness/types';

import {
  createComplaintDetailsFingerprint,
  createComplaintDuplicateCheckFingerprint,
  getComplaintLocationRecoveryAction,
} from '../src/complaints/complaint-form-automation';

const draft = (overrides: Partial<ComplaintDraft> = {}): ComplaintDraft =>
  ({
    assetId: null,
    categoryId: '11111111-1111-4111-8111-111111111111',
    createdAt: '2026-07-24T08:00:00.000Z',
    customAttributes: {},
    description: 'Overflowing public bin',
    expiresAt: '2026-08-24T08:00:00.000Z',
    id: '22222222-2222-4222-8222-222222222222',
    location: {
      accuracyMeters: 12,
      capturedAt: '2026-07-24T08:01:00.000Z',
      deviceRecordedAt: '2026-07-24T08:01:00.000Z',
      id: '33333333-3333-4333-8333-333333333333',
      isMockLocation: false,
      latitude: 19.12,
      longitude: 72.85,
      provider: 'gps',
      verificationScore: 1,
      verificationStatus: 'verified',
    },
    media: [],
    status: 'active',
    updatedAt: '2026-07-24T08:01:00.000Z',
    visibility: 'private',
    ...overrides,
  }) as ComplaintDraft;

describe('complaint form automation fingerprints', () => {
  it('shows location controls only when explicit recovery is necessary', () => {
    assert.equal(
      getComplaintLocationRecoveryAction({
        automaticStatus: 'checking',
        hasLocation: false,
        locationEligible: false,
      }),
      null,
    );
    assert.equal(
      getComplaintLocationRecoveryAction({
        automaticStatus: 'ready',
        hasLocation: true,
        locationEligible: true,
      }),
      null,
    );
    assert.equal(
      getComplaintLocationRecoveryAction({
        automaticStatus: 'permission-required',
        hasLocation: false,
        locationEligible: false,
      }),
      'capture',
    );
    assert.equal(
      getComplaintLocationRecoveryAction({
        automaticStatus: 'error',
        hasLocation: false,
        locationEligible: false,
      }),
      'capture',
    );
    assert.equal(
      getComplaintLocationRecoveryAction({
        automaticStatus: 'idle',
        hasLocation: true,
        locationEligible: false,
      }),
      'refresh',
    );
  });

  it('normalizes harmless whitespace and attribute ordering before autosave', () => {
    const first = createComplaintDetailsFingerprint({
      categoryId: null,
      customAttributes: { landmark: '  Station  ', urgent: false },
      description: '  Broken light ',
    });
    const second = createComplaintDetailsFingerprint({
      categoryId: null,
      customAttributes: { urgent: false, landmark: 'Station' },
      description: 'Broken light',
    });

    assert.equal(first, second);
  });

  it('changes the duplicate-check key only when stable complaint evidence changes', () => {
    const original = draft();
    const fingerprint = createComplaintDuplicateCheckFingerprint(original);

    assert.equal(createComplaintDuplicateCheckFingerprint({ ...original }), fingerprint);
    assert.notEqual(
      createComplaintDuplicateCheckFingerprint({
        ...original,
        description: 'Overflowing bin beside bus stop',
      }),
      fingerprint,
    );
    assert.notEqual(
      createComplaintDuplicateCheckFingerprint({
        ...original,
        location: original.location ? { ...original.location, id: 'location-recaptured' } : null,
      }),
      fingerprint,
    );
  });

  it('does not schedule duplicate work before category and location exist', () => {
    assert.equal(createComplaintDuplicateCheckFingerprint(draft({ categoryId: null })), null);
    assert.equal(createComplaintDuplicateCheckFingerprint(draft({ location: null })), null);
  });
});
