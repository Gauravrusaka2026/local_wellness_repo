import { Inject, Injectable } from '@nestjs/common';
import {
  complaintEvidenceRoles,
  complaintLocationProviders,
  complaintMediaMimeTypes,
  complaintReopenEvidenceUploadStatuses,
  type ComplaintReopenEvidenceFinalization,
  type ComplaintResolutionContext,
  type ComplaintResolutionFeedbackInput,
  type ComplaintResolutionFeedbackResult,
  type CreateComplaintReopenEvidenceUploadIntentInput,
  type FinalizeComplaintReopenEvidenceInput,
  type GovernmentComplaintAccountability,
  type ReopenComplaintInput,
  type ReopenComplaintResult,
} from '@local-wellness/types';
import {
  complaintReopenEvidenceSchema,
  decodeComplaintResolutionContext,
  decodeComplaintResolutionFeedbackResult,
  decodeGovernmentComplaintAccountability,
  decodeReopenComplaintResult,
} from '@local-wellness/validation';
import { z } from 'zod';

import {
  CitizenResolutionAccessDeniedError,
  CitizenResolutionConflictError,
  CitizenResolutionDataAccessError,
  CitizenResolutionNotFoundError,
  CitizenResolutionStore,
  type CitizenComplaintEvidenceObjectLocator,
  type ReservedComplaintReopenEvidence,
} from '../data/citizen-resolution.store.js';
import type { ComplaintMutationIdentity } from '../data/complaint.store.js';
import type { ResolutionEvidenceObject } from '../data/resolution-evidence.gateway.js';
import { SupabaseClients } from './supabase-clients.js';

interface RpcResult {
  data: unknown;
  error: unknown;
}

type ServiceRoleRpc = (
  functionName: string,
  arguments_: Record<string, unknown>,
) => PromiseLike<RpcResult>;

const uuidSchema = z.uuid();
const timestampSchema = z.iso.datetime({ offset: true });
const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/u);
const reopenEvidenceMimeTypes = [
  'image/heic',
  'image/heif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const;

const contextRowSchema = z.object({ resolution_context: z.unknown() }).strict();
const accountabilityRowSchema = z.object({ accountability: z.unknown() }).strict();
const mutationResultRowSchema = z.object({ result: z.unknown(), replayed: z.boolean() }).strict();

const reservedEvidenceRowSchema = z
  .object({
    evidence_id: uuidSchema,
    bucket_id: z.string().trim().min(1).max(128),
    object_path: z.string().trim().min(1).max(1_024),
    kind: z.enum(['photo', 'video']),
    declared_mime_type: z.enum(reopenEvidenceMimeTypes),
    declared_byte_size: z
      .number()
      .int()
      .positive()
      .max(50 * 1_024 * 1_024),
    upload_status: z.enum(complaintReopenEvidenceUploadStatuses),
    upload_expires_at: timestampSchema,
    captured_at: timestampSchema,
    location_longitude: z.number().finite().min(-180).max(180),
    location_latitude: z.number().finite().min(-90).max(90),
    location_accuracy_meters: z.number().finite().nonnegative().max(5_000),
    location_provider: z.enum(complaintLocationProviders),
    location_captured_at: timestampSchema,
    created_at: timestampSchema,
    workflow_version: z.number().int().positive(),
    replayed: z.boolean(),
  })
  .strict();

const evidenceObjectRowSchema = z
  .object({
    evidence_id: uuidSchema,
    evidence_role: z.enum(complaintEvidenceRoles),
    bucket_id: z.string().trim().min(1).max(128),
    object_path: z.string().trim().min(1).max(1_024),
    declared_mime_type: z.enum(complaintMediaMimeTypes),
    declared_byte_size: z
      .number()
      .int()
      .positive()
      .max(50 * 1_024 * 1_024),
    client_sha256: sha256Schema,
    observed_mime_type: z.enum(complaintMediaMimeTypes).nullable(),
    observed_byte_size: z
      .number()
      .int()
      .positive()
      .max(50 * 1_024 * 1_024)
      .nullable(),
    upload_expires_at: timestampSchema,
    upload_status: z.enum(complaintReopenEvidenceUploadStatuses),
    workflow_version: z.number().int().positive(),
  })
  .strict();

const finalizedEvidenceRowSchema = z
  .object({
    evidence_id: uuidSchema,
    kind: z.enum(['photo', 'video']),
    observed_mime_type: z.enum(reopenEvidenceMimeTypes),
    observed_byte_size: z
      .number()
      .int()
      .positive()
      .max(50 * 1_024 * 1_024),
    upload_status: z.literal('finalized'),
    captured_at: timestampSchema,
    location_longitude: z.number().finite().min(-180).max(180),
    location_latitude: z.number().finite().min(-90).max(90),
    location_accuracy_meters: z.number().finite().nonnegative().max(5_000),
    location_provider: z.enum(complaintLocationProviders),
    location_captured_at: timestampSchema,
    finalized_at: timestampSchema,
    created_at: timestampSchema,
    workflow_version: z.number().int().positive(),
    replayed: z.boolean(),
  })
  .strict();

const failedEvidenceRowSchema = z
  .object({
    evidence_id: uuidSchema,
    upload_status: z.literal('failed'),
    failure_code: z.enum(['CONTENT_TYPE_MISMATCH', 'OBJECT_INTEGRITY_MISMATCH']),
  })
  .strict();

const decode = <Output>(schema: z.ZodType<Output>, value: unknown, operation: string): Output => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new CitizenResolutionDataAccessError(`${operation} response`);
  }
  return parsed.data;
};

