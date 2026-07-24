import {
  complaintHandoffActionKinds,
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
  complaintTaxonomyRoutingStatuses,
  complaintTaxonomySensitivityClasses,
  routingConfidenceBands,
  routingCategorySubmissionAvailabilities,
  routingDecisionStatuses,
  type ComplaintDetail,
  type ComplaintTaxonomyCatalogItem,
  type ComplaintDraft,
  type ComplaintDuplicateCheckResult,
  type ComplaintListResult,
  type ComplaintMedia,
  type ComplaintMediaUploadIntent,
  type ComplaintReceipt,
  type ComplaintTimeline,
  type RoutingAssetDiscoveryResult,
  type RoutingCategory,
  type RoutingCategoryCatalogItem,
} from '@local-wellness/types';
import { z } from 'zod';
import { complaintCustomAttributesSchema } from '@local-wellness/validation';

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
    customAttributes: complaintCustomAttributesSchema,
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

const receiptRoutingSchema = z
  .object({
    categoryId: z.uuid().optional(),
    confidence: publicRoutingConfidenceSchema,
    explanation: publicRoutingExplanationSchema,
    status: z.enum(routingDecisionStatuses),
    target: routingTargetSchema.nullable(),
  })
  .strict();

const receiptObjectSchema = z
  .object({
    categoryId: z.uuid(),
    complaintNumber: z.string().min(1),
    id: z.uuid(),
    routing: receiptRoutingSchema,
    status: z.enum(complaintStatuses),
    submittedAt: timestamp,
    visibility: z.literal('private'),
  })
  .strict();

const validateReceiptRoutingCategory = (
  receipt: z.infer<typeof receiptObjectSchema>,
  context: z.RefinementCtx,
): void => {
  if (
    receipt.routing.categoryId !== undefined &&
    receipt.routing.categoryId !== receipt.categoryId
  ) {
    context.addIssue({
      code: 'custom',
      message: 'The receipt routing category does not match the submitted complaint category.',
      path: ['routing', 'categoryId'],
    });
  }
};

const normalizeReceiptRouting = <Receipt extends z.infer<typeof receiptObjectSchema>>({
  routing,
  ...receipt
}: Receipt) => ({
  ...receipt,
  routing: {
    confidence: routing.confidence,
    explanation: routing.explanation,
    status: routing.status,
    target: routing.target,
  },
});

const receiptSchema = receiptObjectSchema
  .superRefine(validateReceiptRoutingCategory)
  .transform(normalizeReceiptRouting);

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
    code: z.string().regex(/^[a-z][a-z0-9_]{1,79}$/u),
    description: z.string().trim().min(1).max(1_000).nullable(),
    id: z.uuid(),
    isEmergency: z.boolean(),
    maximumMediaCount: z.number().int().min(0).max(20),
    minimumMediaCount: z.number().int().min(0).max(20),
    name: z.string().trim().min(1).max(160),
    parentCategoryId: nullableUuid,
    requiresAsset: z.boolean(),
    requiresLocation: z.boolean(),
    requiredAttributes: z.array(z.string().regex(/^[a-z][a-z0-9_]{0,63}$/u)).max(20),
    recommendedMediaKinds: z.array(z.enum(complaintMediaKinds)).max(3),
  })
  .strict()
  .refine((category) => category.maximumMediaCount >= category.minimumMediaCount, {
    message: 'Category media limits are inconsistent.',
  });

const categoryCatalogItemSchema = categorySchema.extend({
  submissionAvailability: z.enum(routingCategorySubmissionAvailabilities),
});

const isSecureHttpsUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname.length > 0 &&
      url.username.length === 0 &&
      url.password.length === 0
    );
  } catch {
    return false;
  }
};

const complaintHandoffActionSchema = z
  .object({
    description: z.string().trim().min(1).max(500),
    key: z.string().regex(/^[a-z][a-z0-9_]{1,79}$/u),
    kind: z.enum(complaintHandoffActionKinds),
    label: z.string().trim().min(1).max(120),
    priority: z.number().int().min(0).max(32_767),
    target: z.string().trim().min(1).max(2_048),
  })
  .strict()
  .superRefine((action, context) => {
    const targetIsValid =
      action.kind === 'call'
        ? /^[0-9]{3,15}$/u.test(action.target)
        : isSecureHttpsUrl(action.target);
    if (!targetIsValid) {
      context.addIssue({
        code: 'custom',
        message: 'Complaint handoff target is invalid.',
        path: ['target'],
      });
    }
  });

