import {
  complaintLocationProviders,
  complaintLocationVerificationStatuses,
  complaintMediaKinds,
  complaintMediaMimeTypes,
  complaintMediaModerationStatuses,
  complaintMediaProcessingStatuses,
  complaintStatuses,
  governmentComplaintAllowedActions,
  governmentComplaintAssignmentReasons,
  governmentComplaintQueues,
  governmentComplaintTransferReasons,
  governmentExternalDependencyTypes,
  governmentInspectionOutcomes,
  governmentResolutionEvidenceKinds,
  governmentResolutionEvidenceUploadStatuses,
  routingDecisionStatuses,
  type AcknowledgeGovernmentComplaintInput,
  type AddGovernmentComplaintExternalDependencyInput,
  type AddGovernmentComplaintInternalNoteInput,
  type AddGovernmentComplaintWorkReferenceInput,
  type AssignGovernmentComplaintInput,
  type CompleteGovernmentComplaintInspectionInput,
  type CreateGovernmentResolutionEvidenceUploadIntentInput,
  type FinalizeGovernmentResolutionEvidenceInput,
  type GovernmentComplaintActionResult,
  type GovernmentComplaintAssignmentOptions,
  type GovernmentComplaintDetail,
  type GovernmentComplaintQueueQuery,
  type GovernmentComplaintQueueResult,
  type GovernmentResolutionEvidenceAccess,
  type GovernmentResolutionEvidenceFinalization,
  type GovernmentResolutionEvidenceUploadIntent,
  type ResolveGovernmentComplaintExternalDependencyInput,
  type ScheduleGovernmentComplaintInspectionInput,
  type SubmitGovernmentComplaintResolutionInput,
  type TransferGovernmentComplaintInput,
  type UpdateGovernmentComplaintStatusInput,
} from '@local-wellness/types';
import { z } from 'zod';

import { complaintLocationCaptureSchema } from './complaint.schemas.js';

const offsetTimestampSchema = z.iso.datetime({ offset: true });
const nullableUuidSchema = z.uuid().nullable();
const nonEmptyTrimmedString = (maximumLength: number) =>
  z.string().trim().min(1).max(maximumLength);
const expectedWorkflowVersionSchema = z.number().int().positive();
const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/u);

const uniqueUuidArray = (maximumLength: number) =>
  z
    .array(z.uuid())
    .min(1)
    .max(maximumLength)
    .refine((values) => new Set(values).size === values.length, {
      message: 'Identifiers must be unique.',
    });

const queryArray = <Value>(schema: z.ZodType<Value>) =>
  z.preprocess((value) => (typeof value === 'string' ? [value] : value), z.array(schema).max(25));

export const governmentComplaintIdParametersSchema = z.object({ complaintId: z.uuid() }).strict();

export const governmentInspectionIdParametersSchema = z
  .object({ complaintId: z.uuid(), inspectionId: z.uuid() })
  .strict();

export const governmentResolutionEvidenceIdParametersSchema = z
  .object({ complaintId: z.uuid(), evidenceId: z.uuid() })
  .strict();

export const governmentExternalDependencyIdParametersSchema = z
  .object({ complaintId: z.uuid(), dependencyId: z.uuid() })
  .strict();

export const governmentComplaintQueueQuerySchema: z.ZodType<GovernmentComplaintQueueQuery> = z
  .object({
    cursor: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,1024}$/u)
      .optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    scopeRoleAssignmentId: z.uuid().optional(),
    queue: z.enum(governmentComplaintQueues).optional(),
    statuses: queryArray(z.enum(complaintStatuses)).optional(),
    categoryId: z.uuid().optional(),
    wardId: z.uuid().optional(),
    authorityDepartmentId: z.uuid().optional(),
    officerAssignmentId: z.uuid().optional(),
    submittedFrom: offsetTimestampSchema.optional(),
    submittedTo: offsetTimestampSchema.optional(),
    search: nonEmptyTrimmedString(120).optional(),
  })
  .strict()
  .superRefine((query, context) => {
    if (
      query.submittedFrom &&
      query.submittedTo &&
      Date.parse(query.submittedTo) <= Date.parse(query.submittedFrom)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'The submitted-to timestamp must be later than submitted-from.',
        path: ['submittedTo'],
      });
    }
  });

