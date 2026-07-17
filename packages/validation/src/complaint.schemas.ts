import {
  complaintLocationVerificationStatuses,
  complaintIdempotencyKeyPattern,
  complaintLocationProviders,
  complaintMediaCaptureSources,
  complaintMediaKinds,
  complaintMediaMimeTypes,
  complaintMediaModerationStatuses,
  complaintMediaProcessingStatuses,
  complaintMediaUploadStatuses,
  complaintStatuses,
  complaintTimelineEventTypes,
  complaintVisibilityValues,
  routingConfidenceBands,
  routingDecisionStatuses,
  type ComplaintDetail,
  type ComplaintListResult,
  type ComplaintListQuery,
  type ComplaintCustomAttributes,
  type ComplaintLocationCapture,
  type ComplaintTimeline,
  type CreateComplaintDraftInput,
  type CreateComplaintMediaUploadIntentInput,
  type FinalizeComplaintMediaInput,
  type SubmitComplaintInput,
  type UpdateComplaintDraftInput,
} from '@local-wellness/types';
import { z } from 'zod';

const maximumMediaBytes = 50 * 1_024 * 1_024;
const offsetTimestampSchema = z.iso.datetime({ offset: true });
const sha256Schema = z
  .string()
  .regex(/^[0-9a-f]{64}$/u, 'The checksum must be a lowercase SHA-256 digest.');

export const complaintCustomAttributesSchema: z.ZodType<ComplaintCustomAttributes> = z
  .record(
    z.string().regex(/^[a-z][a-z0-9_]{0,63}$/u),
    z.union([
      z.string().trim().min(1).max(500),
      z.number().finite().min(-1_000_000_000).max(1_000_000_000),
      z.boolean(),
    ]),
  )
  .superRefine((attributes, context) => {
    if (Object.keys(attributes).length > 20) {
      context.addIssue({ code: 'custom', message: 'At most 20 complaint attributes are allowed.' });
    }
  });

export const complaintLocationCaptureSchema: z.ZodType<ComplaintLocationCapture> = z
  .object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    accuracyMeters: z.number().finite().nonnegative().max(5_000),
    capturedAt: offsetTimestampSchema,
    deviceRecordedAt: offsetTimestampSchema,
    provider: z.enum(complaintLocationProviders),
    isMockLocation: z.boolean().nullable(),
  })
  .strict();

const complaintDraftShape = {
  categoryId: z.uuid().optional(),
  assetId: z.uuid().nullable().optional(),
  description: z.string().trim().min(1).max(4_000).nullable().optional(),
  location: complaintLocationCaptureSchema.nullable().optional(),
  customAttributes: complaintCustomAttributesSchema.optional(),
} as const;

export const createComplaintDraftSchema: z.ZodType<CreateComplaintDraftInput> = z
  .object(complaintDraftShape)
  .strict();

export const updateComplaintDraftSchema: z.ZodType<UpdateComplaintDraftInput> = z
  .object(complaintDraftShape)
  .strict()
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: 'At least one draft field must be provided.',
  });

const photoMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const videoMimeTypes = new Set(['video/mp4', 'video/quicktime']);
const voiceMimeTypes = new Set(['audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/webm']);

const mediaMimeMatchesKind = (kind: string, mimeType: string): boolean => {
  if (kind === 'photo') {
    return photoMimeTypes.has(mimeType);
  }

  if (kind === 'video') {
    return videoMimeTypes.has(mimeType);
  }

  return kind === 'voice' && voiceMimeTypes.has(mimeType);
};

