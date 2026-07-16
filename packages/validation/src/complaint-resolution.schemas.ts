import {
  complaintEvidenceRoles,
  complaintLocationProviders,
  complaintMediaKinds,
  complaintMediaMimeTypes,
  complaintReopenEvidenceUploadStatuses,
  complaintResolutionOutcomes,
  complaintStatuses,
  type ComplaintAccountabilityEvidence,
  type ComplaintEscalationEvent,
  type ComplaintEvidenceAccess,
  type ComplaintReopenEvidence,
  type ComplaintReopenEvidenceFinalization,
  type ComplaintReopenEvidenceUploadIntent,
  type ComplaintReopenRequest,
  type ComplaintResolutionContext,
  type ComplaintResolutionFeedback,
  type ComplaintResolutionFeedbackInput,
  type ComplaintResolutionFeedbackResult,
  type ComplaintResolutionLocation,
  type ComplaintResolutionPolicy,
  type CreateComplaintReopenEvidenceUploadIntentInput,
  type FinalizeComplaintReopenEvidenceInput,
  type GovernmentComplaintAccountability,
  type GovernmentComplaintResolutionRecord,
  type ReopenComplaintInput,
  type ReopenComplaintResult,
} from '@local-wellness/types';
import { z } from 'zod';

import { complaintLocationCaptureSchema } from './complaint.schemas.js';

const offsetTimestampSchema = z.iso.datetime({ offset: true });
const nonEmptyTrimmedString = (maximumLength: number) =>
  z.string().trim().min(1).max(maximumLength);
const expectedWorkflowVersionSchema = z.number().int().positive();
const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/u);
const safeCodeSchema = z.string().regex(/^[a-z][a-z0-9_]{1,79}$/u);

const uniqueUuidArray = z
  .array(z.uuid())
  .max(20)
  .refine((values) => new Set(values).size === values.length, {
    message: 'Evidence identifiers must be unique.',
  });

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

export const complaintResolutionFeedbackSchema: z.ZodType<ComplaintResolutionFeedbackInput> = z
  .object({
    expectedWorkflowVersion: expectedWorkflowVersionSchema,
    resolutionId: z.uuid(),
    outcome: z.enum(complaintResolutionOutcomes),
    ratings: z
      .object({
        satisfaction: z.number().int().min(1).max(10),
        speed: z.number().int().min(1).max(10),
        quality: z.number().int().min(1).max(10),
        communication: z.number().int().min(1).max(10),
      })
      .strict()
      .optional(),
    comment: nonEmptyTrimmedString(2_000).optional(),
  })
  .strict();

export const reopenComplaintSchema: z.ZodType<ReopenComplaintInput> = z
  .object({
    expectedWorkflowVersion: expectedWorkflowVersionSchema,
    resolutionId: z.uuid(),
    reasonCode: safeCodeSchema,
    explanation: nonEmptyTrimmedString(4_000),
    evidenceIds: uniqueUuidArray,
  })
  .strict();

export const createComplaintReopenEvidenceUploadIntentSchema: z.ZodType<CreateComplaintReopenEvidenceUploadIntentInput> =
  z
    .object({
      expectedWorkflowVersion: expectedWorkflowVersionSchema,
      kind: z.enum(['photo', 'video']),
      mimeType: z.enum(resolutionEvidenceMimeTypes),
      byteSize: z
        .number()
        .int()
        .positive()
        .max(50 * 1_024 * 1_024),
      sha256: sha256Schema,
      capturedAt: offsetTimestampSchema,
      widthPixels: z.number().int().positive().max(20_000).optional(),
      heightPixels: z.number().int().positive().max(20_000).optional(),
      durationMilliseconds: z.number().int().positive().max(600_000).optional(),
      captureLocation: complaintLocationCaptureSchema,
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

      if ((input.widthPixels === undefined) !== (input.heightPixels === undefined)) {
        context.addIssue({
          code: 'custom',
          message: 'Evidence dimensions must include both width and height.',
          path: ['widthPixels'],
        });
      }

      if (input.kind === 'photo' && input.durationMilliseconds !== undefined) {
        context.addIssue({
          code: 'custom',
          message: 'Photo evidence cannot include a duration.',
          path: ['durationMilliseconds'],
        });
      }

      if (input.kind === 'video' && input.durationMilliseconds === undefined) {
        context.addIssue({
          code: 'custom',
          message: 'Video evidence must include a duration.',
          path: ['durationMilliseconds'],
        });
      }
    });

