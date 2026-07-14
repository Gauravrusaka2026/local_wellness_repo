import {
  complaintIdempotencyKeyPattern,
  complaintLocationProviders,
  complaintMediaCaptureSources,
  complaintMediaKinds,
  complaintMediaMimeTypes,
  type ComplaintListQuery,
  type ComplaintLocationCapture,
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