export const governmentComplaintScopeQuerySchema = z
  .object({ scopeRoleAssignmentId: z.uuid().optional() })
  .strict();

const mutationBase = { expectedWorkflowVersion: expectedWorkflowVersionSchema } as const;

export const acknowledgeGovernmentComplaintSchema: z.ZodType<AcknowledgeGovernmentComplaintInput> =
  z
    .object({
      ...mutationBase,
      publicMessage: nonEmptyTrimmedString(1_000).optional(),
    })
    .strict();

export const assignGovernmentComplaintSchema: z.ZodType<AssignGovernmentComplaintInput> = z
  .object({
    ...mutationBase,
    officerAssignmentId: z.uuid(),
    reason: z.enum(governmentComplaintAssignmentReasons),
    note: nonEmptyTrimmedString(1_000).optional(),
  })
  .strict();

export const transferGovernmentComplaintSchema: z.ZodType<TransferGovernmentComplaintInput> = z
  .object({
    ...mutationBase,
    officerAssignmentId: z.uuid(),
    reason: z.enum(governmentComplaintTransferReasons),
    note: nonEmptyTrimmedString(1_000).optional(),
  })
  .strict();

export const updateGovernmentComplaintStatusSchema: z.ZodType<UpdateGovernmentComplaintStatusInput> =
  z
    .object({
      ...mutationBase,
      status: z.enum(complaintStatuses),
      publicMessage: nonEmptyTrimmedString(1_000).optional(),
    })
    .strict();

export const addGovernmentComplaintInternalNoteSchema: z.ZodType<AddGovernmentComplaintInternalNoteInput> =
  z
    .object({
      ...mutationBase,
      body: nonEmptyTrimmedString(4_000),
    })
    .strict();

export const scheduleGovernmentComplaintInspectionSchema: z.ZodType<ScheduleGovernmentComplaintInspectionInput> =
  z
    .object({
      ...mutationBase,
      scheduledFor: offsetTimestampSchema,
      instructions: nonEmptyTrimmedString(2_000).optional(),
    })
    .strict();

export const completeGovernmentComplaintInspectionSchema: z.ZodType<CompleteGovernmentComplaintInspectionInput> =
  z
    .object({
      ...mutationBase,
      outcome: z.enum(governmentInspectionOutcomes),
      summary: nonEmptyTrimmedString(4_000),
    })
    .strict();

export const addGovernmentComplaintWorkReferenceSchema: z.ZodType<AddGovernmentComplaintWorkReferenceInput> =
  z
    .object({
      ...mutationBase,
      referenceType: nonEmptyTrimmedString(80),
      referenceNumber: nonEmptyTrimmedString(160),
      description: nonEmptyTrimmedString(2_000).optional(),
    })
    .strict();

export const addGovernmentComplaintExternalDependencySchema: z.ZodType<AddGovernmentComplaintExternalDependencyInput> =
  z
    .object({
      ...mutationBase,
      dependencyType: z.enum(governmentExternalDependencyTypes),
      description: nonEmptyTrimmedString(4_000),
      expectedBy: offsetTimestampSchema.optional(),
    })
    .strict();

export const resolveGovernmentComplaintExternalDependencySchema: z.ZodType<ResolveGovernmentComplaintExternalDependencyInput> =
  z
    .object({
      ...mutationBase,
      resolutionSummary: nonEmptyTrimmedString(2_000).optional(),
    })
    .strict();