const firstRow = <Row>(
  rows: Row[],
  resource: 'complaint' | 'evidence' | 'policy' | 'resolution',
): Row => {
  const row = rows[0];
  if (!row) {
    throw new CitizenResolutionNotFoundError(resource);
  }
  return row;
};

const databaseMarker = (error: unknown): string | null =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof error.message === 'string' &&
  /^[A-Z][A-Z0-9_]+$/u.test(error.message)
    ? error.message
    : null;

const conflictMarkers = new Set([
  'COMPLAINT_WORKFLOW_VERSION_CONFLICT',
  'CITIZEN_ACTION_IDEMPOTENCY_CONFLICT',
  'COMPLAINT_FEEDBACK_IDEMPOTENCY_CONFLICT',
  'COMPLAINT_FEEDBACK_ALREADY_SUBMITTED',
  'COMPLAINT_FEEDBACK_NOT_ALLOWED',
  'COMPLAINT_FEEDBACK_INVALID',
  'COMPLAINT_REOPEN_IDEMPOTENCY_CONFLICT',
  'COMPLAINT_REOPEN_NOT_ALLOWED',
  'COMPLAINT_REOPEN_DEADLINE_EXPIRED',
  'COMPLAINT_REOPEN_ATTEMPTS_EXHAUSTED',
  'COMPLAINT_REOPEN_REASON_INVALID',
  'COMPLAINT_REOPEN_EVIDENCE_REQUIRED',
  'COMPLAINT_REOPEN_EVIDENCE_NOT_READY',
  'COMPLAINT_REOPEN_EVIDENCE_LIMIT_REACHED',
  'COMPLAINT_REOPEN_EVIDENCE_UPLOAD_EXPIRED',
  'COMPLAINT_REOPEN_EVIDENCE_INTEGRITY_MISMATCH',
  'COMPLAINT_RESOLUTION_MISMATCH',
  'COMPLAINT_RESOLUTION_REQUEST_INVALID',
  'REOPEN_EVIDENCE_FINALIZATION_INVALID',
  'REOPEN_EVIDENCE_LOCATION_INVALID',
  'REOPEN_EVIDENCE_NOT_READY',
  'REOPEN_EVIDENCE_REQUEST_INVALID',
  'REOPEN_NOT_AVAILABLE',
  'REOPEN_REQUEST_INVALID',
  'RESOLUTION_POLICY_UNAVAILABLE',
  'RESOLUTION_REVIEW_NOT_AVAILABLE',
]);

