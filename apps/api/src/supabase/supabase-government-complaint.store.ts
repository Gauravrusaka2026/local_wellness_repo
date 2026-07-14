import { Inject, Injectable } from '@nestjs/common';
import {
  complaintLocationProviders,
  complaintLocationVerificationStatuses,
  complaintStatuses,
  governmentResolutionEvidenceKinds,
  governmentResolutionEvidenceUploadStatuses,
  type GovernmentComplaintActionResult,
  type GovernmentComplaintAssignmentOptions,
  type GovernmentComplaintDetail,
  type GovernmentComplaintQueueQuery,
  type GovernmentComplaintQueueResult,
  type GovernmentResolutionEvidenceFinalization,
} from '@local-wellness/types';
import {
  decodeGovernmentComplaintActionResult,
  decodeGovernmentComplaintAssignmentOptions,
  decodeGovernmentComplaintDetail,
  decodeGovernmentComplaintQueueResult,
  governmentResolutionEvidenceSchema,
} from '@local-wellness/validation';
import { z } from 'zod';

import type { ComplaintMutationIdentity } from '../data/complaint.store.js';
import {
  GovernmentComplaintAccessDeniedError,
  type GovernmentComplaintAction,
  GovernmentComplaintConflictError,
  GovernmentComplaintDataAccessError,
  GovernmentComplaintNotFoundError,
  GovernmentComplaintStore,
  type GovernmentResolutionEvidenceObjectLocator,
  type ReservedGovernmentResolutionEvidence,
} from '../data/government-complaint.store.js';
import type { ResolutionEvidenceObject } from '../data/resolution-evidence.gateway.js';
import type {
  CreateGovernmentResolutionEvidenceUploadIntentInput,
  FinalizeGovernmentResolutionEvidenceInput,
  SubmitGovernmentComplaintResolutionInput,
} from '@local-wellness/types';
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
const nullableTimestampSchema = timestampSchema.nullable();

const queueRowSchema = z
  .object({
    complaint_id: uuidSchema,
    complaint_number: z.string().trim().min(1).max(80),
    category_id: uuidSchema,
    category_name: z.string().trim().min(1).max(240),
    status: z.enum(complaintStatuses),
    submitted_at: timestampSchema,
    updated_at: timestampSchema,
    workflow_version: z.number().int().positive(),
    current_assignment: z.unknown(),
    queue_flags: z.unknown(),
  })
  .strict();

const detailRowSchema = queueRowSchema
  .extend({
    description: z.string().trim().min(1).max(5_000),
    longitude: z.number().finite().min(-180).max(180),
    latitude: z.number().finite().min(-90).max(90),
    accuracy_meters: z.number().finite().nonnegative().max(5_000),
    location_provider: z.enum(complaintLocationProviders),
    location_captured_at: timestampSchema,
    location_verification_status: z.enum(complaintLocationVerificationStatuses),
    location_verification_score: z.number().finite().min(0).max(1).nullable(),
    routing_summary: z.unknown(),
    media: z.unknown(),
    assignment_history: z.unknown(),
    timeline: z.unknown(),
    internal_notes: z.unknown(),
    inspections: z.unknown(),
    work_references: z.unknown(),
    external_dependencies: z.unknown(),
    resolution_evidence: z.unknown(),
    allowed_actions: z.unknown(),
    allowed_status_transitions: z.unknown(),
  })
  .strict();

const assignmentOptionRowSchema = z
  .object({
    complaint_id: uuidSchema,
    workflow_version: z.number().int().positive(),
    options: z.unknown(),
  })
  .strict();

const actionRowSchema = z
  .object({
    response_payload: z.unknown(),
    replayed: z.boolean(),
  })
  .strict();

const reserveEvidenceRowSchema = z
  .object({
    evidence_id: uuidSchema,
    bucket_id: z.literal('resolution-evidence-private'),
    object_path: z.string().trim().min(1).max(1_024),
    kind: z.enum(governmentResolutionEvidenceKinds),
    declared_mime_type: z.string().trim().min(1).max(255),
    declared_byte_size: z
      .number()
      .int()
      .positive()
      .max(50 * 1_024 * 1_024),
    upload_status: z.enum(governmentResolutionEvidenceUploadStatuses),
    upload_expires_at: timestampSchema,
    created_at: timestampSchema,
    workflow_version: z.number().int().positive(),
    replayed: z.boolean(),
  })
  .strict();

