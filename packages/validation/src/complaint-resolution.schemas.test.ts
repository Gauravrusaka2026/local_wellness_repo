import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  complaintResolutionContextSchema,
  complaintResolutionFeedbackSchema,
  createComplaintReopenEvidenceUploadIntentSchema,
  decodeGovernmentComplaintAccountability,
  reopenComplaintSchema,
} from './complaint-resolution.schemas.js';

const identifiers = {
  complaint: '10000000-0000-4000-8000-000000000001',
  evidence: '10000000-0000-4000-8000-000000000002',
  feedback: '10000000-0000-4000-8000-000000000003',
  policy: '10000000-0000-4000-8000-000000000004',
  reopen: '10000000-0000-4000-8000-000000000005',
  resolution: '10000000-0000-4000-8000-000000000006',
} as const;

const timestamp = '2026-07-16T10:00:00.000+05:30';
const locationCapture = {
  latitude: 18.5204,
  longitude: 73.8567,
  accuracyMeters: 8,
  capturedAt: timestamp,
  deviceRecordedAt: timestamp,
  provider: 'gps' as const,
  isMockLocation: false,
};

describe('complaint resolution validation', () => {
  it('accepts all-or-none bounded ratings and rejects mass-assignment fields', () => {
    const base = {
      expectedWorkflowVersion: 4,
      resolutionId: identifiers.resolution,
      outcome: 'resolved' as const,
    };

    assert.equal(complaintResolutionFeedbackSchema.safeParse(base).success, true);
    assert.equal(
      complaintResolutionFeedbackSchema.safeParse({
        ...base,
        ratings: { satisfaction: 5, speed: 4, quality: 5, communication: 4 },
      }).success,
      true,
    );
    assert.equal(
      complaintResolutionFeedbackSchema.safeParse({
        ...base,
        ratings: { satisfaction: 5 },
      }).success,
      false,
    );
    assert.equal(
      complaintResolutionFeedbackSchema.safeParse({
        ...base,
        ratings: { satisfaction: 11, speed: 4, quality: 5, communication: 4 },
      }).success,
      false,
    );
    assert.equal(
      complaintResolutionFeedbackSchema.safeParse({ ...base, citizenUserId: identifiers.feedback })
        .success,
      false,
    );
  });

  it('requires a safe reopen reason and unique evidence identifiers', () => {
    const valid = {
      expectedWorkflowVersion: 4,
      resolutionId: identifiers.resolution,
      reasonCode: 'issue_persists',
      explanation: 'The issue is still present.',
      evidenceIds: [identifiers.evidence],
    };

    assert.equal(reopenComplaintSchema.safeParse(valid).success, true);
    assert.equal(
      reopenComplaintSchema.safeParse({
        ...valid,
        evidenceIds: [identifiers.evidence, identifiers.evidence],
      }).success,
      false,
    );
    assert.equal(
      reopenComplaintSchema.safeParse({ ...valid, reasonCode: 'ISSUE-PERSISTS' }).success,
      false,
    );
  });

  it('validates live photo/video evidence metadata and capture location', () => {
    const base = {
      expectedWorkflowVersion: 4,
      byteSize: 1_024,
      sha256: 'a'.repeat(64),
      capturedAt: timestamp,
      captureLocation: locationCapture,
      widthPixels: 1_280,
      heightPixels: 720,
    };

    assert.equal(
      createComplaintReopenEvidenceUploadIntentSchema.safeParse({
        ...base,
        kind: 'photo',
        mimeType: 'image/jpeg',
      }).success,
      true,
    );
    assert.equal(
      createComplaintReopenEvidenceUploadIntentSchema.safeParse({
        ...base,
        kind: 'video',
        mimeType: 'video/mp4',
      }).success,
      false,
    );
    assert.equal(
      createComplaintReopenEvidenceUploadIntentSchema.safeParse({
        ...base,
        kind: 'photo',
        mimeType: 'video/mp4',
      }).success,
      false,
    );
  });

  it('represents an absent approved policy without fabricating policy metadata', () => {
    const context = {
      complaintId: identifiers.complaint,
      workflowVersion: 4,
      status: 'resolution_submitted',
      latestResolution: null,
      policy: null,
      policyUnavailableReason: 'No approved resolution policy is configured.',
      availableReopenEvidence: [],
      feedback: [],
      reopenRequests: [],
      escalations: [],
    };

    assert.deepEqual(complaintResolutionContextSchema.parse(context), context);
    assert.equal(
      complaintResolutionContextSchema.safeParse({
        ...context,
        policyUnavailableReason: null,
      }).success,
      false,
    );
  });

  it('accepts only finalized, unique, unlinked evidence for restart recovery', () => {
    const availableEvidence = {
      id: identifiers.evidence,
      kind: 'photo',
      mimeType: 'image/jpeg',
      byteSize: 1_024,
      uploadStatus: 'finalized',
      capturedAt: timestamp,
      captureLocation: {
        latitude: locationCapture.latitude,
        longitude: locationCapture.longitude,
        accuracyMeters: locationCapture.accuracyMeters,
        provider: locationCapture.provider,
        capturedAt: locationCapture.capturedAt,
      },
      finalizedAt: timestamp,
      createdAt: timestamp,
    };
    const context = {
      complaintId: identifiers.complaint,
      workflowVersion: 4,
      status: 'citizen_verification_pending',
      latestResolution: {
        id: identifiers.resolution,
        version: 1,
        publicMessage: null,
        completedAt: timestamp,
        completionLocation: null,
        distanceFromComplaintMeters: null,
        workReference: null,
        beforeEvidence: [],
        afterEvidence: [],
        reopenEvidence: [],
      },
      policy: null,
      policyUnavailableReason: 'No approved resolution policy is configured.',
      availableReopenEvidence: [availableEvidence],
      feedback: [],
      reopenRequests: [],
      escalations: [],
    };

    assert.equal(complaintResolutionContextSchema.safeParse(context).success, true);
    assert.equal(
      complaintResolutionContextSchema.safeParse({
        ...context,
        availableReopenEvidence: [{ ...availableEvidence, uploadStatus: 'reserved' }],
      }).success,
      false,
    );
    assert.equal(
      complaintResolutionContextSchema.safeParse({
        ...context,
        availableReopenEvidence: [availableEvidence, availableEvidence],
      }).success,
      false,
    );
  });

  it('keeps the private completion note only in government accountability history', () => {
    const resolution = {
      id: identifiers.resolution,
      version: 1,
      completionNote: 'Field team completed the repair.',
      publicMessage: 'The repair is ready for review.',
      completedAt: null,
      completionLocation: null,
      distanceFromComplaintMeters: null,
      workReference: null,
      beforeEvidence: [],
      afterEvidence: [],
      reopenEvidence: [],
    };
    const accountability = {
      complaintId: identifiers.complaint,
      workflowVersion: 4,
      resolutionHistory: [resolution],
      feedback: [],
      reopenRequests: [],
      escalations: [],
    };

    assert.deepEqual(decodeGovernmentComplaintAccountability(accountability), accountability);
    assert.throws(() =>
      decodeGovernmentComplaintAccountability({
        ...accountability,
        resolutionHistory: [{ ...resolution, completionNote: undefined }],
      }),
    );
  });
});
