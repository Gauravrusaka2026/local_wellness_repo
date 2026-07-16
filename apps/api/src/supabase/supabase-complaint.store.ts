import { createHash } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import {
  complaintDraftStatuses,
  complaintLocationProviders,
  complaintLocationVerificationStatuses,
  complaintMediaCaptureSources,
  complaintMediaKinds,
  complaintMediaMimeTypes,
  complaintMediaModerationStatuses,
  complaintMediaProcessingStatuses,
  complaintMediaUploadStatuses,
  complaintStatuses,
  complaintVisibilityValues,
  type ComplaintDetail,
  type ComplaintDraft,
  type ComplaintDuplicateCheckResult,
  type ComplaintListQuery,
  type ComplaintListResult,
  type ComplaintLocationCapture,
  type ComplaintLocationEvidence,
  type ComplaintMedia,
  type ComplaintReceipt,
  type ComplaintTimeline,
  type CreateComplaintDraftInput,
  type CreateComplaintMediaUploadIntentInput,
  type DuplicateDetectionResult,
  type FinalizeComplaintMediaInput,
  type UpdateComplaintDraftInput,
} from '@local-wellness/types';
import { complaintCustomAttributesSchema } from '@local-wellness/validation';
import { z } from 'zod';

import {
  ComplaintConflictError,
  ComplaintDataAccessError,
  type ComplaintDuplicateEvidence,
  type ComplaintMediaObjectLocator,
  type ComplaintMutationIdentity,
  ComplaintNotFoundError,
  ComplaintStore,
  type CompleteComplaintSubmissionInput,
  type ReservedComplaintMedia,
  type ComplaintSubmissionClaim,
} from '../data/complaint.store.js';
import { RoutingStore } from '../data/routing.store.js';
import { toPublicRoutingResult } from '../routing/routing.service.js';
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
const nullableUuidSchema = uuidSchema.nullable();
const timestampSchema = z.iso.datetime({ offset: true });
const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/u);

