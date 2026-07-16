import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  ComplaintResolutionContext,
  GovernmentComplaintAccountability,
} from '@local-wellness/types';

import {
  CitizenResolutionAccessDeniedError,
  CitizenResolutionConflictError,
  CitizenResolutionDataAccessError,
  CitizenResolutionNotFoundError,
} from '../data/citizen-resolution.store.js';
import { SupabaseCitizenResolutionStore } from '../supabase/supabase-citizen-resolution.store.js';
import { SupabaseClients } from '../supabase/supabase-clients.js';

const identifiers = {
  actor: '10000000-0000-4000-8000-000000000001',
  complaint: '10000000-0000-4000-8000-000000000002',
  evidence: '10000000-0000-4000-8000-000000000003',
  feedback: '10000000-0000-4000-8000-000000000004',
  policy: '10000000-0000-4000-8000-000000000005',
  reopen: '10000000-0000-4000-8000-000000000006',
  resolution: '10000000-0000-4000-8000-000000000007',
  scope: '10000000-0000-4000-8000-000000000008',
} as const;

const timestamp = '2026-07-16T10:00:00.000Z';
const identity = {
  idempotencyKeyHash: 'a'.repeat(64),
  requestFingerprint: 'b'.repeat(64),
};

const resolution = {
  id: identifiers.resolution,
  version: 1,
  publicMessage: 'The repair is ready for citizen review.',
  completedAt: timestamp,
  completionLocation: {
    latitude: 18.5204,
    longitude: 73.8567,
    accuracyMeters: 8,
    provider: 'gps' as const,
    capturedAt: timestamp,
  },
  distanceFromComplaintMeters: 4,
  workReference: null,
  beforeEvidence: [],
  afterEvidence: [],
  reopenEvidence: [],
};

const context: ComplaintResolutionContext = {
  complaintId: identifiers.complaint,
  workflowVersion: 4,
  status: 'citizen_verification_pending',
  latestResolution: resolution,
  policy: {
    id: identifiers.policy,
    version: 1,
    outcomeOptions: [{ code: 'resolved', label: 'Resolved' }],
    reopenReasonOptions: [{ code: 'issue_persists', label: 'Issue persists' }],
    ratingMinimum: 1,
    ratingMaximum: 5,
    ratingsRequired: true,
    ratingLabels: {
      satisfaction: 'Satisfaction',
      speed: 'Resolution speed',
      quality: 'Resolution quality',
      communication: 'Communication',
    },
    reopenDeadline: '2026-07-23T10:00:00.000Z',
    reopenAttemptsRemaining: 2,
    reopenEvidenceRequired: false,
    feedbackAllowed: true,
    reopenAllowed: true,
    reopenEvidenceUploadAllowed: true,
    unavailableReason: null,
  },
  policyUnavailableReason: null,
  availableReopenEvidence: [],
  feedback: [],
  reopenRequests: [],
  escalations: [],
};

const feedback = {
  id: identifiers.feedback,
  resolutionId: identifiers.resolution,
  outcome: 'resolved' as const,
  ratings: null,
  comment: 'The repair is holding.',
  submittedAt: timestamp,
};

const reopenRequest = {
  id: identifiers.reopen,
  resolutionId: identifiers.resolution,
  attemptNumber: 1,
  reasonCode: 'issue_persists',
  explanation: 'The issue is still present.',
  evidenceIds: [identifiers.evidence],
  resultingStatus: 'reopened' as const,
  requestedAt: timestamp,
};

const governmentAccountability: GovernmentComplaintAccountability = {
  complaintId: identifiers.complaint,
  workflowVersion: 4,
  resolutionHistory: [{ ...resolution, completionNote: 'Field repair completed.' }],
  feedback: [],
  reopenRequests: [],
  escalations: [],
};

interface RpcCall {
  functionName: string;
  arguments_: Record<string, unknown>;
}