export const finalizeComplaintReopenEvidenceSchema: z.ZodType<FinalizeComplaintReopenEvidenceInput> =
  z
    .object({
      expectedWorkflowVersion: expectedWorkflowVersionSchema,
      byteSize: z
        .number()
        .int()
        .positive()
        .max(50 * 1_024 * 1_024),
      sha256: sha256Schema,
    })
    .strict();

export const complaintEvidenceIdParametersSchema = z
  .object({ complaintId: z.uuid(), evidenceId: z.uuid() })
  .strict();

export const complaintResolutionLocationSchema: z.ZodType<ComplaintResolutionLocation> = z
  .object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    accuracyMeters: z.number().finite().nonnegative().max(5_000),
    provider: z.enum(complaintLocationProviders),
    capturedAt: offsetTimestampSchema,
  })
  .strict();

export const complaintAccountabilityEvidenceSchema: z.ZodType<ComplaintAccountabilityEvidence> = z
  .object({
    id: z.uuid(),
    role: z.enum(complaintEvidenceRoles),
    kind: z.enum(complaintMediaKinds),
    mimeType: z.enum(complaintMediaMimeTypes),
    byteSize: z
      .number()
      .int()
      .positive()
      .max(50 * 1_024 * 1_024),
    capturedAt: offsetTimestampSchema.nullable(),
    createdAt: offsetTimestampSchema,
  })
  .strict();

export const complaintResolutionRecordSchema = z
  .object({
    id: z.uuid(),
    version: z.number().int().positive(),
    publicMessage: z.string().trim().min(1).max(1_000).nullable(),
    completedAt: offsetTimestampSchema.nullable(),
    completionLocation: complaintResolutionLocationSchema.nullable(),
    distanceFromComplaintMeters: z.number().finite().nonnegative().max(100_000).nullable(),
    workReference: z
      .object({
        id: z.uuid(),
        referenceType: nonEmptyTrimmedString(80),
        referenceNumber: nonEmptyTrimmedString(160),
        description: z.string().trim().min(1).max(2_000).nullable(),
      })
      .strict()
      .nullable(),
    beforeEvidence: z.array(complaintAccountabilityEvidenceSchema).max(50),
    afterEvidence: z.array(complaintAccountabilityEvidenceSchema).max(50),
    reopenEvidence: z.array(complaintAccountabilityEvidenceSchema).max(50),
  })
  .strict()
  .superRefine((record, context) => {
    const roleGroups = [
      ['beforeEvidence', 'before', record.beforeEvidence],
      ['afterEvidence', 'after', record.afterEvidence],
      ['reopenEvidence', 'reopen', record.reopenEvidence],
    ] as const;
    for (const [path, expectedRole, evidence] of roleGroups) {
      if (evidence.some(({ role }) => role !== expectedRole)) {
        context.addIssue({
          code: 'custom',
          message: `Every ${expectedRole} evidence item must use the ${expectedRole} role.`,
          path: [path],
        });
      }
    }
  });

export const governmentComplaintResolutionRecordSchema: z.ZodType<GovernmentComplaintResolutionRecord> =
  complaintResolutionRecordSchema.safeExtend({
    completionNote: nonEmptyTrimmedString(4_000),
  });

export const complaintResolutionFeedbackRecordSchema: z.ZodType<ComplaintResolutionFeedback> = z
  .object({
    id: z.uuid(),
    resolutionId: z.uuid(),
    outcome: z.enum(complaintResolutionOutcomes),
    ratings: z
      .object({
        satisfaction: z.number().int().min(1).max(10),
        speed: z.number().int().min(1).max(10),
        quality: z.number().int().min(1).max(10),
        communication: z.number().int().min(1).max(10),
      })
      .strict()
      .nullable(),
    comment: z.string().trim().min(1).max(2_000).nullable(),
    submittedAt: offsetTimestampSchema,
  })
  .strict();

export const complaintReopenRequestSchema: z.ZodType<ComplaintReopenRequest> = z
  .object({
    id: z.uuid(),
    resolutionId: z.uuid(),
    attemptNumber: z.number().int().positive(),
    reasonCode: safeCodeSchema,
    explanation: nonEmptyTrimmedString(4_000),
    evidenceIds: uniqueUuidArray,
    resultingStatus: z.enum(['reopened', 'escalated']),
    requestedAt: offsetTimestampSchema,
  })
  .strict();

export const complaintEscalationEventSchema: z.ZodType<ComplaintEscalationEvent> = z
  .object({
    id: z.uuid(),
    level: z.number().int().positive(),
    reasonCode: safeCodeSchema,
    occurredAt: offsetTimestampSchema,
  })
  .strict();

