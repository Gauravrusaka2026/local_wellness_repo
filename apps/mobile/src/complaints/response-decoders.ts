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
  complaintTimelineEventTypes,
  complaintVisibilityValues,
  routingConfidenceBands,
  routingDecisionStatuses,
  type ComplaintDetail,
  type ComplaintDraft,
  type ComplaintDuplicateCheckResult,
  type ComplaintListResult,
  type ComplaintMedia,
  type ComplaintMediaUploadIntent,
  type ComplaintReceipt,
  type ComplaintTimeline,
  type RoutingAssetDiscoveryResult,
  type RoutingCategory,
} from '@local-wellness/types';
import { z } from 'zod';

const timestamp = z.string().datetime({ offset: true });
const nullableUuid = z.uuid().nullable();

const locationCaptureSchema = z
  .object({
    accuracyMeters: z.number().finite().nonnegative().max(5_000),
    capturedAt: timestamp,
    deviceRecordedAt: timestamp,
    isMockLocation: z.boolean().nullable(),
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    provider: z.enum(complaintLocationProviders),
  })
  .strict();

const locationEvidenceSchema = locationCaptureSchema.extend({
  id: z.uuid(),
  verificationScore: z.number().finite().min(0).max(1).nullable(),
  verificationStatus: z.enum(complaintLocationVerificationStatuses),
});

const mediaMetadataSchema = z
  .object({
    byteSize: z.number().int().positive(),
    captureLocation: locationEvidenceSchema.nullable(),
    captureSource: z.enum(complaintMediaCaptureSources),
    capturedAt: timestamp.nullable(),
    durationMilliseconds: z.number().int().positive().nullable(),
    heightPixels: z.number().int().positive().nullable(),
    kind: z.enum(complaintMediaKinds),
    mimeType: z.enum(complaintMediaMimeTypes),
    sha256: z.string().regex(/^[0-9a-f]{64}$/u),
    widthPixels: z.number().int().positive().nullable(),
  })
  .strict();

const mediaSchema = z
  .object({
    complaintId: nullableUuid,
    createdAt: timestamp,
    draftId: nullableUuid,
    id: z.uuid(),
    metadata: mediaMetadataSchema,
    moderationStatus: z.enum(complaintMediaModerationStatuses),
    processingStatus: z.enum(complaintMediaProcessingStatuses),
    updatedAt: timestamp,
    uploadStatus: z.enum(complaintMediaUploadStatuses),
  })
  .strict();

const draftSchema = z
  .object({
    assetId: nullableUuid,
    categoryId: nullableUuid,
    createdAt: timestamp,
    description: z.string().nullable(),
    expiresAt: timestamp,
    id: z.uuid(),
    location: locationEvidenceSchema.nullable(),
    media: z.array(mediaSchema),
    status: z.enum(complaintDraftStatuses),
    updatedAt: timestamp,
    visibility: z.literal('private'),
  })
  .strict();

const routingTargetSchema = z
  .object({
    assetId: nullableUuid,
    assetMatchDistanceMeters: z.number().finite().nonnegative().nullable(),
    assetOwnershipVersionId: nullableUuid,
    assetTypeId: nullableUuid,
    assetVersionId: nullableUuid,
    authorityDepartmentId: z.uuid(),
    authorityId: z.uuid(),
    departmentId: z.uuid(),
    localBodyId: z.uuid(),
    officerAssignmentId: nullableUuid,
    officerRoleId: z.uuid(),
    wardId: nullableUuid,
  })
  .strict();

const publicRoutingConfidenceSchema = z
  .object({
    band: z.enum(routingConfidenceBands),
    score: z.number().finite().min(0).max(1),
  })
  .strict();

const publicRoutingExplanationSchema = z
  .object({
    fallbackDepth: z.number().int().nonnegative(),
    fallbackUsed: z.boolean(),
    jurisdictionStatus: z.enum(['resolved', 'ambiguous', 'unsupported']),
    localBodyBoundaryVersionId: nullableUuid,
    policyId: nullableUuid,
    policyVersion: z.number().int().positive().nullable(),
    policyVersionId: nullableUuid,
    reason: z.string().min(1),
    selectedRoutingRuleId: nullableUuid,
    selectedRoutingRuleVersionId: nullableUuid,
    wardBoundaryVersionId: nullableUuid,
  })
  .strict();

const receiptSchema = z
  .object({
    categoryId: z.uuid(),
    complaintNumber: z.string().min(1),
    id: z.uuid(),
    routing: z
      .object({
        confidence: publicRoutingConfidenceSchema,
        explanation: publicRoutingExplanationSchema,
        status: z.enum(routingDecisionStatuses),
        target: routingTargetSchema.nullable(),
      })
      .strict(),
    status: z.enum(complaintStatuses),
    submittedAt: timestamp,
    visibility: z.literal('private'),
  })
  .strict();

