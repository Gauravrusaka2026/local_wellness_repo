import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ComplaintResolutionContext } from '@local-wellness/types';

import {
  ComplaintActionInputError,
  getResolutionActionAvailability,
  parseComplaintActionIdentifiers,
  parseComplaintFeedbackInput,
  parseComplaintReopenInput,
} from '../lib/complaints/action-input';
import {
  formatComplaintCode,
  formatComplaintDateTime,
  getComplaintStatusLabel,
  getComplaintStatusTone,
} from '../lib/complaints/presentation';

const ids = {
  complaint: '20000000-0000-4000-8000-000000000001',
  evidence: '20000000-0000-4000-8000-000000000002',
  policy: '20000000-0000-4000-8000-000000000003',
  resolution: '20000000-0000-4000-8000-000000000004',
} as const;

const timestamp = '2026-07-17T10:00:00.000Z';
const context: ComplaintResolutionContext = {
  availableReopenEvidence: [
    {
      byteSize: 1_024,
      capturedAt: timestamp,
      captureLocation: {
        accuracyMeters: 8,
        capturedAt: timestamp,
        latitude: 18.52,
        longitude: 73.86,
        provider: 'gps',
      },
      createdAt: timestamp,
      finalizedAt: timestamp,
      id: ids.evidence,
      kind: 'photo',
      mimeType: 'image/jpeg',
      uploadStatus: 'finalized',
    },
  ],
  complaintId: ids.complaint,
  escalations: [],
  feedback: [],
  latestResolution: {
    afterEvidence: [],
    beforeEvidence: [],
    completedAt: timestamp,
    completionLocation: null,
    distanceFromComplaintMeters: null,
    id: ids.resolution,
    publicMessage: 'Work completed.',
    reopenEvidence: [],
    version: 1,
    workReference: null,
  },
  policy: {
    feedbackAllowed: true,
    id: ids.policy,
    outcomeOptions: [{ code: 'resolved', label: 'Resolved' }],
    ratingLabels: {
      communication: 'Communication',
      quality: 'Quality',
      satisfaction: 'Satisfaction',
      speed: 'Speed',
    },
    ratingMaximum: 5,
    ratingMinimum: 1,
    ratingsRequired: true,
    reopenAllowed: true,
    reopenAttemptsRemaining: 1,
    reopenDeadline: null,
    reopenEvidenceRequired: true,
    reopenEvidenceUploadAllowed: true,
    reopenReasonOptions: [{ code: 'issue_persists', label: 'Issue persists' }],
    unavailableReason: null,
    version: 1,
  },
  policyUnavailableReason: null,
  reopenRequests: [],
  status: 'citizen_verification_pending',
  workflowVersion: 4,
};

const baseForm = () => {
  const formData = new FormData();
  formData.set('complaintId', ids.complaint);
  formData.set('idempotencyKey', 'citizen-web-action:00000001');
  return formData;
};

describe('citizen complaint policy actions', () => {
  it('uses fresh policy identifiers rather than accepting workflow or resolution IDs from forms', () => {
    const formData = baseForm();
    formData.set('outcome', 'resolved');
    formData.set('satisfaction', '5');
    formData.set('speed', '4');
    formData.set('quality', '5');
    formData.set('communication', '3');
    formData.set('expectedWorkflowVersion', '999');
    formData.set('resolutionId', '20000000-0000-4000-8000-000000000099');

    assert.deepEqual(parseComplaintActionIdentifiers(formData), {
      complaintId: ids.complaint,
      idempotencyKey: 'citizen-web-action:00000001',
    });
    assert.deepEqual(parseComplaintFeedbackInput(formData, context), {
      expectedWorkflowVersion: 4,
      outcome: 'resolved',
      ratings: { communication: 3, quality: 5, satisfaction: 5, speed: 4 },
      resolutionId: ids.resolution,
    });
  });

  it('fails closed for unavailable policies, incomplete ratings, and invented outcomes', () => {
    assert.deepEqual(
      getResolutionActionAvailability({
        ...context,
        policy: null,
        policyUnavailableReason: 'Pending review.',
      }),
      {
        feedbackAllowed: false,
        feedbackUnavailableReason: 'Pending review.',
        reopenAllowed: false,
        reopenUnavailableReason: 'Pending review.',
      },
    );

    const partialRatings = baseForm();
    partialRatings.set('outcome', 'resolved');
    partialRatings.set('satisfaction', '5');
    assert.throws(
      () => parseComplaintFeedbackInput(partialRatings, context),
      ComplaintActionInputError,
    );

    const inventedOutcome = baseForm();
    inventedOutcome.set('outcome', 'auto_approved');
    assert.throws(
      () => parseComplaintFeedbackInput(inventedOutcome, context),
      ComplaintActionInputError,
    );
  });

  it('allows only finalized evidence exposed by the current reopen policy context', () => {
    const formData = baseForm();
    formData.set('reasonCode', 'issue_persists');
    formData.set('explanation', 'The streetlight is still off.');
    formData.append('evidenceId', ids.evidence);
    assert.deepEqual(parseComplaintReopenInput(formData, context), {
      evidenceIds: [ids.evidence],
      expectedWorkflowVersion: 4,
      explanation: 'The streetlight is still off.',
      reasonCode: 'issue_persists',
      resolutionId: ids.resolution,
    });

    formData.set('evidenceId', '20000000-0000-4000-8000-000000000099');
    assert.throws(() => parseComplaintReopenInput(formData, context), ComplaintActionInputError);

    const noEvidenceContext = { ...context, availableReopenEvidence: [] };
    assert.equal(getResolutionActionAvailability(noEvidenceContext).reopenAllowed, false);
  });

  it('renders stable human-readable complaint status and India timestamps', () => {
    assert.equal(getComplaintStatusLabel('work_in_progress'), 'Work In Progress');
    assert.equal(getComplaintStatusTone('citizen_verification_pending'), 'attention');
    assert.equal(getComplaintStatusTone('resolved'), 'complete');
    assert.equal(formatComplaintCode('route_resolved'), 'Route Resolved');
    assert.match(formatComplaintDateTime(timestamp), /17 Jul 2026/u);
    assert.equal(formatComplaintDateTime('invalid'), 'Date unavailable');
  });
});