const uniqueOptions = <Code extends string>(options: ReadonlyArray<{ code: Code }>): boolean =>
  new Set(options.map(({ code }) => code)).size === options.length;

export const complaintResolutionPolicySchema: z.ZodType<ComplaintResolutionPolicy> = z
  .object({
    id: z.uuid(),
    version: z.number().int().positive(),
    outcomeOptions: z
      .array(
        z
          .object({
            code: z.enum(complaintResolutionOutcomes),
            label: nonEmptyTrimmedString(120),
          })
          .strict(),
      )
      .min(1)
      .max(complaintResolutionOutcomes.length)
      .refine(uniqueOptions, { message: 'Outcome option codes must be unique.' }),
    reopenReasonOptions: z
      .array(z.object({ code: safeCodeSchema, label: nonEmptyTrimmedString(120) }).strict())
      .max(50)
      .refine(uniqueOptions, { message: 'Reopen reason codes must be unique.' }),
    ratingMinimum: z.number().int().min(1).max(10),
    ratingMaximum: z.number().int().min(1).max(10),
    ratingsRequired: z.boolean(),
    ratingLabels: z
      .object({
        satisfaction: nonEmptyTrimmedString(120),
        speed: nonEmptyTrimmedString(120),
        quality: nonEmptyTrimmedString(120),
        communication: nonEmptyTrimmedString(120),
      })
      .strict(),
    reopenDeadline: offsetTimestampSchema.nullable(),
    reopenAttemptsRemaining: z.number().int().nonnegative().max(100),
    reopenEvidenceRequired: z.boolean(),
    feedbackAllowed: z.boolean(),
    reopenAllowed: z.boolean(),
    reopenEvidenceUploadAllowed: z.boolean(),
    unavailableReason: z.string().trim().min(1).max(500).nullable(),
  })
  .strict()
  .superRefine((policy, context) => {
    if (policy.ratingMaximum < policy.ratingMinimum) {
      context.addIssue({
        code: 'custom',
        message: 'The rating maximum must be greater than or equal to the minimum.',
        path: ['ratingMaximum'],
      });
    }
  });

export const complaintResolutionContextSchema: z.ZodType<ComplaintResolutionContext> = z
  .object({
    complaintId: z.uuid(),
    workflowVersion: expectedWorkflowVersionSchema,
    status: z.enum(complaintStatuses),
    latestResolution: complaintResolutionRecordSchema.nullable(),
    policy: complaintResolutionPolicySchema.nullable(),
    policyUnavailableReason: z.string().trim().min(1).max(500).nullable(),
    availableReopenEvidence: z.array(z.lazy(() => complaintReopenEvidenceSchema)).max(20),
    feedback: z.array(complaintResolutionFeedbackRecordSchema).max(100),
    reopenRequests: z.array(complaintReopenRequestSchema).max(100),
    escalations: z.array(complaintEscalationEventSchema).max(100),
  })
  .strict()
  .superRefine((contextValue, context) => {
    if (contextValue.policy === null && contextValue.policyUnavailableReason === null) {
      context.addIssue({
        code: 'custom',
        message: 'An unavailable policy must include a safe reason.',
        path: ['policyUnavailableReason'],
      });
    }
    if (
      contextValue.availableReopenEvidence.some(({ uploadStatus }) => uploadStatus !== 'finalized')
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Recoverable reopen evidence must already be finalized.',
        path: ['availableReopenEvidence'],
      });
    }
    const availableEvidenceIds = contextValue.availableReopenEvidence.map(({ id }) => id);
    if (new Set(availableEvidenceIds).size !== availableEvidenceIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'Recoverable reopen evidence identifiers must be unique.',
        path: ['availableReopenEvidence'],
      });
    }
    if (availableEvidenceIds.length > 0 && contextValue.latestResolution === null) {
      context.addIssue({
        code: 'custom',
        message: 'Recoverable reopen evidence requires a current resolution.',
        path: ['availableReopenEvidence'],
      });
    }
    const linkedReopenEvidenceIds = new Set(
      contextValue.latestResolution?.reopenEvidence.map(({ id }) => id) ?? [],
    );
    if (availableEvidenceIds.some((id) => linkedReopenEvidenceIds.has(id))) {
      context.addIssue({
        code: 'custom',
        message: 'Recoverable reopen evidence must not already be linked to a request.',
        path: ['availableReopenEvidence'],
      });
    }
  });