const decodeContract = <Output>(
  decoder: (value: unknown) => Output,
  value: unknown,
  operation: string,
): Output => {
  try {
    return decoder(value);
  } catch {
    throw new CitizenResolutionDataAccessError(`${operation} response`);
  }
};

@Injectable()
export class SupabaseCitizenResolutionStore extends CitizenResolutionStore {
  public constructor(
    @Inject(SupabaseClients)
    private readonly clients: SupabaseClients,
  ) {
    super();
  }

  public async getResolutionContext(
    actorUserId: string,
    complaintId: string,
  ): Promise<ComplaintResolutionContext> {
    const rows = decode(
      z.array(contextRowSchema).max(1),
      await this.callRpc('get citizen resolution context', 'get_citizen_resolution_context', {
        p_actor_user_id: actorUserId,
        p_complaint_id: complaintId,
      }),
      'get citizen resolution context',
    );
    return decodeContract(
      decodeComplaintResolutionContext,
      firstRow(rows, 'complaint').resolution_context,
      'get citizen resolution context',
    );
  }

  public async getGovernmentAccountability(
    actorUserId: string,
    complaintId: string,
    scopeRoleAssignmentId?: string,
  ): Promise<GovernmentComplaintAccountability> {
    const rows = decode(
      z.array(accountabilityRowSchema).max(1),
      await this.callRpc(
        'get government complaint accountability',
        'get_government_complaint_accountability',
        {
          p_actor_user_id: actorUserId,
          p_complaint_id: complaintId,
          p_scope_role_assignment_id: scopeRoleAssignmentId ?? null,
        },
      ),
      'get government complaint accountability',
    );
    return decodeContract(
      decodeGovernmentComplaintAccountability,
      firstRow(rows, 'complaint').accountability,
      'get government complaint accountability',
    );
  }

  public async reserveReopenEvidence(
    actorUserId: string,
    complaintId: string,
    input: CreateComplaintReopenEvidenceUploadIntentInput,
    identity: ComplaintMutationIdentity,
    requestId: string,
  ): Promise<ReservedComplaintReopenEvidence> {
    const location = input.captureLocation;
    const rows = decode(
      z.array(reservedEvidenceRowSchema).length(1),
      await this.callRpc('reserve citizen reopen evidence', 'reserve_citizen_reopen_evidence', {
        p_actor_user_id: actorUserId,
        p_complaint_id: complaintId,
        p_expected_workflow_version: input.expectedWorkflowVersion,
        p_idempotency_key_hash: identity.idempotencyKeyHash,
        p_request_fingerprint: identity.requestFingerprint,
        p_request_id: requestId,
        p_kind: input.kind,
        p_mime_type: input.mimeType,
        p_byte_size: input.byteSize,
        p_sha256: input.sha256,
        p_captured_at: input.capturedAt,
        p_width_pixels: input.widthPixels ?? null,
        p_height_pixels: input.heightPixels ?? null,
        p_duration_milliseconds: input.durationMilliseconds ?? null,
        p_location_longitude: location.longitude,
        p_location_latitude: location.latitude,
        p_location_accuracy_meters: location.accuracyMeters,
        p_location_provider: location.provider,
        p_location_captured_at: location.capturedAt,
        p_location_device_recorded_at: location.deviceRecordedAt,
        p_location_mock_detected: location.isMockLocation,
      }),
      'reserve citizen reopen evidence',
    );
    const row = firstRow(rows, 'evidence');
    return {
      bucket: row.bucket_id,
      evidence: decode(
        complaintReopenEvidenceSchema,
        {
          id: row.evidence_id,
          kind: row.kind,
          mimeType: row.declared_mime_type,
          byteSize: row.declared_byte_size,
          uploadStatus: row.upload_status,
          capturedAt: row.captured_at,
          captureLocation: {
            latitude: row.location_latitude,
            longitude: row.location_longitude,
            accuracyMeters: row.location_accuracy_meters,
            provider: row.location_provider,
            capturedAt: row.location_captured_at,
          },
          finalizedAt: null,
          createdAt: row.created_at,
        },
        'reserve citizen reopen evidence',
      ),
      objectPath: row.object_path,
      uploadExpiresAt: row.upload_expires_at,
      workflowVersion: row.workflow_version,
    };
  }

