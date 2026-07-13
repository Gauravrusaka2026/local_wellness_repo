import {
  clientAuthAuditEventTypes,
  devicePlatforms,
  governmentInvitationRoleCodes,
  supportedLanguages,
} from '@local-wellness/types';
import { z } from 'zod';

const nonEmptyTrimmedString = (maximumLength: number) =>
  z.string().trim().min(1).max(maximumLength);

export const updateProfileSchema = z
  .object({
    displayName: nonEmptyTrimmedString(100).optional(),
    preferredLanguage: z.enum(supportedLanguages).optional(),
    onboardingCompleted: z.literal(true).optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one profile field must be provided.',
  });

export const registerDeviceSchema = z
  .object({
    deviceIdentifier: z
      .string()
      .regex(/^[0-9a-f]{64}$/u, 'Device identifier must be a lowercase SHA-256 digest.'),
    platform: z.enum(devicePlatforms),
    appVersion: nonEmptyTrimmedString(64).optional(),
    pushToken: z.union([nonEmptyTrimmedString(4_096), z.null()]).optional(),
  })
  .strict();

export const deviceIdParametersSchema = z
  .object({
    deviceId: z.uuid(),
  })
  .strict();

const auditMetadataSchema = z
  .object({
    authMethod: z.enum(['phone_otp', 'email_otp', 'magic_link']).optional(),
    clientSurface: z
      .enum(['mobile', 'citizen_web', 'government_dashboard', 'admin_console'])
      .optional(),
    source: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

export const recordAuthAuditEventSchema = z
  .object({
    eventType: z.enum(clientAuthAuditEventTypes),
    deviceId: z.uuid().optional(),
    authorityId: z.uuid().optional(),
    metadata: auditMetadataSchema.optional(),
  })
  .strict();

export const createGovernmentInvitationSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    authorityId: z.uuid(),
    roleCode: z.enum(governmentInvitationRoleCodes),
    scopeType: z.enum(['authority', 'ward', 'department']).default('authority'),
    scopeId: z.uuid().optional(),
    effectiveUntil: z.iso.datetime({ offset: true }).optional(),
  })
  .strict()
  .refine(
    ({ authorityId, scopeId, scopeType }) =>
      scopeType === 'authority'
        ? scopeId === undefined || scopeId === authorityId
        : scopeId !== undefined,
    {
      message: 'The requested role scope is invalid.',
      path: ['scopeId'],
    },
  )
  .refine(
    ({ effectiveUntil }) => effectiveUntil === undefined || Date.parse(effectiveUntil) > Date.now(),
    {
      message: 'The role expiry must be in the future.',
      path: ['effectiveUntil'],
    },
  );

export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;
export type RegisterDeviceRequest = z.infer<typeof registerDeviceSchema>;
export type DeviceIdParameters = z.infer<typeof deviceIdParametersSchema>;
export type RecordAuthAuditEventRequest = z.infer<typeof recordAuthAuditEventSchema>;
export type CreateGovernmentInvitationRequest = z.infer<typeof createGovernmentInvitationSchema>;

export * from './governance/index.js';
