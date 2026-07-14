import type {
  CheckDuplicatesRequest,
  ResolveJurisdictionRequest,
  ResolveRoutingRequest,
} from '@local-wellness/types';
import { z } from 'zod';

const latitudeSchema = z.number().finite().min(-90).max(90);
const longitudeSchema = z.number().finite().min(-180).max(180);
const accuracyMetersSchema = z.number().finite().nonnegative().max(5_000);
const capturedAtSchema = z.iso.datetime({ offset: true });
const mediaHashSchema = z
  .string()
  .regex(/^[0-9a-f]{64}$/u, 'Media hashes must be lowercase SHA-256 digests.');

const locationShape = {
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  accuracyMeters: accuracyMetersSchema,
  capturedAt: capturedAtSchema,
} as const;

export const resolveJurisdictionRequestSchema: z.ZodType<ResolveJurisdictionRequest> = z
  .object(locationShape)
  .strict();

export const resolveRoutingRequestSchema: z.ZodType<ResolveRoutingRequest> = z
  .object({
    ...locationShape,
    categoryId: z.uuid(),
    assetId: z.uuid().optional(),
  })
  .strict();

export const checkDuplicatesRequestSchema: z.ZodType<CheckDuplicatesRequest> = z
  .object({
    ...locationShape,
    categoryId: z.uuid(),
    assetId: z.uuid().optional(),
    description: z.string().trim().min(1).max(4_000).optional(),
    mediaHashes: z
      .array(mediaHashSchema)
      .max(16)
      .refine((hashes) => new Set(hashes).size === hashes.length, {
        message: 'Media hashes must be unique.',
      })
      .optional(),
  })
  .strict();

export const categoryIdParametersSchema = z
  .object({
    categoryId: z.uuid(),
  })
  .strict();

export type ResolveJurisdictionRequestInput = z.infer<typeof resolveJurisdictionRequestSchema>;
export type ResolveRoutingRequestInput = z.infer<typeof resolveRoutingRequestSchema>;
export type CheckDuplicatesRequestInput = z.infer<typeof checkDuplicatesRequestSchema>;
export type CategoryIdParameters = z.infer<typeof categoryIdParametersSchema>;