const evidenceObjectRowSchema = z
  .object({
    evidence_id: uuidSchema,
    complaint_id: uuidSchema,
    bucket_id: z.literal('resolution-evidence-private'),
    object_path: z.string().trim().min(1).max(1_024),
    declared_mime_type: z.string().trim().min(1).max(255),
    declared_byte_size: z
      .number()
      .int()
      .positive()
      .max(50 * 1_024 * 1_024),
    client_sha256: z.string().regex(/^[0-9a-f]{64}$/u),
    observed_mime_type: z.string().trim().min(1).max(255).nullable(),
    observed_byte_size: z
      .number()
      .int()
      .positive()
      .max(50 * 1_024 * 1_024)
      .nullable(),
    upload_expires_at: timestampSchema,
    upload_status: z.enum(governmentResolutionEvidenceUploadStatuses),
    workflow_version: z.number().int().positive(),
  })
  .strict();

const finalizeEvidenceRowSchema = z
  .object({
    evidence_id: uuidSchema,
    kind: z.enum(governmentResolutionEvidenceKinds),
    observed_mime_type: z.string().trim().min(1).max(255),
    observed_byte_size: z
      .number()
      .int()
      .positive()
      .max(50 * 1_024 * 1_024),
    upload_status: z.enum(governmentResolutionEvidenceUploadStatuses),
    captured_at: nullableTimestampSchema,
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
    throw new GovernmentComplaintDataAccessError(`${operation} response`);
  }
  return parsed.data;
};

const firstRow = <Row>(rows: Row[], resource: 'complaint' | 'evidence'): Row => {
  const row = rows[0];
  if (!row) {
    throw new GovernmentComplaintNotFoundError(resource);
  }
  return row;
};

const encodeCursor = (submittedAt: string, complaintId: string): string =>
  Buffer.from(JSON.stringify({ submittedAt, complaintId }), 'utf8').toString('base64url');

const decodeCursor = (
  cursor: string | undefined,
): { submittedAt: string | null; complaintId: string | null } => {
  if (!cursor) {
    return { submittedAt: null, complaintId: null };
  }

  try {
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown;
    const decoded = z
      .object({ submittedAt: timestampSchema, complaintId: uuidSchema })
      .strict()
      .parse(value);
    return decoded;
  } catch {
    throw new GovernmentComplaintConflictError('GOVERNMENT_COMPLAINT_REQUEST_INVALID');
  }
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
  'COMPLAINT_ACTION_IDEMPOTENCY_CONFLICT',
  'COMPLAINT_ACTION_IN_PROGRESS',
  'INVALID_STATUS_TRANSITION',
  'OFFICER_ASSIGNMENT_REQUIRED',
  'OFFICER_ASSIGNMENT_INVALID',
  'RESOLUTION_EVIDENCE_NOT_READY',
  'RESOLUTION_EVIDENCE_UPLOAD_EXPIRED',
  'RESOLUTION_EVIDENCE_LIMIT_REACHED',
  'RESOLUTION_EVIDENCE_INTEGRITY_MISMATCH',
  'GOVERNMENT_COMPLAINT_REQUEST_INVALID',
]);

const toQueueItem = (row: z.infer<typeof queueRowSchema>) => ({
  id: row.complaint_id,
  complaintNumber: row.complaint_number,
  categoryId: row.category_id,
  categoryName: row.category_name,
  status: row.status,
  submittedAt: row.submitted_at,
  updatedAt: row.updated_at,
  workflowVersion: row.workflow_version,
  currentAssignment: row.current_assignment,
  flags: row.queue_flags,
});

const mutationPayload = (action: GovernmentComplaintAction): Record<string, unknown> => {
  const input: Record<string, unknown> = { ...action.input };
  delete input['expectedWorkflowVersion'];
  if (action.kind === 'complete_inspection') {
    return { ...input, inspectionId: action.inspectionId };
  }
  if (action.kind === 'resolve_external_dependency') {
    return { ...input, dependencyId: action.dependencyId };
  }
  return input;
};

@Injectable()
export class SupabaseGovernmentComplaintStore extends GovernmentComplaintStore {
  public constructor(
    @Inject(SupabaseClients)
    private readonly clients: SupabaseClients,
  ) {
    super();
  }

  public async listComplaints(
    actorUserId: string,
    query: GovernmentComplaintQueueQuery,
  ): Promise<GovernmentComplaintQueueResult> {
    const cursor = decodeCursor(query.cursor);
    const rows = decode(
      z.array(queueRowSchema),
      await this.callRpc('list government complaints', 'list_government_complaints', {
        p_actor_user_id: actorUserId,
        p_limit: query.limit,
        p_before_submitted_at: cursor.submittedAt,
        p_before_id: cursor.complaintId,
        p_scope_role_assignment_id: query.scopeRoleAssignmentId ?? null,
        p_queue: query.queue ?? null,
        p_statuses: query.statuses ?? null,
        p_category_id: query.categoryId ?? null,
        p_ward_id: query.wardId ?? null,
        p_authority_department_id: query.authorityDepartmentId ?? null,
        p_officer_assignment_id: query.officerAssignmentId ?? null,
        p_submitted_from: query.submittedFrom ?? null,
        p_submitted_to: query.submittedTo ?? null,
        p_search: query.search ?? null,
      }),
      'list government complaints',
    );
    const hasMore = rows.length > query.limit;
    const includedRows = rows.slice(0, query.limit);
    const last = includedRows.at(-1);

    return decodeGovernmentComplaintQueueResult({
      items: includedRows.map(toQueueItem),
      hasMore,
      nextCursor: hasMore && last ? encodeCursor(last.submitted_at, last.complaint_id) : null,
    });
  }