  public async getEvidenceObject(
    actorUserId: string,
    complaintId: string,
    evidenceId: string,
    purpose: 'finalize' | 'view',
  ): Promise<CitizenComplaintEvidenceObjectLocator> {
    const rows = decode(
      z.array(evidenceObjectRowSchema).max(1),
      await this.callRpc(
        'get citizen complaint evidence object',
        'get_citizen_complaint_evidence_object',
        {
          p_actor_user_id: actorUserId,
          p_complaint_id: complaintId,
          p_evidence_id: evidenceId,
          p_purpose: purpose,
        },
      ),
      'get citizen complaint evidence object',
    );
    const row = firstRow(rows, 'evidence');
    return {
      evidenceId: row.evidence_id,
      role: row.evidence_role,
      bucket: row.bucket_id,
      objectPath: row.object_path,
      clientSha256: row.client_sha256,
      declaredByteSize: row.declared_byte_size,
      declaredMimeType: row.declared_mime_type,
      observedByteSize: row.observed_byte_size,
      observedMimeType: row.observed_mime_type,
      uploadExpiresAt: row.upload_expires_at,
      uploadStatus: row.upload_status,
      workflowVersion: row.workflow_version,
    };
  }

  public async finalizeReopenEvidence(
    actorUserId: string,
    complaintId: string,
    evidenceId: string,
    input: FinalizeComplaintReopenEvidenceInput,
    observed: ResolutionEvidenceObject,
    identity: ComplaintMutationIdentity,
    requestId: string,
  ): Promise<ComplaintReopenEvidenceFinalization> {
    const rows = decode(
      z.array(finalizedEvidenceRowSchema).length(1),
      await this.callRpc('finalize citizen reopen evidence', 'finalize_citizen_reopen_evidence', {
        p_actor_user_id: actorUserId,
        p_complaint_id: complaintId,
        p_evidence_id: evidenceId,
        p_expected_workflow_version: input.expectedWorkflowVersion,
        p_idempotency_key_hash: identity.idempotencyKeyHash,
        p_request_fingerprint: identity.requestFingerprint,
        p_request_id: requestId,
        p_observed_mime_type: observed.mimeType,
        p_observed_byte_size: observed.byteSize,
        p_verified_sha256: observed.sha256,
      }),
      'finalize citizen reopen evidence',
    );
    const row = firstRow(rows, 'evidence');
    return {
      evidence: decode(
        complaintReopenEvidenceSchema,
        {
          id: row.evidence_id,
          kind: row.kind,
          mimeType: row.observed_mime_type,
          byteSize: row.observed_byte_size,
          uploadStatus: row.upload_status,
          capturedAt: row.captured_at,
          captureLocation: {
            latitude: row.location_latitude,
            longitude: row.location_longitude,
            accuracyMeters: row.location_accuracy_meters,
            provider: row.location_provider,
            capturedAt: row.location_captured_at,
          },
          finalizedAt: row.finalized_at,
          createdAt: row.created_at,
        },
        'finalize citizen reopen evidence',
      ),
      workflowVersion: row.workflow_version,
    };
  }

  public async failReopenEvidence(
    evidenceId: string,
    failureCode: 'CONTENT_TYPE_MISMATCH' | 'OBJECT_INTEGRITY_MISMATCH',
  ): Promise<void> {
    const rows = decode(
      z.array(failedEvidenceRowSchema).length(1),
      await this.callRpc('fail citizen reopen evidence', 'fail_citizen_reopen_evidence', {
        p_evidence_id: evidenceId,
        p_failure_code: failureCode,
      }),
      'fail citizen reopen evidence',
    );
    if (rows[0]?.evidence_id !== evidenceId) {
      throw new CitizenResolutionDataAccessError('fail citizen reopen evidence');
    }
  }