export const createComplaintMediaUploadIntentSchema: z.ZodType<CreateComplaintMediaUploadIntentInput> =
  z
    .object({
      draftId: z.uuid(),
      kind: z.enum(complaintMediaKinds),
      captureSource: z.enum(complaintMediaCaptureSources),
      mimeType: z.enum(complaintMediaMimeTypes),
      byteSize: z.number().int().positive().max(maximumMediaBytes),
      sha256: sha256Schema,
      capturedAt: offsetTimestampSchema.optional(),
      widthPixels: z.number().int().positive().max(32_768).optional(),
      heightPixels: z.number().int().positive().max(32_768).optional(),
      durationMilliseconds: z.number().int().positive().max(86_400_000).optional(),
      captureLocation: complaintLocationCaptureSchema.optional(),
    })
    .strict()
    .superRefine((input, context) => {
      if (!mediaMimeMatchesKind(input.kind, input.mimeType)) {
        context.addIssue({
          code: 'custom',
          message: 'The media type does not match the selected media kind.',
          path: ['mimeType'],
        });
      }

      const expectedCaptureSource = {
        photo: 'live_camera',
        video: 'live_video',
        voice: 'live_microphone',
      }[input.kind];
      if (input.captureSource !== expectedCaptureSource) {
        context.addIssue({
          code: 'custom',
          message: 'The capture source does not match the selected media kind.',
          path: ['captureSource'],
        });
      }

      const hasWidth = input.widthPixels !== undefined;
      const hasHeight = input.heightPixels !== undefined;
      if (hasWidth !== hasHeight) {
        context.addIssue({
          code: 'custom',
          message: 'Media dimensions must include both width and height.',
          path: ['widthPixels'],
        });
      }

      if (input.kind === 'photo' && input.durationMilliseconds !== undefined) {
        context.addIssue({
          code: 'custom',
          message: 'Photo metadata cannot include a duration.',
          path: ['durationMilliseconds'],
        });
      }

      if (input.kind !== 'photo' && input.durationMilliseconds === undefined) {
        context.addIssue({
          code: 'custom',
          message: 'Video and voice metadata must include a duration.',
          path: ['durationMilliseconds'],
        });
      }

      if (input.kind === 'voice' && (hasWidth || hasHeight)) {
        context.addIssue({
          code: 'custom',
          message: 'Voice metadata cannot include image dimensions.',
          path: ['widthPixels'],
        });
      }

      if (input.capturedAt === undefined) {
        context.addIssue({
          code: 'custom',
          message: 'Live captures must include their capture timestamp.',
          path: ['capturedAt'],
        });
      }
    });

export const finalizeComplaintMediaSchema: z.ZodType<FinalizeComplaintMediaInput> = z
  .object({
    byteSize: z.number().int().positive().max(maximumMediaBytes),
    sha256: sha256Schema,
  })
  .strict();

const uniqueUuidArray = z
  .array(z.uuid())
  .max(20)
  .refine((identifiers) => new Set(identifiers).size === identifiers.length, {
    message: 'Duplicate suggestion identifiers must be unique.',
  });

export const submitComplaintSchema: z.ZodType<SubmitComplaintInput> = z
  .object({
    acknowledgedDuplicateSuggestionIds: uniqueUuidArray.optional(),
    emergencyDisclaimerAcknowledged: z.literal(true).optional(),
  })
  .strict();

export const complaintDraftIdParametersSchema = z
  .object({
    draftId: z.uuid(),
  })
  .strict();

export const complaintMediaIdParametersSchema = z
  .object({
    mediaId: z.uuid(),
  })
  .strict();

export const complaintIdParametersSchema = z
  .object({
    complaintId: z.uuid(),
  })
  .strict();

export const complaintListQuerySchema: z.ZodType<ComplaintListQuery> = z
  .object({
    cursor: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,512}$/u)
      .optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();

const complaintResponseTimestampSchema = z.iso.datetime({ offset: true });
const nullableUuidSchema = z.uuid().nullable();

const complaintLocationEvidenceResponseSchema = z
  .object({
    accuracyMeters: z.number().finite().nonnegative().max(5_000),
    capturedAt: complaintResponseTimestampSchema,
    deviceRecordedAt: complaintResponseTimestampSchema,
    id: z.uuid(),
    isMockLocation: z.boolean().nullable(),
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    provider: z.enum(complaintLocationProviders),
    verificationScore: z.number().finite().min(0).max(1).nullable(),
    verificationStatus: z.enum(complaintLocationVerificationStatuses),
  })
  .strict();

const complaintMediaMetadataResponseSchema = z
  .object({
    byteSize: z.number().int().positive().max(maximumMediaBytes),
    captureLocation: complaintLocationEvidenceResponseSchema.nullable(),
    captureSource: z.enum(complaintMediaCaptureSources),
    capturedAt: complaintResponseTimestampSchema.nullable(),
    durationMilliseconds: z.number().int().positive().max(86_400_000).nullable(),
    heightPixels: z.number().int().positive().max(32_768).nullable(),
    kind: z.enum(complaintMediaKinds),
    mimeType: z.enum(complaintMediaMimeTypes),
    sha256: sha256Schema,
    widthPixels: z.number().int().positive().max(32_768).nullable(),
  })
  .strict();

const complaintMediaResponseSchema = z
  .object({
    complaintId: nullableUuidSchema,
    createdAt: complaintResponseTimestampSchema,
    draftId: nullableUuidSchema,
    id: z.uuid(),
    metadata: complaintMediaMetadataResponseSchema,
    moderationStatus: z.enum(complaintMediaModerationStatuses),
    processingStatus: z.enum(complaintMediaProcessingStatuses),
    updatedAt: complaintResponseTimestampSchema,
    uploadStatus: z.enum(complaintMediaUploadStatuses),
  })
  .strict();