export const complaintResolutionFeedbackResultSchema: z.ZodType<ComplaintResolutionFeedbackResult> =
  z
    .object({
      complaintId: z.uuid(),
      status: z.enum(complaintStatuses),
      workflowVersion: expectedWorkflowVersionSchema,
      updatedAt: offsetTimestampSchema,
      feedback: complaintResolutionFeedbackRecordSchema,
    })
    .strict();

export const reopenComplaintResultSchema: z.ZodType<ReopenComplaintResult> = z
  .object({
    complaintId: z.uuid(),
    status: z.enum(['reopened', 'escalated']),
    workflowVersion: expectedWorkflowVersionSchema,
    updatedAt: offsetTimestampSchema,
    reopenRequest: complaintReopenRequestSchema,
    escalation: complaintEscalationEventSchema.nullable(),
  })
  .strict();

export const complaintReopenEvidenceSchema: z.ZodType<ComplaintReopenEvidence> = z
  .object({
    id: z.uuid(),
    kind: z.enum(['photo', 'video']),
    mimeType: z.enum(resolutionEvidenceMimeTypes),
    byteSize: z
      .number()
      .int()
      .positive()
      .max(50 * 1_024 * 1_024),
    uploadStatus: z.enum(complaintReopenEvidenceUploadStatuses),
    capturedAt: offsetTimestampSchema,
    captureLocation: complaintResolutionLocationSchema,
    finalizedAt: offsetTimestampSchema.nullable(),
    createdAt: offsetTimestampSchema,
  })
  .strict();

export const complaintReopenEvidenceUploadIntentSchema: z.ZodType<ComplaintReopenEvidenceUploadIntent> =
  z
    .object({
      evidence: complaintReopenEvidenceSchema,
      upload: z
        .object({
          bucket: nonEmptyTrimmedString(128),
          objectPath: nonEmptyTrimmedString(1_024),
          token: nonEmptyTrimmedString(8_192),
        })
        .strict(),
      expiresAt: offsetTimestampSchema,
      workflowVersion: expectedWorkflowVersionSchema,
    })
    .strict();

export const complaintReopenEvidenceFinalizationSchema: z.ZodType<ComplaintReopenEvidenceFinalization> =
  z
    .object({
      evidence: complaintReopenEvidenceSchema,
      workflowVersion: expectedWorkflowVersionSchema,
    })
    .strict();

export const complaintEvidenceAccessSchema: z.ZodType<ComplaintEvidenceAccess> = z
  .object({
    evidenceId: z.uuid(),
    role: z.enum(complaintEvidenceRoles),
    signedUrl: z.string().url().max(8_192),
    expiresAt: offsetTimestampSchema,
  })
  .strict();

export const governmentComplaintAccountabilitySchema: z.ZodType<GovernmentComplaintAccountability> =
  z
    .object({
      complaintId: z.uuid(),
      workflowVersion: expectedWorkflowVersionSchema,
      resolutionHistory: z.array(governmentComplaintResolutionRecordSchema).max(100),
      feedback: z.array(complaintResolutionFeedbackRecordSchema).max(100),
      reopenRequests: z.array(complaintReopenRequestSchema).max(100),
      escalations: z.array(complaintEscalationEventSchema).max(100),
    })
    .strict();

export const decodeComplaintResolutionContext = (value: unknown): ComplaintResolutionContext =>
  complaintResolutionContextSchema.parse(value);
export const decodeComplaintResolutionFeedbackResult = (
  value: unknown,
): ComplaintResolutionFeedbackResult => complaintResolutionFeedbackResultSchema.parse(value);
export const decodeReopenComplaintResult = (value: unknown): ReopenComplaintResult =>
  reopenComplaintResultSchema.parse(value);
export const decodeComplaintReopenEvidenceUploadIntent = (
  value: unknown,
): ComplaintReopenEvidenceUploadIntent => complaintReopenEvidenceUploadIntentSchema.parse(value);
export const decodeComplaintReopenEvidenceFinalization = (
  value: unknown,
): ComplaintReopenEvidenceFinalization => complaintReopenEvidenceFinalizationSchema.parse(value);
export const decodeComplaintEvidenceAccess = (value: unknown): ComplaintEvidenceAccess =>
  complaintEvidenceAccessSchema.parse(value);
export const decodeGovernmentComplaintAccountability = (
  value: unknown,
): GovernmentComplaintAccountability => governmentComplaintAccountabilitySchema.parse(value);

export type ComplaintEvidenceIdParameters = z.infer<typeof complaintEvidenceIdParametersSchema>;