  public async getComplaint(
    actorUserId: string,
    complaintId: string,
    scopeRoleAssignmentId?: string,
  ): Promise<GovernmentComplaintDetail> {
    const rows = decode(
      z.array(detailRowSchema).max(1),
      await this.callRpc('get government complaint', 'get_government_complaint', {
        p_actor_user_id: actorUserId,
        p_complaint_id: complaintId,
        p_scope_role_assignment_id: scopeRoleAssignmentId ?? null,
      }),
      'get government complaint',
    );
    const row = firstRow(rows, 'complaint');

    return decodeGovernmentComplaintDetail({
      ...toQueueItem(row),
      description: row.description,
      location: {
        latitude: row.latitude,
        longitude: row.longitude,
        accuracyMeters: row.accuracy_meters,
        provider: row.location_provider,
        capturedAt: row.location_captured_at,
        verificationStatus: row.location_verification_status,
        verificationScore: row.location_verification_score,
      },
      routingSummary: row.routing_summary,
      media: row.media,
      assignmentHistory: row.assignment_history,
      timeline: row.timeline,
      internalNotes: row.internal_notes,
      inspections: row.inspections,
      workReferences: row.work_references,
      externalDependencies: row.external_dependencies,
      resolutionEvidence: row.resolution_evidence,
      allowedActions: row.allowed_actions,
      allowedStatusTransitions: row.allowed_status_transitions,
    });
  }

  public async listAssignmentOptions(
    actorUserId: string,
    complaintId: string,
    scopeRoleAssignmentId?: string,
  ): Promise<GovernmentComplaintAssignmentOptions> {
    const rows = decode(
      z.array(assignmentOptionRowSchema).max(1),
      await this.callRpc(
        'list government assignment options',
        'list_government_assignment_options',
        {
          p_actor_user_id: actorUserId,
          p_complaint_id: complaintId,
          p_scope_role_assignment_id: scopeRoleAssignmentId ?? null,
        },
      ),
      'list government assignment options',
    );
    const row = firstRow(rows, 'complaint');

    return decodeGovernmentComplaintAssignmentOptions({
      complaintId: row.complaint_id,
      workflowVersion: row.workflow_version,
      options: row.options,
    });
  }

  public async performAction(
    actorUserId: string,
    complaintId: string,
    action: GovernmentComplaintAction,
    identity: ComplaintMutationIdentity,
    requestId: string,
  ): Promise<GovernmentComplaintActionResult> {
    const rows = decode(
      z.array(actionRowSchema).length(1),
      await this.callRpc(
        `perform government complaint ${action.kind}`,
        'perform_government_complaint_action',
        {
          p_actor_user_id: actorUserId,
          p_complaint_id: complaintId,
          p_action_type: action.kind,
          p_expected_workflow_version: action.input.expectedWorkflowVersion,
          p_idempotency_key_hash: identity.idempotencyKeyHash,
          p_request_fingerprint: identity.requestFingerprint,
          p_request_id: requestId,
          p_payload: mutationPayload(action),
        },
      ),
      `perform government complaint ${action.kind}`,
    );
    return decodeGovernmentComplaintActionResult(rows[0]?.response_payload);
  }

  public async reserveResolutionEvidence(
    actorUserId: string,
    complaintId: string,
    input: CreateGovernmentResolutionEvidenceUploadIntentInput,
    identity: ComplaintMutationIdentity,
    requestId: string,
  ): Promise<ReservedGovernmentResolutionEvidence> {
    const rows = decode(
      z.array(reserveEvidenceRowSchema).length(1),
      await this.callRpc(
        'reserve government resolution evidence',
        'reserve_government_resolution_evidence',
        {
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
          p_captured_at: input.capturedAt ?? null,
        },
      ),
      'reserve government resolution evidence',
    );
    const row = firstRow(rows, 'evidence');
    const evidence = governmentResolutionEvidenceSchema.parse({
      id: row.evidence_id,
      availableForResolution: false,
      kind: row.kind,
      mimeType: row.declared_mime_type,
      byteSize: row.declared_byte_size,
      uploadStatus: row.upload_status,
      capturedAt: input.capturedAt ?? null,
      finalizedAt: null,
      createdAt: row.created_at,
    });

    return {
      bucket: row.bucket_id,
      evidence,
      objectPath: row.object_path,
      uploadExpiresAt: row.upload_expires_at,
      workflowVersion: row.workflow_version,
    };
  }

