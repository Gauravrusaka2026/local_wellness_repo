import {
  governingBodyResolutionStatuses,
  maximumGoverningBodyAccuracyMeters,
  verifiedGovernanceEntityKinds,
  type GoverningBodyResolution,
} from '@local-wellness/types';
import { z } from 'zod';

import { resolveJurisdictionRequestSchema } from './routing.schemas.js';

const verifiedGovernanceEntitySummarySchema = z
  .object({
    kind: z.enum(verifiedGovernanceEntityKinds),
    name: z.string().trim().min(1).max(240),
    type: z.string().trim().min(1).max(80),
    verificationStatus: z.literal('verified'),
    lastVerifiedOn: z.iso.date(),
    sourceUrl: z.url().refine((url) => url.startsWith('https://') || url.startsWith('http://'), {
      message: 'Source URL must use HTTP or HTTPS.',
    }),
  })
  .strict();

export const verifiedCivicAreaOfficeSchema = z
  .object({
    name: z.string().trim().min(1).max(240),
    type: z.string().trim().min(1).max(120),
    address: z.string().trim().min(1).max(1_000).optional(),
    phone: z.string().trim().min(1).max(240).optional(),
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)).optional(),
    lastVerifiedOn: z.iso.date(),
    sourceUrl: z.url().refine((url) => url.startsWith('https://'), {
      message: 'Office source URL must use HTTPS.',
    }),
  })
  .strict();

export const verifiedGoverningBodyMatchSchema = z
  .object({
    state: verifiedGovernanceEntitySummarySchema,
    district: verifiedGovernanceEntitySummarySchema.nullable(),
    taluka: verifiedGovernanceEntitySummarySchema.nullable(),
    authority: verifiedGovernanceEntitySummarySchema,
    localBody: verifiedGovernanceEntitySummarySchema,
    ward: verifiedGovernanceEntitySummarySchema.nullable(),
    offices: z.array(verifiedCivicAreaOfficeSchema).max(25).optional(),
  })
  .strict()
  .superRefine((match, context) => {
    const expectedKinds = [
      ['state', match.state.kind],
      ['district', match.district?.kind],
      ['taluka', match.taluka?.kind],
      ['authority', match.authority.kind],
      ['local_body', match.localBody.kind],
      ['ward', match.ward?.kind],
    ] as const;

    for (const [expected, actual] of expectedKinds) {
      if (actual !== undefined && actual !== expected) {
        context.addIssue({
          code: 'custom',
          message: `Expected ${expected} governance entity.`,
        });
      }
    }

    if (match.taluka !== null && match.district === null) {
      context.addIssue({
        code: 'custom',
        message: 'A taluka requires a district in the resolved hierarchy.',
        path: ['taluka'],
      });
    }
  });

export const governingBodyResolutionSchema: z.ZodType<GoverningBodyResolution> = z
  .object({
    status: z.enum(governingBodyResolutionStatuses),
    reason: z.string().trim().min(1).max(160),
    maximumAccuracyMeters: z.literal(maximumGoverningBodyAccuracyMeters),
    matches: z.array(verifiedGoverningBodyMatchSchema).max(25),
  })
  .strict()
  .superRefine((resolution, context) => {
    const count = resolution.matches.length;

    if (resolution.status === 'resolved' && count !== 1) {
      context.addIssue({
        code: 'custom',
        message: 'A resolved governing-body lookup must contain exactly one match.',
        path: ['matches'],
      });
    } else if (resolution.status === 'ambiguous' && count < 2) {
      context.addIssue({
        code: 'custom',
        message: 'An ambiguous governing-body lookup must contain at least two matches.',
        path: ['matches'],
      });
    } else if (
      (resolution.status === 'unsupported' || resolution.status === 'low_accuracy') &&
      count !== 0
    ) {
      context.addIssue({
        code: 'custom',
        message: 'An unresolved governing-body lookup cannot contain matches.',
        path: ['matches'],
      });
    }
  });

export const resolveGoverningBodiesRequestSchema = resolveJurisdictionRequestSchema;

export type ResolveGoverningBodiesRequestInput = z.infer<
  typeof resolveGoverningBodiesRequestSchema
>;