const complaintTaxonomyCatalogSchema = z
  .array(
    z
      .object({
        handoffActions: z.array(complaintHandoffActionSchema).max(20),
        id: z.uuid(),
        isEmergency: z.boolean(),
        maximumMediaCount: z.number().int().min(0).max(20),
        minimumMediaCount: z.number().int().min(0).max(20),
        primaryCategoryId: z.uuid(),
        primaryCode: z.string().regex(/^[A-Z]{3}$/u),
        primaryName: z.string().trim().min(1).max(160),
        recommendedMediaKinds: z.array(z.enum(complaintMediaKinds)).max(3),
        requiredAttributes: z.array(z.string().regex(/^[a-z][a-z0-9_]{0,63}$/u)).max(20),
        requiresAsset: z.boolean(),
        requiresLocation: z.boolean(),
        routingProfileCategoryId: nullableUuid,
        routingProfileCode: z
          .string()
          .regex(/^[a-z][a-z0-9_]{1,79}$/u)
          .nullable(),
        routingProfileName: z.string().trim().min(1).max(160).nullable(),
        routingStatus: z.enum(complaintTaxonomyRoutingStatuses),
        sensitivityClass: z.enum(complaintTaxonomySensitivityClasses),
        subcategoryCode: z.string().regex(/^[A-Z]{3}-[0-9]{3}$/u),
        subcategoryDescription: z.string().trim().min(1).max(1_000).nullable(),
        subcategoryName: z.string().trim().min(1).max(240),
        submissionAvailability: z.enum(routingCategorySubmissionAvailabilities),
        workflowType: z.string().regex(/^[A-Z][A-Z0-9_]{1,79}$/u),
      })
      .strict()
      .superRefine((item, context) => {
        const profileFields = [
          item.routingProfileCategoryId,
          item.routingProfileCode,
          item.routingProfileName,
        ];
        const hasCompleteProfile = profileFields.every((value) => value !== null);
        const hasNoProfile = profileFields.every((value) => value === null);
        const hasProtectedSensitivity =
          item.sensitivityClass === 'PRIVATE' || item.sensitivityClass === 'EMERGENCY_PRIVATE';
        const hasUniqueHandoffActions =
          new Set(item.handoffActions.map((action) => action.key)).size ===
          item.handoffActions.length;
        const hasProtectedHandoff =
          item.routingStatus === 'protected_handoff' &&
          hasProtectedSensitivity &&
          hasNoProfile &&
          item.submissionAvailability === 'unavailable' &&
          item.handoffActions.length > 0;
        const hasNoHandoff =
          item.routingStatus !== 'protected_handoff' && item.handoffActions.length === 0;
        if (
          !item.subcategoryCode.startsWith(`${item.primaryCode}-`) ||
          item.maximumMediaCount < item.minimumMediaCount ||
          new Set(item.requiredAttributes).size !== item.requiredAttributes.length ||
          !hasUniqueHandoffActions ||
          (!hasCompleteProfile && !hasNoProfile) ||
          (item.routingStatus === 'mapped' && (!hasCompleteProfile || hasProtectedSensitivity)) ||
          (item.routingStatus !== 'mapped' && !hasNoProfile) ||
          (item.submissionAvailability === 'available' && item.routingStatus !== 'mapped') ||
          (!hasProtectedHandoff && !hasNoHandoff)
        ) {
          context.addIssue({
            code: 'custom',
            message: 'Taxonomy routing metadata is inconsistent.',
          });
        }
      }),
  )
  .max(400)
  .superRefine((items, context) => {
    const primaryCategories = new Map<string, Readonly<{ id: string; name: string }>>();
    const hasConflictingPrimary = items.some((item) => {
      const existing = primaryCategories.get(item.primaryCode);
      if (
        existing &&
        (existing.id !== item.primaryCategoryId || existing.name !== item.primaryName)
      ) {
        return true;
      }
      primaryCategories.set(item.primaryCode, {
        id: item.primaryCategoryId,
        name: item.primaryName,
      });
      return false;
    });
    if (
      new Set(items.map((item) => item.id)).size !== items.length ||
      new Set(items.map((item) => item.subcategoryCode)).size !== items.length ||
      hasConflictingPrimary
    ) {
      context.addIssue({ code: 'custom', message: 'Taxonomy identifiers must be unique.' });
    }
  });

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

const detailSchema = receiptObjectSchema
  .extend({
    description: z.string().nullable(),
    location: locationEvidenceSchema,
    media: z.array(mediaSchema),
    updatedAt: timestamp,
  })
  .superRefine(validateReceiptRoutingCategory)
  .transform(normalizeReceiptRouting);

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
export const decodeRoutingCategoryCatalog = (value: unknown): RoutingCategoryCatalogItem[] =>
  z.array(categoryCatalogItemSchema).max(500).parse(value) as RoutingCategoryCatalogItem[];
export const decodeComplaintTaxonomyCatalog = (value: unknown): ComplaintTaxonomyCatalogItem[] =>
  complaintTaxonomyCatalogSchema.parse(value) as ComplaintTaxonomyCatalogItem[];
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