const complaintRoutingTargetResponseSchema = z
  .object({
    assetId: nullableUuidSchema,
    assetMatchDistanceMeters: z.number().finite().nonnegative().nullable(),
    assetOwnershipVersionId: nullableUuidSchema,
    assetTypeId: nullableUuidSchema,
    assetVersionId: nullableUuidSchema,
    authorityDepartmentId: z.uuid(),
    authorityId: z.uuid(),
    departmentId: z.uuid(),
    localBodyId: z.uuid(),
    officerAssignmentId: nullableUuidSchema,
    officerRoleId: z.uuid(),
    wardId: nullableUuidSchema,
  })
  .strict();

const complaintRoutingResponseSchema = z
  .object({
    confidence: z
      .object({
        band: z.enum(routingConfidenceBands),
        score: z.number().finite().min(0).max(1),
      })
      .strict(),
    explanation: z
      .object({
        fallbackDepth: z.number().int().nonnegative(),
        fallbackUsed: z.boolean(),
        jurisdictionStatus: z.enum(['resolved', 'ambiguous', 'unsupported']),
        localBodyBoundaryVersionId: nullableUuidSchema,
        policyId: nullableUuidSchema,
        policyVersion: z.number().int().positive().nullable(),
        policyVersionId: nullableUuidSchema,
        reason: z.string().trim().min(1).max(500),
        selectedRoutingRuleId: nullableUuidSchema,
        selectedRoutingRuleVersionId: nullableUuidSchema,
        wardBoundaryVersionId: nullableUuidSchema,
      })
      .strict(),
    status: z.enum(routingDecisionStatuses),
    target: complaintRoutingTargetResponseSchema.nullable(),
  })
  .strict();

export const complaintListResultSchema: z.ZodType<ComplaintListResult> = z
  .object({
    hasMore: z.boolean(),
    items: z.array(
      z
        .object({
          categoryId: z.uuid(),
          categoryName: z.string().trim().min(1).max(240),
          complaintNumber: z.string().trim().min(1).max(80),
          id: z.uuid(),
          status: z.enum(complaintStatuses),
          submittedAt: complaintResponseTimestampSchema,
          updatedAt: complaintResponseTimestampSchema,
          visibility: z.enum(complaintVisibilityValues),
        })
        .strict(),
    ),
    nextCursor: z.string().min(1).max(512).nullable(),
  })
  .strict();

export const complaintDetailSchema: z.ZodType<ComplaintDetail> = z
  .object({
    categoryId: z.uuid(),
    complaintNumber: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(4_000).nullable(),
    id: z.uuid(),
    location: complaintLocationEvidenceResponseSchema,
    media: z.array(complaintMediaResponseSchema).max(20),
    routing: complaintRoutingResponseSchema,
    status: z.enum(complaintStatuses),
    submittedAt: complaintResponseTimestampSchema,
    updatedAt: complaintResponseTimestampSchema,
    visibility: z.literal('private'),
  })
  .strict();

export const complaintTimelineSchema: z.ZodType<ComplaintTimeline> = z
  .object({
    complaintId: z.uuid(),
    entries: z.array(
      z
        .object({
          complaintId: z.uuid(),
          description: z.string().trim().min(1).max(4_000).nullable(),
          eventType: z.enum(complaintTimelineEventTypes),
          id: z.uuid(),
          occurredAt: complaintResponseTimestampSchema,
          status: z.enum(complaintStatuses),
          title: z.string().trim().min(1).max(1_000),
        })
        .strict(),
    ),
  })
  .strict();

export const decodeComplaintListResult = (value: unknown): ComplaintListResult =>
  complaintListResultSchema.parse(value);

export const decodeComplaintDetail = (value: unknown): ComplaintDetail =>
  complaintDetailSchema.parse(value);

export const decodeComplaintTimeline = (value: unknown): ComplaintTimeline =>
  complaintTimelineSchema.parse(value);

export const idempotencyKeySchema = z
  .string()
  .regex(
    complaintIdempotencyKeyPattern,
    'The idempotency key must contain 16 to 128 safe ASCII characters.',
  );

export type ComplaintDraftIdParameters = z.infer<typeof complaintDraftIdParametersSchema>;
export type ComplaintMediaIdParameters = z.infer<typeof complaintMediaIdParametersSchema>;
export type ComplaintIdParameters = z.infer<typeof complaintIdParametersSchema>;
export type ComplaintListQueryInput = z.infer<typeof complaintListQuerySchema>;