const resolutionEvidenceMimeTypes = [
  'image/heic',
  'image/heif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const;

export const createGovernmentResolutionEvidenceUploadIntentSchema: z.ZodType<CreateGovernmentResolutionEvidenceUploadIntentInput> =
  z
    .object({
      ...mutationBase,
      kind: z.enum(governmentResolutionEvidenceKinds),
      mimeType: z.enum(resolutionEvidenceMimeTypes),
      byteSize: z
        .number()
        .int()
        .positive()
        .max(50 * 1_024 * 1_024),
      sha256: sha256Schema,
      capturedAt: offsetTimestampSchema.optional(),
    })
    .strict()
    .superRefine((input, context) => {
      if (
        (input.kind === 'photo' && !input.mimeType.startsWith('image/')) ||
        (input.kind === 'video' && !input.mimeType.startsWith('video/'))
      ) {
        context.addIssue({
          code: 'custom',
          message: 'The evidence MIME type must match its kind.',
          path: ['mimeType'],
        });
      }
    });

export const finalizeGovernmentResolutionEvidenceSchema: z.ZodType<FinalizeGovernmentResolutionEvidenceInput> =
  z
    .object({
      ...mutationBase,
      byteSize: z
        .number()
        .int()
        .positive()
        .max(50 * 1_024 * 1_024),
      sha256: sha256Schema,
    })
    .strict();

export const submitGovernmentComplaintResolutionSchema: z.ZodType<SubmitGovernmentComplaintResolutionInput> =
  z
    .object({
      ...mutationBase,
      completionNote: nonEmptyTrimmedString(4_000),
      completionLocation: complaintLocationCaptureSchema,
      resolutionEvidenceIds: uniqueUuidArray(20),
      workReferenceId: z.uuid().optional(),
      publicMessage: nonEmptyTrimmedString(1_000).optional(),
    })
    .strict();

const assignmentSchema = z
  .object({
    id: z.uuid(),
    authorityId: z.uuid(),
    authorityName: nonEmptyTrimmedString(240),
    localBodyId: z.uuid(),
    localBodyName: nonEmptyTrimmedString(240),
    wardId: nullableUuidSchema,
    wardName: z.string().min(1).max(240).nullable(),
    departmentId: z.uuid(),
    departmentName: nonEmptyTrimmedString(240),
    authorityDepartmentId: z.uuid(),
    officerRoleId: z.uuid(),
    officerRoleName: nonEmptyTrimmedString(240),
    officerAssignmentId: nullableUuidSchema,
    officerName: z.string().min(1).max(240).nullable(),
    source: z.enum(['routing_decision', 'manual_assignment', 'transfer']),
    status: z.enum(['active', 'superseded', 'cancelled']),
    assignedAt: offsetTimestampSchema,
    endedAt: offsetTimestampSchema.nullable(),
  })
  .strict();

const queueFlagsSchema = z
  .object({
    isUnassigned: z.boolean(),
    isReopened: z.boolean(),
    isTransferred: z.boolean(),
    isAwaitingCitizenVerification: z.boolean(),
  })
  .strict();

const queueItemSchema = z
  .object({
    id: z.uuid(),
    complaintNumber: nonEmptyTrimmedString(80),
    categoryId: z.uuid(),
    categoryName: nonEmptyTrimmedString(240),
    status: z.enum(complaintStatuses),
    submittedAt: offsetTimestampSchema,
    updatedAt: offsetTimestampSchema,
    workflowVersion: expectedWorkflowVersionSchema,
    currentAssignment: assignmentSchema,
    flags: queueFlagsSchema,
  })
  .strict();

export const governmentComplaintQueueResultSchema: z.ZodType<GovernmentComplaintQueueResult> = z
  .object({
    items: z.array(queueItemSchema).max(100),
    nextCursor: z.string().max(1_024).nullable(),
    hasMore: z.boolean(),
  })
  .strict();

const exactLocationSchema = z
  .object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    accuracyMeters: z.number().finite().nonnegative().max(5_000),
    provider: z.enum(complaintLocationProviders),
    capturedAt: offsetTimestampSchema,
    verificationStatus: z.enum(complaintLocationVerificationStatuses),
    verificationScore: z.number().finite().min(0).max(1).nullable(),
  })
  .strict();

const mediaSummarySchema = z
  .object({
    id: z.uuid(),
    kind: z.enum(complaintMediaKinds),
    mimeType: z.enum(complaintMediaMimeTypes),
    byteSize: z
      .number()
      .int()
      .positive()
      .max(50 * 1_024 * 1_024),
    capturedAt: offsetTimestampSchema.nullable(),
    widthPixels: z.number().int().positive().max(32_768).nullable(),
    heightPixels: z.number().int().positive().max(32_768).nullable(),
    durationMilliseconds: z.number().int().positive().max(86_400_000).nullable(),
    processingStatus: z.enum(complaintMediaProcessingStatuses),
    moderationStatus: z.enum(complaintMediaModerationStatuses),
  })
  .strict();