type RpcHandler = (
  functionName: string,
  arguments_: Record<string, unknown>,
) => Promise<Readonly<{ data: unknown; error: unknown }>>;

const createStore = (rpc: RpcHandler): SupabaseCitizenResolutionStore =>
  new SupabaseCitizenResolutionStore({
    publicClient: {
      rpc: () => {
        throw new Error('The public client must not be used.');
      },
    },
    serviceRoleClient: { rpc },
  } as unknown as SupabaseClients);

describe('Supabase citizen resolution store', () => {
  it('decodes the exact citizen and scoped government accountability contracts', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      return functionName === 'get_citizen_resolution_context'
        ? { data: [{ resolution_context: context }], error: null }
        : { data: [{ accountability: governmentAccountability }], error: null };
    });

    assert.deepEqual(
      await store.getResolutionContext(identifiers.actor, identifiers.complaint),
      context,
    );
    assert.deepEqual(
      await store.getGovernmentAccountability(
        identifiers.actor,
        identifiers.complaint,
        identifiers.scope,
      ),
      governmentAccountability,
    );
    assert.deepEqual(calls, [
      {
        functionName: 'get_citizen_resolution_context',
        arguments_: {
          p_actor_user_id: identifiers.actor,
          p_complaint_id: identifiers.complaint,
        },
      },
      {
        functionName: 'get_government_complaint_accountability',
        arguments_: {
          p_actor_user_id: identifiers.actor,
          p_complaint_id: identifiers.complaint,
          p_scope_role_assignment_id: identifiers.scope,
        },
      },
    ]);
  });

  it('supports an audio before-evidence locator for signed citizen viewing', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      return {
        data: [
          {
            evidence_id: identifiers.evidence,
            evidence_role: 'before',
            bucket_id: 'complaint-originals-private',
            object_path: `${identifiers.complaint}/${identifiers.evidence}/original`,
            declared_mime_type: 'audio/mpeg',
            declared_byte_size: 2_048,
            client_sha256: 'c'.repeat(64),
            observed_mime_type: 'audio/mpeg',
            observed_byte_size: 2_048,
            upload_expires_at: timestamp,
            upload_status: 'finalized',
            workflow_version: 4,
          },
        ],
        error: null,
      };
    });

    const result = await store.getEvidenceObject(
      identifiers.actor,
      identifiers.complaint,
      identifiers.evidence,
      'view',
    );

    assert.equal(result.role, 'before');
    assert.equal(result.declaredMimeType, 'audio/mpeg');
    assert.equal(calls[0]?.functionName, 'get_citizen_complaint_evidence_object');
    assert.deepEqual(calls[0]?.arguments_, {
      p_actor_user_id: identifiers.actor,
      p_complaint_id: identifiers.complaint,
      p_evidence_id: identifiers.evidence,
      p_purpose: 'view',
    });
  });

  it('passes live capture metadata when reserving reopen evidence', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      return {
        data: [
          {
            evidence_id: identifiers.evidence,
            bucket_id: 'complaint-originals-private',
            object_path: `${identifiers.complaint}/${identifiers.evidence}/reopen`,
            kind: 'photo',
            declared_mime_type: 'image/jpeg',
            declared_byte_size: 1_024,
            upload_status: 'reserved',
            upload_expires_at: '2026-07-16T10:15:00.000Z',
            captured_at: timestamp,
            location_longitude: 73.8567,
            location_latitude: 18.5204,
            location_accuracy_meters: 8,
            location_provider: 'gps',
            location_captured_at: timestamp,
            created_at: timestamp,
            workflow_version: 4,
            replayed: false,
          },
        ],
        error: null,
      };
    });
    const input = {
      expectedWorkflowVersion: 4,
      kind: 'photo' as const,
      mimeType: 'image/jpeg' as const,
      byteSize: 1_024,
      sha256: 'c'.repeat(64),
      capturedAt: timestamp,
      widthPixels: 1_280,
      heightPixels: 720,
      captureLocation: {
        latitude: 18.5204,
        longitude: 73.8567,
        accuracyMeters: 8,
        capturedAt: timestamp,
        deviceRecordedAt: timestamp,
        provider: 'gps' as const,
        isMockLocation: false,
      },
    };

    const result = await store.reserveReopenEvidence(
      identifiers.actor,
      identifiers.complaint,
      input,
      identity,
      'request-1',
    );

    assert.equal(result.evidence.captureLocation.latitude, 18.5204);
    assert.equal(result.evidence.uploadStatus, 'reserved');
    assert.deepEqual(calls[0], {
      functionName: 'reserve_citizen_reopen_evidence',
      arguments_: {
        p_actor_user_id: identifiers.actor,
        p_complaint_id: identifiers.complaint,
        p_expected_workflow_version: 4,
        p_idempotency_key_hash: identity.idempotencyKeyHash,
        p_request_fingerprint: identity.requestFingerprint,
        p_request_id: 'request-1',
        p_kind: 'photo',
        p_mime_type: 'image/jpeg',
        p_byte_size: 1_024,
        p_sha256: 'c'.repeat(64),
        p_captured_at: timestamp,
        p_width_pixels: 1_280,
        p_height_pixels: 720,
        p_duration_milliseconds: null,
        p_location_longitude: 73.8567,
        p_location_latitude: 18.5204,
        p_location_accuracy_meters: 8,
        p_location_provider: 'gps',
        p_location_captured_at: timestamp,
        p_location_device_recorded_at: timestamp,
        p_location_mock_detected: false,
      },
    });
  });

  it('passes policy-sensitive feedback and reopen inputs without mass assignment', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      if (functionName === 'submit_complaint_feedback') {
        return {
          data: [
            {
              result: {
                complaintId: identifiers.complaint,
                status: 'resolved',
                workflowVersion: 5,
                updatedAt: timestamp,
                feedback,
              },
              replayed: false,
            },
          ],
          error: null,
        };
      }
      return {
        data: [
          {
            result: {
              complaintId: identifiers.complaint,
              status: 'reopened',
              workflowVersion: 5,
              updatedAt: timestamp,
              reopenRequest,
              escalation: null,
            },
            replayed: false,
          },
        ],
        error: null,
      };
    });

    await store.submitFeedback(
      identifiers.actor,
      identifiers.complaint,
      {
        expectedWorkflowVersion: 4,
        resolutionId: identifiers.resolution,
        outcome: 'resolved',
        comment: feedback.comment ?? undefined,
      },
      identity,
      'feedback-request',
    );
    await store.reopenComplaint(
      identifiers.actor,
      identifiers.complaint,
      {
        expectedWorkflowVersion: 4,
        resolutionId: identifiers.resolution,
        reasonCode: reopenRequest.reasonCode,
        explanation: reopenRequest.explanation,
        evidenceIds: reopenRequest.evidenceIds,
      },
      identity,
      'reopen-request',
    );

    assert.deepEqual(calls[0], {
      functionName: 'submit_complaint_feedback',
      arguments_: {
        p_actor_user_id: identifiers.actor,
        p_complaint_id: identifiers.complaint,
        p_expected_workflow_version: 4,
        p_resolution_id: identifiers.resolution,
        p_outcome: 'resolved',
        p_satisfaction_rating: null,
        p_speed_rating: null,
        p_quality_rating: null,
        p_communication_rating: null,
        p_comment: feedback.comment,
        p_idempotency_key_hash: identity.idempotencyKeyHash,
        p_request_fingerprint: identity.requestFingerprint,
        p_request_id: 'feedback-request',
      },
    });
    assert.deepEqual(calls[1], {
      functionName: 'reopen_complaint',
      arguments_: {
        p_actor_user_id: identifiers.actor,
        p_complaint_id: identifiers.complaint,
        p_expected_workflow_version: 4,
        p_resolution_id: identifiers.resolution,
        p_reason_code: reopenRequest.reasonCode,
        p_explanation: reopenRequest.explanation,
        p_evidence_ids: reopenRequest.evidenceIds,
        p_idempotency_key_hash: identity.idempotencyKeyHash,
        p_request_fingerprint: identity.requestFingerprint,
        p_request_id: 'reopen-request',
      },
    });
  });

  it('finalizes reopen evidence only with server-observed integrity metadata', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      return {
        data: [
          {
            evidence_id: identifiers.evidence,
            kind: 'photo',
            observed_mime_type: 'image/jpeg',
            observed_byte_size: 1_024,
            upload_status: 'finalized',
            captured_at: timestamp,
            location_longitude: 73.8567,
            location_latitude: 18.5204,
            location_accuracy_meters: 8,
            location_provider: 'gps',
            location_captured_at: timestamp,
            finalized_at: timestamp,
            created_at: timestamp,
            workflow_version: 4,
            replayed: false,
          },
        ],
        error: null,
      };
    });

    const result = await store.finalizeReopenEvidence(
      identifiers.actor,
      identifiers.complaint,
      identifiers.evidence,
      { expectedWorkflowVersion: 4, byteSize: 1_024, sha256: 'c'.repeat(64) },
      { byteSize: 1_024, mimeType: 'image/jpeg', sha256: 'c'.repeat(64) },
      identity,
      'finalize-request',
    );

    assert.equal(result.evidence.uploadStatus, 'finalized');
    assert.deepEqual(calls[0], {
      functionName: 'finalize_citizen_reopen_evidence',
      arguments_: {
        p_actor_user_id: identifiers.actor,
        p_complaint_id: identifiers.complaint,
        p_evidence_id: identifiers.evidence,
        p_expected_workflow_version: 4,
        p_idempotency_key_hash: identity.idempotencyKeyHash,
        p_request_fingerprint: identity.requestFingerprint,
        p_request_id: 'finalize-request',
        p_observed_mime_type: 'image/jpeg',
        p_observed_byte_size: 1_024,
        p_verified_sha256: 'c'.repeat(64),
      },
    });
  });

  it('fails closed for malformed contracts and maps authorization, conflict, and missing rows', async () => {
    const malformed = createStore(async () => ({
      data: [{ resolution_context: { ...context, unexpected: true } }],
      error: null,
    }));
    await assert.rejects(
      malformed.getResolutionContext(identifiers.actor, identifiers.complaint),
      CitizenResolutionDataAccessError,
    );

    const denied = createStore(async () => ({
      data: null,
      error: { message: 'GOVERNMENT_ACCESS_REQUIRED' },
    }));
    await assert.rejects(
      denied.getGovernmentAccountability(identifiers.actor, identifiers.complaint),
      CitizenResolutionAccessDeniedError,
    );

    for (const marker of [
      'CITIZEN_ACTION_IDEMPOTENCY_CONFLICT',
      'COMPLAINT_FEEDBACK_NOT_ALLOWED',
      'RESOLUTION_POLICY_UNAVAILABLE',
    ]) {
      const conflict = createStore(async () => ({ data: null, error: { message: marker } }));
      await assert.rejects(
        conflict.submitFeedback(
          identifiers.actor,
          identifiers.complaint,
          {
            expectedWorkflowVersion: 4,
            resolutionId: identifiers.resolution,
            outcome: 'resolved',
          },
          identity,
          'request-1',
        ),
        (error: unknown) =>
          error instanceof CitizenResolutionConflictError && error.marker === marker,
      );
    }

    const missing = createStore(async () => ({ data: [], error: null }));
    await assert.rejects(
      missing.getEvidenceObject(
        identifiers.actor,
        identifiers.complaint,
        identifiers.evidence,
        'view',
      ),
      CitizenResolutionNotFoundError,
    );
  });
});