  public async getResolutionEvidenceObject(
    actorUserId: string,
    complaintId: string,
    evidenceId: string,
    purpose: 'finalize' | 'view',
    scopeRoleAssignmentId?: string,
  ): Promise<GovernmentResolutionEvidenceObjectLocator> {
    const rows = decode(
      z.array(evidenceObjectRowSchema).max(1),
      await this.callRpc(
        'get government resolution evidence object',
        'get_government_resolution_evidence_object',
        {
          p_actor_user_id: actorUserId,
          p_complaint_id: complaintId,
          p_evidence_id: evidenceId,
          p_purpose: purpose,
          p_scope_role_assignment_id: scopeRoleAssignmentId ?? null,
        },
      ),
      'get government resolution evidence object',
    );
    const row = firstRow(rows, 'evidence');
    if (row.complaint_id !== complaintId) {
      throw new GovernmentComplaintNotFoundError('evidence');
    }
    return {
      bucket: row.bucket_id,
      clientSha256: row.client_sha256,
      declaredByteSize: row.declared_byte_size,
      declaredMimeType: row.declared_mime_type,
      observedByteSize: row.observed_byte_size,
      observedMimeType: row.observed_mime_type,
      objectPath: row.object_path,
      uploadExpiresAt: row.upload_expires_at,
      uploadStatus: row.upload_status,
      workflowVersion: row.workflow_version,
    };
  }

  public async finalizeResolutionEvidence(
    actorUserId: string,
    complaintId: string,
    evidenceId: string,
    input: FinalizeGovernmentResolutionEvidenceInput,
    observed: ResolutionEvidenceObject,
    identity: ComplaintMutationIdentity,
    requestId: string,
  ): Promise<GovernmentResolutionEvidenceFinalization> {
    const rows = decode(
      z.array(finalizeEvidenceRowSchema).length(1),
      await this.callRpc(
        'finalize government resolution evidence',
        'finalize_government_resolution_evidence',
        {
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
        },
      ),
      'finalize government resolution evidence',
    );
    const row = firstRow(rows, 'evidence');

    return {
      evidence: governmentResolutionEvidenceSchema.parse({
        id: row.evidence_id,
        availableForResolution: true,
        kind: row.kind,
        mimeType: row.observed_mime_type,
        byteSize: row.observed_byte_size,
        uploadStatus: row.upload_status,
        capturedAt: row.captured_at,
        finalizedAt: row.finalized_at,
        createdAt: row.created_at,
      }),
      workflowVersion: row.workflow_version,
    };
  }

  public async failResolutionEvidence(
    evidenceId: string,
    failureCode: 'CONTENT_TYPE_MISMATCH' | 'OBJECT_INTEGRITY_MISMATCH',
  ): Promise<void> {
    const rows = decode(
      z.array(failedEvidenceRowSchema).length(1),
      await this.callRpc(
        'mark government resolution evidence failed',
        'fail_government_resolution_evidence',
        {
          p_evidence_id: evidenceId,
          p_failure_code: failureCode,
        },
      ),
      'mark government resolution evidence failed',
    );
    if (rows[0]?.evidence_id !== evidenceId) {
      throw new GovernmentComplaintDataAccessError('mark government resolution evidence failed');
    }
  }

  public submitResolution(
    actorUserId: string,
    complaintId: string,
    input: SubmitGovernmentComplaintResolutionInput,
    identity: ComplaintMutationIdentity,
    requestId: string,
  ): Promise<GovernmentComplaintActionResult> {
    return this.performAction(
      actorUserId,
      complaintId,
      { kind: 'submit_resolution', input },
      identity,
      requestId,
    );
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
        throw new GovernmentComplaintAccessDeniedError();
      }
      if (marker === 'COMPLAINT_NOT_FOUND') {
        throw new GovernmentComplaintNotFoundError('complaint');
      }
      if (marker === 'RESOLUTION_EVIDENCE_NOT_FOUND') {
        throw new GovernmentComplaintNotFoundError('evidence');
      }
      if (marker === 'COMPLAINT_INSPECTION_NOT_FOUND') {
        throw new GovernmentComplaintNotFoundError('inspection');
      }
      if (marker === 'COMPLAINT_EXTERNAL_DEPENDENCY_NOT_FOUND') {
        throw new GovernmentComplaintNotFoundError('dependency');
      }
      if (marker && conflictMarkers.has(marker)) {
        throw new GovernmentComplaintConflictError(marker);
      }
      if (error) {
        throw new GovernmentComplaintDataAccessError(operation);
      }
      return data;
    } catch (error) {
      if (error instanceof GovernmentComplaintDataAccessError) {
        throw error;
      }
      throw new GovernmentComplaintDataAccessError(operation);
    }
  }
}