const routingSummarySchema = z
  .object({
    decisionStatus: z.enum(routingDecisionStatuses),
    confidenceScore: z.number().finite().min(0).max(1),
    explanationCode: z
      .string()
      .regex(/^[a-z][a-z0-9_]{1,119}$/u)
      .nullable(),
    fallbackUsed: z.boolean(),
    fallbackDepth: z.number().int().min(0).max(32),
    resolvedAt: offsetTimestampSchema,
  })
  .strict()
  .refine((summary) => summary.fallbackUsed === summary.fallbackDepth > 0, {
    message: 'Fallback usage must match fallback depth.',
  });

const statusEntrySchema = z
  .object({
    id: z.uuid(),
    sequence: z.number().int().positive(),
    fromStatus: z.union([z.enum(complaintStatuses), z.literal('draft')]).nullable(),
    toStatus: z.enum(complaintStatuses),
    reasonCode: z.string().regex(/^[A-Z][A-Z0-9_]{1,79}$/u),
    publicMessage: z.string().min(1).max(1_000).nullable(),
    occurredAt: offsetTimestampSchema,
  })
  .strict();

const internalNoteSchema = z
  .object({
    id: z.uuid(),
    body: nonEmptyTrimmedString(4_000),
    authorDisplayName: z.string().min(1).max(240).nullable(),
    createdAt: offsetTimestampSchema,
  })
  .strict();

const inspectionSchema = z
  .object({
    id: z.uuid(),
    status: z.enum(['scheduled', 'completed', 'cancelled']),
    scheduledFor: offsetTimestampSchema,
    instructions: z.string().min(1).max(2_000).nullable(),
    outcome: z.enum(governmentInspectionOutcomes).nullable(),
    summary: z.string().min(1).max(4_000).nullable(),
    completedAt: offsetTimestampSchema.nullable(),
    createdAt: offsetTimestampSchema,
  })
  .strict();

const workReferenceSchema = z
  .object({
    id: z.uuid(),
    referenceType: nonEmptyTrimmedString(80),
    referenceNumber: nonEmptyTrimmedString(160),
    description: z.string().min(1).max(2_000).nullable(),
    createdAt: offsetTimestampSchema,
  })
  .strict();

const externalDependencySchema = z
  .object({
    id: z.uuid(),
    dependencyType: z.enum(governmentExternalDependencyTypes),
    description: nonEmptyTrimmedString(4_000),
    expectedBy: offsetTimestampSchema.nullable(),
    status: z.enum(['active', 'resolved', 'cancelled']),
    resolutionSummary: z.string().min(1).max(2_000).nullable(),
    resolvedAt: offsetTimestampSchema.nullable(),
    createdAt: offsetTimestampSchema,
  })
  .strict();

export const governmentResolutionEvidenceSchema = z
  .object({
    id: z.uuid(),
    availableForResolution: z.boolean(),
    kind: z.enum(governmentResolutionEvidenceKinds),
    mimeType: z.enum(resolutionEvidenceMimeTypes),
    byteSize: z
      .number()
      .int()
      .positive()
      .max(50 * 1_024 * 1_024),
    uploadStatus: z.enum(governmentResolutionEvidenceUploadStatuses),
    capturedAt: offsetTimestampSchema.nullable(),
    finalizedAt: offsetTimestampSchema.nullable(),
    createdAt: offsetTimestampSchema,
  })
  .strict();

export const governmentComplaintDetailSchema: z.ZodType<GovernmentComplaintDetail> = queueItemSchema
  .extend({
    description: nonEmptyTrimmedString(5_000),
    location: exactLocationSchema,
    routingSummary: routingSummarySchema,
    media: z.array(mediaSummarySchema),
    assignmentHistory: z.array(assignmentSchema),
    timeline: z.array(statusEntrySchema),
    internalNotes: z.array(internalNoteSchema),
    inspections: z.array(inspectionSchema),
    workReferences: z.array(workReferenceSchema),
    externalDependencies: z.array(externalDependencySchema),
    resolutionEvidence: z.array(governmentResolutionEvidenceSchema),
    allowedActions: z.array(z.enum(governmentComplaintAllowedActions)),
    allowedStatusTransitions: z.array(z.enum(complaintStatuses)),
  })
  .strict();