const duplicateCheckSchema = z
  .object({
    checkedAt: timestamp,
    draftId: z.uuid(),
    id: z.uuid(),
    policyId: z.uuid(),
    policyVersion: z.number().int().positive(),
    policyVersionId: z.uuid(),
    suggestions: z.array(
      z
        .object({
          approximateDistanceMeters: z.number().finite().nonnegative(),
          categoryId: z.uuid(),
          categoryName: z.string().min(1),
          complaintId: z.uuid(),
          complaintNumber: z.string().min(1),
          score: z.number().finite().min(0).max(1),
          status: z.enum(complaintStatuses),
          submittedAt: timestamp,
        })
        .strict(),
    ),
  })
  .strict();

const categorySchema = z
  .object({
    code: z.string().min(1),
    description: z.string().nullable(),
    id: z.uuid(),
    isEmergency: z.boolean(),
    name: z.string().min(1),
    parentCategoryId: nullableUuid,
    requiresAsset: z.boolean(),
    requiresLocation: z.boolean(),
  })
  .strict();

const routingAssetDiscoverySchema = z
  .object({
    assets: z
      .array(
        z
          .object({
            assetTypeName: z.string().trim().min(1).max(160),
            displayName: z.string().trim().min(1).max(240),
            distanceMeters: z.number().finite().nonnegative().max(5_000),
            id: z.uuid(),
          })
          .strict(),
      )
      .max(25),
    categoryId: z.uuid(),
  })
  .strict()
  .superRefine((result, context) => {
    if (new Set(result.assets.map((asset) => asset.id)).size !== result.assets.length) {
      context.addIssue({ code: 'custom', message: 'Asset identifiers must be unique.' });
    }
  });

const listResultSchema = z
  .object({
    hasMore: z.boolean(),
    items: z.array(
      z
        .object({
          categoryId: z.uuid(),
          categoryName: z.string().min(1),
          complaintNumber: z.string().min(1),
          id: z.uuid(),
          status: z.enum(complaintStatuses),
          submittedAt: timestamp,
          updatedAt: timestamp,
          visibility: z.enum(complaintVisibilityValues),
        })
        .strict(),
    ),
    nextCursor: z.string().nullable(),
  })
  .strict();

const detailSchema = receiptSchema.extend({
  description: z.string().nullable(),
  location: locationEvidenceSchema,
  media: z.array(mediaSchema),
  updatedAt: timestamp,
});

const timelineSchema = z
  .object({
    complaintId: z.uuid(),
    entries: z.array(
      z
        .object({
          complaintId: z.uuid(),
          description: z.string().nullable(),
          eventType: z.enum(complaintTimelineEventTypes),
          id: z.uuid(),
          occurredAt: timestamp,
          status: z.enum(complaintStatuses),
          title: z.string().min(1),
        })
        .strict(),
    ),
  })
  .strict();

export const decodeRoutingCategories = (value: unknown): RoutingCategory[] =>
  z.array(categorySchema).parse(value) as RoutingCategory[];
export const decodeRoutingAssetDiscovery = (value: unknown): RoutingAssetDiscoveryResult =>
  routingAssetDiscoverySchema.parse(value) as RoutingAssetDiscoveryResult;
export const decodeComplaintDraft = (value: unknown): ComplaintDraft =>
  draftSchema.parse(value) as ComplaintDraft;
export const decodeComplaintMedia = (value: unknown): ComplaintMedia =>
  mediaSchema.parse(value) as ComplaintMedia;
export const decodeComplaintMediaUploadIntent = (value: unknown): ComplaintMediaUploadIntent =>
  z
    .object({
      expiresAt: timestamp,
      media: mediaSchema,
      upload: z
        .object({
          bucket: z.string().min(1),
          objectPath: z.string().min(1),
          token: z.string().min(1),
        })
        .strict(),
    })
    .strict()
    .parse(value) as ComplaintMediaUploadIntent;
export const decodeComplaintDuplicateCheck = (value: unknown): ComplaintDuplicateCheckResult =>
  duplicateCheckSchema.parse(value) as ComplaintDuplicateCheckResult;
export const decodeComplaintReceipt = (value: unknown): ComplaintReceipt =>
  receiptSchema.parse(value) as ComplaintReceipt;
export const decodeComplaintList = (value: unknown): ComplaintListResult =>
  listResultSchema.parse(value) as ComplaintListResult;
export const decodeComplaintDetail = (value: unknown): ComplaintDetail =>
  detailSchema.parse(value) as ComplaintDetail;
export const decodeComplaintTimeline = (value: unknown): ComplaintTimeline =>
  timelineSchema.parse(value) as ComplaintTimeline;

export {
  decodeComplaintEvidenceAccess,
  decodeComplaintReopenEvidenceFinalization,
  decodeComplaintReopenEvidenceUploadIntent,
  decodeComplaintResolutionContext,
  decodeComplaintResolutionFeedbackResult,
  decodeReopenComplaintResult,
} from '@local-wellness/validation';