const draftRowSchema = z
  .object({
    draft_id: uuidSchema,
    category_id: nullableUuidSchema,
    asset_id: nullableUuidSchema,
    description: z.string().nullable(),
    description_language: z.enum(['en', 'hi', 'mr']),
    custom_attributes: complaintCustomAttributesSchema,
    selected_location_evidence_id: nullableUuidSchema,
    status: z.enum(complaintDraftStatuses),
    revision: z.number().int().positive(),
    expires_at: timestampSchema,
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .strict();

const createDraftRowSchema = z
  .object({
    draft_id: uuidSchema,
    status: z.enum(complaintDraftStatuses),
    revision: z.number().int().positive(),
    created_at: timestampSchema,
    replayed: z.boolean(),
  })
  .strict();

const locationRowSchema = z
  .object({
    location_evidence_id: uuidSchema,
    evidence_type: z.enum(['current_location', 'media_capture']),
    longitude: z.number().finite().min(-180).max(180),
    latitude: z.number().finite().min(-90).max(90),
    accuracy_meters: z.number().finite().nonnegative().max(5_000),
    provider: z.enum(complaintLocationProviders),
    captured_at: timestampSchema,
    device_recorded_at: timestampSchema,
    received_at: timestampSchema,
    mock_location_detected: z.boolean().nullable(),
    spoof_risk_status: z.enum(['unknown', 'low', 'review', 'high', 'blocked']),
    verification_status: z.enum(complaintLocationVerificationStatuses),
    verification_score: z.number().finite().min(0).max(1).nullable(),
    created_at: timestampSchema,
  })
  .strict();

const mediaRowSchema = z
  .object({
    media_id: uuidSchema,
    draft_id: uuidSchema,
    complaint_id: nullableUuidSchema,
    client_media_id: uuidSchema,
    media_kind: z.enum(complaintMediaKinds),
    capture_source: z.enum(complaintMediaCaptureSources),
    bucket_id: z.string().min(1),
    object_path: z.string().min(1),
    declared_mime_type: z.enum(complaintMediaMimeTypes),
    declared_byte_size: z
      .number()
      .int()
      .positive()
      .max(50 * 1_024 * 1_024),
    client_sha256: sha256Schema,
    width_pixels: z.number().int().positive().nullable(),
    height_pixels: z.number().int().positive().nullable(),
    duration_seconds: z.number().finite().positive().nullable(),
    capture_location_evidence_id: nullableUuidSchema,
    captured_at: timestampSchema.nullable(),
    distance_to_complaint_meters: z.number().finite().nonnegative().nullable(),
    upload_status: z.enum(complaintMediaUploadStatuses),
    processing_status: z.enum(complaintMediaProcessingStatuses),
    moderation_status: z.enum(complaintMediaModerationStatuses),
    upload_expires_at: timestampSchema,
    finalized_at: timestampSchema.nullable(),
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .strict();

const mediaIntentRowSchema = z
  .object({
    media_id: uuidSchema,
    draft_id: uuidSchema,
    bucket_id: z.string().min(1),
    object_path: z.string().min(1),
    declared_mime_type: z.enum(complaintMediaMimeTypes),
    declared_byte_size: z.number().int().positive(),
    client_sha256: sha256Schema,
    width_pixels: z.number().int().positive().nullable(),
    height_pixels: z.number().int().positive().nullable(),
    duration_seconds: z.number().finite().positive().nullable(),
    upload_status: z.enum(complaintMediaUploadStatuses),
    upload_expires_at: timestampSchema,
    finalized_at: timestampSchema.nullable(),
  })
  .strict();

const reserveMediaRowSchema = z
  .object({
    media_id: uuidSchema,
    bucket_id: z.string().min(1),
    object_path: z.string().min(1),
    upload_status: z.enum(complaintMediaUploadStatuses),
    upload_expires_at: timestampSchema,
    replayed: z.boolean(),
  })
  .strict();

const duplicateWeightsSchema = z
  .object({
    category: z.number().finite().nonnegative(),
    location: z.number().finite().nonnegative(),
    time: z.number().finite().nonnegative(),
    description: z.number().finite().nonnegative(),
    media: z.number().finite().nonnegative(),
    asset: z.number().finite().nonnegative(),
  })
  .strict();

const duplicateCandidateRowSchema = z
  .object({
    policy_id: uuidSchema,
    policy_version_id: uuidSchema,
    policy_version: z.number().int().positive(),
    maximum_distance_meters: z.number().finite().positive(),
    maximum_age_seconds: z.number().int().positive(),
    minimum_score: z.number().finite().min(0).max(1),
    maximum_results: z.number().int().positive(),
    weights: duplicateWeightsSchema,
    candidate_complaint_id: nullableUuidSchema,
    complaint_number: z.string().min(1).nullable(),
    category_id: nullableUuidSchema,
    category_name: z.string().min(1).nullable(),
    asset_id: nullableUuidSchema,
    public_status: z.enum(complaintStatuses).nullable(),
    candidate_submitted_at: timestampSchema.nullable(),
    distance_meters: z.number().finite().nonnegative().nullable(),
    age_seconds: z.number().int().nonnegative().nullable(),
    description_similarity: z.number().finite().min(0).max(1).nullable(),
    matching_media_hashes: z.number().int().nonnegative().nullable(),
  })
  .strict();

const submissionResponseSchema = z
  .object({
    complaintId: uuidSchema,
    draftId: uuidSchema,
    complaintNumber: z.string().min(1),
    status: z.enum(complaintStatuses),
    submittedAt: timestampSchema,
    routingDecisionId: uuidSchema,
    assignmentId: uuidSchema,
    authorityId: uuidSchema,
    localBodyId: uuidSchema,
    wardId: nullableUuidSchema,
    departmentId: uuidSchema,
    officerRoleId: uuidSchema,
  })
  .strict();

const submissionClaimRowSchema = z
  .object({
    submission_request_id: uuidSchema,
    state: z.enum(['claimed', 'completed']),
    routing_request_id: z.string().min(1).max(128),
    complaint_id: nullableUuidSchema,
    response_payload: submissionResponseSchema.nullable(),
    replayed: z.boolean(),
  })
  .strict();

const submittedComplaintRowSchema = z
  .object({
    complaint_id: uuidSchema,
    draft_id: uuidSchema,
    complaint_number: z.string().min(1),
    status: z.enum(complaintStatuses),
    submitted_at: timestampSchema,
    routing_decision_id: uuidSchema,
    assignment_id: uuidSchema,
    authority_id: uuidSchema,
    local_body_id: uuidSchema,
    ward_id: nullableUuidSchema,
    department_id: uuidSchema,
    officer_role_id: uuidSchema,
    replayed: z.boolean(),
  })
  .strict();

const complaintListRowSchema = z
  .object({
    complaint_id: uuidSchema,
    draft_id: uuidSchema,
    complaint_number: z.string().min(1),
    category_id: uuidSchema,
    category_name: z.string().min(1),
    status: z.enum(complaintStatuses),
    visibility: z.enum(complaintVisibilityValues),
    submitted_at: timestampSchema,
    updated_at: timestampSchema,
    authority_id: uuidSchema,
    local_body_id: uuidSchema,
    ward_id: nullableUuidSchema,
    department_id: uuidSchema,
  })
  .strict();

const complaintDetailRowSchema = z
  .object({
    complaint_id: uuidSchema,
    draft_id: uuidSchema,
    complaint_number: z.string().min(1),
    category_id: uuidSchema,
    category_name: z.string().min(1),
    asset_id: nullableUuidSchema,
    description: z.string().nullable(),
    description_language: z.enum(['en', 'hi', 'mr']),
    custom_attributes: z.record(z.string(), z.unknown()),
    status: z.enum(complaintStatuses),
    visibility: z.literal('private'),
    submitted_at: timestampSchema,
    updated_at: timestampSchema,
    location_evidence_id: uuidSchema,
    longitude: z.number().finite().min(-180).max(180),
    latitude: z.number().finite().min(-90).max(90),
    accuracy_meters: z.number().finite().nonnegative(),
    location_provider: z.enum(complaintLocationProviders),
    location_captured_at: timestampSchema,
    location_device_recorded_at: timestampSchema,
    mock_location_detected: z.boolean().nullable(),
    location_verification_status: z.enum(complaintLocationVerificationStatuses),
    location_verification_score: z.number().finite().min(0).max(1).nullable(),
    routing_decision_id: uuidSchema,
    routing_request_id: z.string().min(1).max(128),
    assignment_id: uuidSchema,
    authority_id: uuidSchema,
    local_body_id: uuidSchema,
    ward_id: nullableUuidSchema,
    department_id: uuidSchema,
    authority_department_id: uuidSchema,
    officer_role_id: uuidSchema,
  })
  .strict();

const timelineRowSchema = z
  .object({
    event_id: uuidSchema,
    sequence: z.number().int().positive(),
    from_status: z.string().min(1).nullable(),
    to_status: z.enum(complaintStatuses),
    reason_code: z.string().min(1),
    public_message: z.string().min(1).nullable(),
    occurred_at: timestampSchema,
  })
  .strict();

const decode = <Output>(schema: z.ZodType<Output>, value: unknown, operation: string): Output => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ComplaintDataAccessError(operation);
  }
  return result.data;
};

const firstRow = <Output>(
  rows: readonly Output[],
  resource: 'complaint' | 'draft' | 'media',
): Output => {
  const row = rows[0];
  if (!row) {
    throw new ComplaintNotFoundError(resource);
  }
  return row;
};

const toDeterministicUuid = (hexDigest: string): string => {
  const bytes = hexDigest.slice(0, 32).split('');
  bytes[12] = '4';
  const variant = Number.parseInt(bytes[16] ?? '0', 16);
  bytes[16] = ((variant & 0x3) | 0x8).toString(16);
  const value = bytes.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
};

const digestJson = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

const toLocation = (row: z.infer<typeof locationRowSchema>): ComplaintLocationEvidence => ({
  id: row.location_evidence_id,
  latitude: row.latitude,
  longitude: row.longitude,
  accuracyMeters: row.accuracy_meters,
  capturedAt: row.captured_at,
  deviceRecordedAt: row.device_recorded_at,
  provider: row.provider,
  isMockLocation: row.mock_location_detected,
  verificationStatus: row.verification_status,
  verificationScore: row.verification_score,
});

const toMedia = (
  row: z.infer<typeof mediaRowSchema>,
  locationById: ReadonlyMap<string, ComplaintLocationEvidence>,
  complaintIdOverride?: string,
): ComplaintMedia => {
  const captureLocation =
    row.capture_location_evidence_id === null
      ? null
      : locationById.get(row.capture_location_evidence_id);

  if (captureLocation === undefined) {
    throw new ComplaintDataAccessError('decode complaint media capture location');
  }

  return {
    id: row.media_id,
    draftId: row.draft_id,
    complaintId: complaintIdOverride ?? row.complaint_id,
    uploadStatus: row.upload_status,
    processingStatus: row.processing_status,
    moderationStatus: row.moderation_status,
    metadata: {
      kind: row.media_kind,
      captureSource: row.capture_source,
      mimeType: row.declared_mime_type,
      byteSize: row.declared_byte_size,
      sha256: row.client_sha256,
      capturedAt: row.captured_at,
      widthPixels: row.width_pixels,
      heightPixels: row.height_pixels,
      durationMilliseconds:
        row.duration_seconds === null ? null : Math.round(row.duration_seconds * 1_000),
      captureLocation,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const encodeCursor = (submittedAt: string, complaintId: string): string =>
  Buffer.from(JSON.stringify({ submittedAt, complaintId }), 'utf8').toString('base64url');

const decodeCursor = (
  cursor: string | undefined,
): { submittedAt: string | null; id: string | null } => {
  if (!cursor) {
    return { submittedAt: null, id: null };
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown;
    const decoded = z
      .object({ submittedAt: timestampSchema, complaintId: uuidSchema })
      .strict()
      .parse(parsed);
    return { submittedAt: decoded.submittedAt, id: decoded.complaintId };
  } catch {
    throw new ComplaintConflictError('COMPLAINT_LIST_CURSOR_INVALID');
  }
};

const databaseMarker = (error: unknown): string | null =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof error.message === 'string' &&
  /^COMPLAINT_[A-Z0-9_]+$/u.test(error.message)
    ? error.message
    : null;

const conflictMarkers = new Set([
  'COMPLAINT_ASSET_REQUIRED',
  'COMPLAINT_CATEGORY_NOT_ROUTABLE',
  'COMPLAINT_DRAFT_IDEMPOTENCY_CONFLICT',
  'COMPLAINT_DRAFT_NOT_SUBMITTABLE',
  'COMPLAINT_DRAFT_REVISION_CONFLICT',
  'COMPLAINT_DUPLICATE_ACKNOWLEDGEMENT_INVALID',
  'COMPLAINT_DUPLICATE_ACKNOWLEDGEMENT_REQUIRED',
  'COMPLAINT_DUPLICATE_POLICY_AMBIGUOUS',
  'COMPLAINT_DUPLICATE_POLICY_NOT_FOUND',
  'COMPLAINT_DUPLICATE_RECORD_CONFLICT',
  'COMPLAINT_DUPLICATE_SOURCE_INCOMPLETE',
  'COMPLAINT_EMERGENCY_DISCLAIMER_REQUIRED',
  'COMPLAINT_LOCATION_NOT_VERIFIED',
  'COMPLAINT_MEDIA_COUNT_INVALID',
  'COMPLAINT_MEDIA_FINALIZATION_CONFLICT',
  'COMPLAINT_MEDIA_IDEMPOTENCY_CONFLICT',
  'COMPLAINT_MEDIA_INTENT_EXPIRED',
  'COMPLAINT_MEDIA_LIMIT_EXCEEDED',
  'COMPLAINT_MEDIA_LOCATION_MISMATCH',
  'COMPLAINT_MEDIA_NOT_READY',
  'COMPLAINT_MEDIA_OBJECT_MISMATCH',
  'COMPLAINT_REQUIRED_ATTRIBUTES_MISSING',
  'COMPLAINT_ROUTING_EVIDENCE_MISMATCH',
  'COMPLAINT_SUBMISSION_IDEMPOTENCY_CONFLICT',
]);

@Injectable()
export class SupabaseComplaintStore extends ComplaintStore {
  public constructor(
    @Inject(SupabaseClients)
    private readonly clients: SupabaseClients,
    @Inject(RoutingStore)
    private readonly routingStore: RoutingStore,
  ) {
    super();
  }

  public async createDraft(
    actorUserId: string,
    input: CreateComplaintDraftInput,
    identity: ComplaintMutationIdentity,
  ): Promise<ComplaintDraft> {
    const rows = decode(
      z.array(createDraftRowSchema).length(1),
      await this.callRpc('create complaint draft', 'create_complaint_draft', {
        p_actor_user_id: actorUserId,
        p_idempotency_key_hash: identity.idempotencyKeyHash,
        p_request_fingerprint: identity.requestFingerprint,
        p_category_id: input.categoryId ?? null,
        p_asset_id: input.assetId ?? null,
        p_description: input.description ?? null,
        p_description_language: 'en',
        p_custom_attributes: input.customAttributes ?? {},
      }),
      'create complaint draft',
    );
    const created = firstRow(rows, 'draft');
    let draft = await this.getDraft(actorUserId, created.draft_id);

    if (input.location && draft.location === null) {
      draft = await this.appendLocation(actorUserId, draft.id, input.location);
    }

    return draft;
  }

  public async getDraft(actorUserId: string, draftId: string): Promise<ComplaintDraft> {
    const raw = await this.getRawDraft(actorUserId, draftId);
    const locations = await this.listLocations(actorUserId, draftId);
    const locationById = new Map(
      locations.map((row) => [row.location_evidence_id, toLocation(row)]),
    );
    const mediaRows = await this.listMediaRows(actorUserId, draftId);
    const selectedLocation =
      raw.selected_location_evidence_id === null
        ? null
        : locationById.get(raw.selected_location_evidence_id);

    if (selectedLocation === undefined) {
      throw new ComplaintDataAccessError('decode selected complaint location');
    }

    return {
      id: raw.draft_id,
      status: raw.status,
      visibility: 'private',
      categoryId: raw.category_id,
      assetId: raw.asset_id,
      description: raw.description,
      customAttributes: raw.custom_attributes,
      location: selectedLocation,
      media: mediaRows.map((row) => toMedia(row, locationById)),
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      expiresAt: raw.expires_at,
    };
  }

  public async updateDraft(
    actorUserId: string,
    draftId: string,
    input: UpdateComplaintDraftInput,
  ): Promise<ComplaintDraft> {
    const current = await this.getRawDraft(actorUserId, draftId);
    const selectedLocationId =
      input.location === null ? null : current.selected_location_evidence_id;

    await this.callRpc('update complaint draft', 'update_complaint_draft', {
      p_actor_user_id: actorUserId,
      p_draft_id: draftId,
      p_expected_revision: current.revision,
      p_category_id: input.categoryId === undefined ? current.category_id : input.categoryId,
      p_asset_id: input.assetId === undefined ? current.asset_id : input.assetId,
      p_description: input.description === undefined ? current.description : input.description,
      p_description_language: current.description_language,
      p_custom_attributes:
        input.customAttributes === undefined ? current.custom_attributes : input.customAttributes,
      p_selected_location_evidence_id: selectedLocationId,
    });

    return this.getDraft(actorUserId, draftId);
  }

  public async discardDraft(actorUserId: string, draftId: string): Promise<void> {
    const current = await this.getRawDraft(actorUserId, draftId);
    await this.callRpc('discard complaint draft', 'discard_complaint_draft', {
      p_actor_user_id: actorUserId,
      p_draft_id: draftId,
      p_expected_revision: current.revision,
    });
  }

  public async appendLocation(
    actorUserId: string,
    draftId: string,
    input: ComplaintLocationCapture,
  ): Promise<ComplaintDraft> {
    const evidenceId = await this.appendLocationEvidence(
      actorUserId,
      draftId,
      input,
      'current_location',
    );
    const current = await this.getRawDraft(actorUserId, draftId);

    await this.callRpc('select complaint location evidence', 'update_complaint_draft', {
      p_actor_user_id: actorUserId,
      p_draft_id: draftId,
      p_expected_revision: current.revision,
      p_category_id: current.category_id,
      p_asset_id: current.asset_id,
      p_description: current.description,
      p_description_language: current.description_language,
      p_custom_attributes: current.custom_attributes,
      p_selected_location_evidence_id: evidenceId,
    });

    return this.getDraft(actorUserId, draftId);
  }

  public async reserveMedia(
    actorUserId: string,
    input: CreateComplaintMediaUploadIntentInput,
    identity: ComplaintMutationIdentity,
  ): Promise<ReservedComplaintMedia> {
    const clientMediaId = toDeterministicUuid(identity.idempotencyKeyHash);
    const existingMedia = (await this.listMediaRows(actorUserId, input.draftId)).find(
      (media) => media.client_media_id === clientMediaId,
    );
    let captureLocationEvidenceId = existingMedia?.capture_location_evidence_id ?? null;

    if (existingMedia && input.captureLocation) {
      const existingLocations = await this.listLocations(actorUserId, input.draftId);
      const existingLocation = existingLocations.find(
        (location) => location.location_evidence_id === captureLocationEvidenceId,
      );
      if (
        !existingLocation ||
        existingLocation.latitude !== input.captureLocation.latitude ||
        existingLocation.longitude !== input.captureLocation.longitude ||
        existingLocation.accuracy_meters !== input.captureLocation.accuracyMeters ||
        existingLocation.provider !== input.captureLocation.provider ||
        existingLocation.captured_at !== input.captureLocation.capturedAt ||
        existingLocation.device_recorded_at !== input.captureLocation.deviceRecordedAt ||
        existingLocation.mock_location_detected !== input.captureLocation.isMockLocation
      ) {
        throw new ComplaintConflictError('COMPLAINT_MEDIA_IDEMPOTENCY_CONFLICT');
      }
    } else if (existingMedia && !input.captureLocation && captureLocationEvidenceId !== null) {
      throw new ComplaintConflictError('COMPLAINT_MEDIA_IDEMPOTENCY_CONFLICT');
    } else if (!existingMedia && input.captureLocation) {
      captureLocationEvidenceId = await this.appendLocationEvidence(
        actorUserId,
        input.draftId,
        input.captureLocation,
        'media_capture',
      );
    }
    const rows = decode(
      z.array(reserveMediaRowSchema).length(1),
      await this.callRpc('reserve complaint media', 'reserve_complaint_media', {
        p_actor_user_id: actorUserId,
        p_draft_id: input.draftId,
        p_client_media_id: clientMediaId,
        p_media_kind: input.kind,
        p_capture_source: input.captureSource,
        p_declared_mime_type: input.mimeType,
        p_declared_byte_size: input.byteSize,
        p_client_sha256: input.sha256,
        p_width_pixels: input.widthPixels ?? null,
        p_height_pixels: input.heightPixels ?? null,
        p_duration_seconds:
          input.durationMilliseconds === undefined ? null : input.durationMilliseconds / 1_000,
        p_capture_location_evidence_id: captureLocationEvidenceId,
        p_captured_at: input.capturedAt ?? null,
      }),
      'reserve complaint media',
    );
    const reserved = firstRow(rows, 'media');

    return {
      bucket: reserved.bucket_id,
      objectPath: reserved.object_path,
      uploadExpiresAt: reserved.upload_expires_at,
      media: await this.getMedia(actorUserId, reserved.media_id),
    };
  }

  public async getMedia(actorUserId: string, mediaId: string): Promise<ComplaintMedia> {
    const intent = await this.getMediaIntent(actorUserId, mediaId);
    const locations = await this.listLocations(actorUserId, intent.draft_id);
    const locationById = new Map(
      locations.map((row) => [row.location_evidence_id, toLocation(row)]),
    );
    const mediaRows = await this.listMediaRows(actorUserId, intent.draft_id);
    const media = mediaRows.find((row) => row.media_id === mediaId);

    if (!media) {
      throw new ComplaintNotFoundError('media');
    }
    return toMedia(media, locationById);
  }

  public async getMediaObject(
    actorUserId: string,
    mediaId: string,
  ): Promise<ComplaintMediaObjectLocator> {
    const intent = await this.getMediaIntent(actorUserId, mediaId);
    return { bucket: intent.bucket_id, objectPath: intent.object_path };
  }

  public async finalizeMedia(
    actorUserId: string,
    mediaId: string,
    input: FinalizeComplaintMediaInput,
  ): Promise<ComplaintMedia> {
    const intent = await this.getMediaIntent(actorUserId, mediaId);
    await this.callRpc('finalize complaint media', 'finalize_complaint_media', {
      p_actor_user_id: actorUserId,
      p_media_id: mediaId,
      p_observed_mime_type: intent.declared_mime_type,
      p_observed_byte_size: input.byteSize,
      p_verified_sha256: input.sha256,
    });
    return this.getMedia(actorUserId, mediaId);
  }

  public async loadDuplicateEvidence(
    actorUserId: string,
    draftId: string,
    checkedAt: string,
  ): Promise<ComplaintDuplicateEvidence> {
    const draft = await this.getDraft(actorUserId, draftId);
    if (!draft.categoryId || !draft.location) {
      throw new ComplaintConflictError('COMPLAINT_DUPLICATE_SOURCE_INCOMPLETE');
    }
    const rows = decode(
      z.array(duplicateCandidateRowSchema).min(1),
      await this.callRpc(
        'find complaint duplicate candidates',
        'find_complaint_duplicate_candidates',
        {
          p_actor_user_id: actorUserId,
          p_draft_id: draftId,
          p_duplicate_policy_version_id: null,
          p_checked_at: checkedAt,
        },
      ),
      'find complaint duplicate candidates',
    );
    const policyRow = firstRow(rows, 'draft');
    const mediaHashes = draft.media
      .filter((media) => media.uploadStatus === 'finalized')
      .map((media) => media.metadata.sha256);
    const candidates = rows.flatMap((row) =>
      row.candidate_complaint_id &&
      row.category_id &&
      row.distance_meters !== null &&
      row.age_seconds !== null &&
      row.matching_media_hashes !== null
        ? [
            {
              complaintId: row.candidate_complaint_id,
              categoryId: row.category_id,
              assetId: row.asset_id,
              distanceMeters: row.distance_meters,
              ageSeconds: row.age_seconds,
              descriptionSimilarity: row.description_similarity,
              matchingMediaHashes: row.matching_media_hashes,
            },
          ]
        : [],
    );
    const suggestions = rows.flatMap((row) =>
      row.candidate_complaint_id &&
      row.complaint_number &&
      row.category_id &&
      row.category_name &&
      row.public_status &&
      row.candidate_submitted_at
        ? [
            {
              complaintId: row.candidate_complaint_id,
              complaintNumber: row.complaint_number,
              categoryId: row.category_id,
              categoryName: row.category_name,
              status: row.public_status,
              submittedAt: row.candidate_submitted_at,
            },
          ]
        : [],
    );

    return {
      input: {
        categoryId: draft.categoryId,
        location: {
          latitude: draft.location.latitude,
          longitude: draft.location.longitude,
        },
        occurredAt: draft.location.capturedAt,
        assetId: draft.assetId,
        description: draft.description,
        mediaHashes: [...new Set(mediaHashes)],
      },
      policy: {
        id: policyRow.policy_id,
        versionId: policyRow.policy_version_id,
        version: policyRow.policy_version,
        maximumDistanceMeters: policyRow.maximum_distance_meters,
        maximumAgeSeconds: policyRow.maximum_age_seconds,
        minimumScore: policyRow.minimum_score,
        maximumResults: policyRow.maximum_results,
        weights: policyRow.weights,
      },
      candidates,
      suggestions,
    };
  }

  public async recordDuplicateCheck(
    actorUserId: string,
    draftId: string,
    result: DuplicateDetectionResult,
    evidence: ComplaintDuplicateEvidence,
    checkedAt: string,
  ): Promise<ComplaintDuplicateCheckResult> {
    const matches = result.matches.map((match) => {
      const candidate = evidence.candidates.find(
        (entry) => entry.complaintId === match.complaintId,
      );
      if (!candidate) {
        throw new ComplaintDataAccessError('record complaint duplicate check');
      }
      return {
        candidateComplaintId: match.complaintId,
        score: match.score,
        distanceMeters: match.distanceMeters,
        ageSeconds: candidate.ageSeconds,
        factors: match.factors,
      };
    });
    const requestId = `duplicate-check:${digestJson({ actorUserId, draftId, checkedAt }).slice(0, 32)}`;
    const runId = decode(
      uuidSchema,
      await this.callRpc('record complaint duplicate check', 'record_complaint_duplicate_check', {
        p_actor_user_id: actorUserId,
        p_draft_id: draftId,
        p_duplicate_policy_version_id: result.policyVersionId,
        p_request_id: requestId,
        p_result_fingerprint: digestJson(result),
        p_checked_at: checkedAt,
        p_matches: matches,
      }),
      'record complaint duplicate check',
    );
    const suggestionById = new Map(evidence.suggestions.map((entry) => [entry.complaintId, entry]));

    return {
      id: runId,
      draftId,
      policyId: result.policyId,
      policyVersionId: result.policyVersionId,
      policyVersion: result.policyVersion,
      checkedAt,
      suggestions: result.matches.map((match) => {
        const suggestion = suggestionById.get(match.complaintId);
        if (!suggestion) {
          throw new ComplaintDataAccessError('decode complaint duplicate suggestion');
        }
        return {
          ...suggestion,
          score: match.score,
          approximateDistanceMeters: match.distanceMeters,
        };
      }),
    };
  }

  public async claimSubmission(
    actorUserId: string,
    draftId: string,
    identity: ComplaintMutationIdentity,
  ): Promise<ComplaintSubmissionClaim> {
    const rows = decode(
      z.array(submissionClaimRowSchema).length(1),
      await this.callRpc('claim complaint submission', 'claim_complaint_submission', {
        p_actor_user_id: actorUserId,
        p_draft_id: draftId,
        p_idempotency_key_hash: identity.idempotencyKeyHash,
        p_request_fingerprint: identity.requestFingerprint,
      }),
      'claim complaint submission',
    );
    const row = firstRow(rows, 'draft');
    let response: ComplaintReceipt | null = null;

    if (row.state === 'completed') {
      if (!row.response_payload || !row.complaint_id) {
        throw new ComplaintDataAccessError('replay complaint submission');
      }
      const [draft, replay] = await Promise.all([
        this.getDraft(actorUserId, draftId),
        this.routingStore.findRecordedRoutingDecision(actorUserId, row.routing_request_id),
      ]);
      if (
        row.response_payload.draftId !== draftId ||
        !draft.categoryId ||
        !replay ||
        replay.id !== row.response_payload.routingDecisionId
      ) {
        throw new ComplaintDataAccessError('replay complaint submission');
      }
      response = {
        id: row.response_payload.complaintId,
        complaintNumber: row.response_payload.complaintNumber,
        status: row.response_payload.status,
        visibility: 'private',
        categoryId: draft.categoryId,
        submittedAt: row.response_payload.submittedAt,
        routing: toPublicRoutingResult(replay.decision),
      };
    }

    return {
      submissionRequestId: row.submission_request_id,
      state: row.state,
      routingRequestId: row.routing_request_id,
      complaintId: row.complaint_id,
      response,
    };
  }

  public async completeSubmission(
    input: CompleteComplaintSubmissionInput,
  ): Promise<ComplaintReceipt> {
    const rows = decode(
      z.array(submittedComplaintRowSchema).length(1),
      await this.callRpc('submit complaint', 'submit_complaint', {
        p_actor_user_id: input.actorUserId,
        p_submission_request_id: input.submissionRequestId,
        p_routing_decision_id: input.routingDecisionId,
        p_acknowledged_duplicate_suggestion_ids: input.acknowledgedDuplicateSuggestionIds,
        p_emergency_disclaimer_acknowledged: input.emergencyDisclaimerAcknowledged,
      }),
      'submit complaint',
    );
    const row = firstRow(rows, 'complaint');

    return {
      id: row.complaint_id,
      complaintNumber: row.complaint_number,
      status: row.status,
      visibility: 'private',
      categoryId: input.categoryId,
      submittedAt: row.submitted_at,
      routing: input.routing,
    };
  }

  public async listComplaints(
    actorUserId: string,
    query: ComplaintListQuery,
  ): Promise<ComplaintListResult> {
    const cursor = decodeCursor(query.cursor);
    const rows = decode(
      z.array(complaintListRowSchema),
      await this.callRpc('list owned complaints', 'list_owned_complaints', {
        p_actor_user_id: actorUserId,
        p_limit: query.limit,
        p_before_submitted_at: cursor.submittedAt,
        p_before_id: cursor.id,
      }),
      'list owned complaints',
    );
    const items = rows.map((row) => ({
      id: row.complaint_id,
      complaintNumber: row.complaint_number,
      categoryId: row.category_id,
      categoryName: row.category_name,
      status: row.status,
      visibility: row.visibility,
      submittedAt: row.submitted_at,
      updatedAt: row.updated_at,
    }));
    const last = rows.at(-1);
    const hasMore = rows.length === query.limit;

    return {
      items,
      hasMore,
      nextCursor: hasMore && last ? encodeCursor(last.submitted_at, last.complaint_id) : null,
    };
  }

  public async getComplaint(actorUserId: string, complaintId: string): Promise<ComplaintDetail> {
    const rows = decode(
      z.array(complaintDetailRowSchema).max(1),
      await this.callRpc('get owned complaint', 'get_owned_complaint', {
        p_actor_user_id: actorUserId,
        p_complaint_id: complaintId,
      }),
      'get owned complaint',
    );
    const row = firstRow(rows, 'complaint');
    const [locations, mediaRows, replay] = await Promise.all([
      this.listLocations(actorUserId, row.draft_id),
      this.listMediaRows(actorUserId, row.draft_id),
      this.routingStore.findRecordedRoutingDecision(actorUserId, row.routing_request_id),
    ]);
    if (!replay || replay.id !== row.routing_decision_id) {
      throw new ComplaintDataAccessError('get complaint routing evidence');
    }
    const selectedLocation: ComplaintLocationEvidence = {
      id: row.location_evidence_id,
      latitude: row.latitude,
      longitude: row.longitude,
      accuracyMeters: row.accuracy_meters,
      provider: row.location_provider,
      capturedAt: row.location_captured_at,
      deviceRecordedAt: row.location_device_recorded_at,
      isMockLocation: row.mock_location_detected,
      verificationStatus: row.location_verification_status,
      verificationScore: row.location_verification_score,
    };
    const locationById = new Map(
      locations.map((entry) => [entry.location_evidence_id, toLocation(entry)]),
    );
    locationById.set(selectedLocation.id, selectedLocation);

    return {
      id: row.complaint_id,
      complaintNumber: row.complaint_number,
      status: row.status,
      visibility: row.visibility,
      categoryId: row.category_id,
      submittedAt: row.submitted_at,
      routing: toPublicRoutingResult(replay.decision),
      description: row.description,
      location: selectedLocation,
      media: mediaRows.map((media) => toMedia(media, locationById, row.complaint_id)),
      updatedAt: row.updated_at,
    };
  }

  public async getTimeline(actorUserId: string, complaintId: string): Promise<ComplaintTimeline> {
    const rows = decode(
      z.array(timelineRowSchema),
      await this.callRpc('get complaint timeline', 'get_complaint_timeline', {
        p_actor_user_id: actorUserId,
        p_complaint_id: complaintId,
      }),
      'get complaint timeline',
    );

    if (rows.length === 0) {
      await this.getComplaint(actorUserId, complaintId);
    }

    return {
      complaintId,
      entries: rows.map((row) => ({
        id: row.event_id,
        complaintId,
        eventType: row.reason_code === 'COMPLAINT_SUBMITTED' ? 'submitted' : 'status_changed',
        status: row.to_status,
        title: row.public_message ?? row.reason_code,
        description: null,
        occurredAt: row.occurred_at,
      })),
    };
  }

  private async getRawDraft(
    actorUserId: string,
    draftId: string,
  ): Promise<z.infer<typeof draftRowSchema>> {
    const rows = decode(
      z.array(draftRowSchema).max(1),
      await this.callRpc('get complaint draft', 'get_complaint_draft', {
        p_actor_user_id: actorUserId,
        p_draft_id: draftId,
      }),
      'get complaint draft',
    );
    return firstRow(rows, 'draft');
  }

  private async listLocations(
    actorUserId: string,
    draftId: string,
  ): Promise<z.infer<typeof locationRowSchema>[]> {
    return decode(
      z.array(locationRowSchema),
      await this.callRpc('list complaint location evidence', 'list_complaint_location_evidence', {
        p_actor_user_id: actorUserId,
        p_draft_id: draftId,
      }),
      'list complaint location evidence',
    );
  }

  private async listMediaRows(
    actorUserId: string,
    draftId: string,
  ): Promise<z.infer<typeof mediaRowSchema>[]> {
    return decode(
      z.array(mediaRowSchema),
      await this.callRpc('list complaint media', 'list_complaint_media', {
        p_actor_user_id: actorUserId,
        p_draft_id: draftId,
      }),
      'list complaint media',
    );
  }

  private async getMediaIntent(
    actorUserId: string,
    mediaId: string,
  ): Promise<z.infer<typeof mediaIntentRowSchema>> {
    const rows = decode(
      z.array(mediaIntentRowSchema).max(1),
      await this.callRpc('get complaint media intent', 'get_complaint_media_intent', {
        p_actor_user_id: actorUserId,
        p_media_id: mediaId,
      }),
      'get complaint media intent',
    );
    return firstRow(rows, 'media');
  }

  private async appendLocationEvidence(
    actorUserId: string,
    draftId: string,
    input: ComplaintLocationCapture,
    evidenceType: 'current_location' | 'media_capture',
  ): Promise<string> {
    return decode(
      uuidSchema,
      await this.callRpc(
        'append complaint location evidence',
        'append_complaint_location_evidence',
        {
          p_actor_user_id: actorUserId,
          p_draft_id: draftId,
          p_device_id: null,
          p_evidence_type: evidenceType,
          p_longitude: input.longitude,
          p_latitude: input.latitude,
          p_accuracy_meters: input.accuracyMeters,
          p_provider: input.provider,
          p_captured_at: input.capturedAt,
          p_device_recorded_at: input.deviceRecordedAt,
          p_mock_location_detected: input.isMockLocation,
          p_verification_metadata: {},
        },
      ),
      'append complaint location evidence',
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

      if (marker === 'COMPLAINT_DRAFT_NOT_FOUND') {
        throw new ComplaintNotFoundError('draft');
      }
      if (marker === 'COMPLAINT_MEDIA_NOT_FOUND') {
        throw new ComplaintNotFoundError('media');
      }
      if (marker === 'COMPLAINT_SUBMISSION_NOT_FOUND') {
        throw new ComplaintNotFoundError('complaint');
      }
      if (marker && conflictMarkers.has(marker)) {
        throw new ComplaintConflictError(marker);
      }
      if (error) {
        throw new ComplaintDataAccessError(operation);
      }
      return data;
    } catch (error) {
      if (error instanceof ComplaintDataAccessError) {
        throw error;
      }
      throw new ComplaintDataAccessError(operation);
    }
  }
}