export const governmentComplaintAssignmentOptionsSchema: z.ZodType<GovernmentComplaintAssignmentOptions> =
  z
    .object({
      complaintId: z.uuid(),
      workflowVersion: expectedWorkflowVersionSchema,
      options: z.array(
        z
          .object({
            allowedActions: z
              .array(z.enum(['assign', 'transfer']))
              .min(1)
              .max(2),
            officerAssignmentId: z.uuid(),
            authorityDepartmentId: z.uuid(),
            departmentId: z.uuid(),
            departmentName: nonEmptyTrimmedString(240),
            wardId: nullableUuidSchema,
            wardName: z.string().min(1).max(240).nullable(),
            officerRoleId: z.uuid(),
            officerRoleName: nonEmptyTrimmedString(240),
            officerName: nonEmptyTrimmedString(240),
          })
          .strict(),
      ),
    })
    .strict();

export const governmentComplaintActionResultSchema: z.ZodType<GovernmentComplaintActionResult> = z
  .object({
    actionId: z.uuid(),
    complaintId: z.uuid(),
    complaintNumber: nonEmptyTrimmedString(80),
    status: z.enum(complaintStatuses),
    workflowVersion: expectedWorkflowVersionSchema,
    updatedAt: offsetTimestampSchema,
    currentAssignment: assignmentSchema,
  })
  .strict();

export const governmentResolutionEvidenceUploadIntentSchema: z.ZodType<GovernmentResolutionEvidenceUploadIntent> =
  z
    .object({
      evidence: governmentResolutionEvidenceSchema,
      upload: z
        .object({
          bucket: z.literal('resolution-evidence-private'),
          objectPath: nonEmptyTrimmedString(1_024),
          token: nonEmptyTrimmedString(8_192),
        })
        .strict(),
      expiresAt: offsetTimestampSchema,
      workflowVersion: expectedWorkflowVersionSchema,
    })
    .strict();

export const governmentResolutionEvidenceFinalizationSchema: z.ZodType<GovernmentResolutionEvidenceFinalization> =
  z
    .object({
      evidence: governmentResolutionEvidenceSchema,
      workflowVersion: expectedWorkflowVersionSchema,
    })
    .strict();

export const governmentResolutionEvidenceAccessSchema: z.ZodType<GovernmentResolutionEvidenceAccess> =
  z
    .object({
      evidenceId: z.uuid(),
      signedUrl: z.string().url().max(8_192),
      expiresAt: offsetTimestampSchema,
    })
    .strict();

export const decodeGovernmentComplaintQueueResult = (
  value: unknown,
): GovernmentComplaintQueueResult => governmentComplaintQueueResultSchema.parse(value);
export const decodeGovernmentComplaintDetail = (value: unknown): GovernmentComplaintDetail =>
  governmentComplaintDetailSchema.parse(value);
export const decodeGovernmentComplaintAssignmentOptions = (
  value: unknown,
): GovernmentComplaintAssignmentOptions => governmentComplaintAssignmentOptionsSchema.parse(value);
export const decodeGovernmentComplaintActionResult = (
  value: unknown,
): GovernmentComplaintActionResult => governmentComplaintActionResultSchema.parse(value);
export const decodeGovernmentResolutionEvidenceUploadIntent = (
  value: unknown,
): GovernmentResolutionEvidenceUploadIntent =>
  governmentResolutionEvidenceUploadIntentSchema.parse(value);
export const decodeGovernmentResolutionEvidenceFinalization = (
  value: unknown,
): GovernmentResolutionEvidenceFinalization =>
  governmentResolutionEvidenceFinalizationSchema.parse(value);
export const decodeGovernmentResolutionEvidenceAccess = (
  value: unknown,
): GovernmentResolutionEvidenceAccess => governmentResolutionEvidenceAccessSchema.parse(value);

export type GovernmentComplaintIdParameters = z.infer<typeof governmentComplaintIdParametersSchema>;
export type GovernmentInspectionIdParameters = z.infer<
  typeof governmentInspectionIdParametersSchema
>;
export type GovernmentResolutionEvidenceIdParameters = z.infer<
  typeof governmentResolutionEvidenceIdParametersSchema
>;
export type GovernmentExternalDependencyIdParameters = z.infer<
  typeof governmentExternalDependencyIdParametersSchema
>;
export type GovernmentComplaintQueueQueryInput = z.infer<
  typeof governmentComplaintQueueQuerySchema
>;
export type GovernmentComplaintScopeQueryInput = z.infer<
  typeof governmentComplaintScopeQuerySchema
>;