  public async submitFeedback(
    actorUserId: string,
    complaintId: string,
    input: ComplaintResolutionFeedbackInput,
    identity: ComplaintMutationIdentity,
    requestId: string,
  ): Promise<ComplaintResolutionFeedbackResult> {
    const ratings = input.ratings;
    const rows = decode(
      z.array(mutationResultRowSchema).length(1),
      await this.callRpc('submit complaint feedback', 'submit_complaint_feedback', {
        p_actor_user_id: actorUserId,
        p_complaint_id: complaintId,
        p_expected_workflow_version: input.expectedWorkflowVersion,
        p_resolution_id: input.resolutionId,
        p_outcome: input.outcome,
        p_satisfaction_rating: ratings?.satisfaction ?? null,
        p_speed_rating: ratings?.speed ?? null,
        p_quality_rating: ratings?.quality ?? null,
        p_communication_rating: ratings?.communication ?? null,
        p_comment: input.comment ?? null,
        p_idempotency_key_hash: identity.idempotencyKeyHash,
        p_request_fingerprint: identity.requestFingerprint,
        p_request_id: requestId,
      }),
      'submit complaint feedback',
    );
    return decodeContract(
      decodeComplaintResolutionFeedbackResult,
      rows[0]?.result,
      'submit complaint feedback',
    );
  }

  public async reopenComplaint(
    actorUserId: string,
    complaintId: string,
    input: ReopenComplaintInput,
    identity: ComplaintMutationIdentity,
    requestId: string,
  ): Promise<ReopenComplaintResult> {
    const rows = decode(
      z.array(mutationResultRowSchema).length(1),
      await this.callRpc('reopen complaint', 'reopen_complaint', {
        p_actor_user_id: actorUserId,
        p_complaint_id: complaintId,
        p_expected_workflow_version: input.expectedWorkflowVersion,
        p_resolution_id: input.resolutionId,
        p_reason_code: input.reasonCode,
        p_explanation: input.explanation,
        p_evidence_ids: input.evidenceIds,
        p_idempotency_key_hash: identity.idempotencyKeyHash,
        p_request_fingerprint: identity.requestFingerprint,
        p_request_id: requestId,
      }),
      'reopen complaint',
    );
    return decodeContract(decodeReopenComplaintResult, rows[0]?.result, 'reopen complaint');
  }

  private async callRpc(
    operation: string,
    functionName: string,
    arguments_: Record<string, unknown>,
  ): Promise<unknown> {
    try {
      const rpc = this.clients.serviceRoleClient.rpc.bind(
        this.clients.serviceRoleClient,
      ) as unknown as ServiceRoleRpc;
      const { data, error } = await rpc(functionName, arguments_);
      const marker = databaseMarker(error);

      if (marker === 'GOVERNMENT_ACCESS_REQUIRED') {
        throw new CitizenResolutionAccessDeniedError();
      }
      if (marker === 'COMPLAINT_NOT_FOUND') {
        throw new CitizenResolutionNotFoundError('complaint');
      }
      if (marker === 'COMPLAINT_RESOLUTION_NOT_FOUND') {
        throw new CitizenResolutionNotFoundError('resolution');
      }
      if (marker === 'COMPLAINT_EVIDENCE_NOT_FOUND') {
        throw new CitizenResolutionNotFoundError('evidence');
      }
      if (marker === 'REOPEN_EVIDENCE_NOT_FOUND') {
        throw new CitizenResolutionNotFoundError('evidence');
      }
      if (marker === 'COMPLAINT_RESOLUTION_POLICY_NOT_FOUND') {
        throw new CitizenResolutionNotFoundError('policy');
      }
      if (marker && conflictMarkers.has(marker)) {
        throw new CitizenResolutionConflictError(marker);
      }
      if (error) {
        throw new CitizenResolutionDataAccessError(operation);
      }
      return data;
    } catch (error) {
      if (error instanceof CitizenResolutionDataAccessError) {
        throw error;
      }
      throw new CitizenResolutionDataAccessError(operation);
    }
  }
}
