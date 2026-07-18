import { publicComplaintSorts, publicComplaintStatuses } from '@local-wellness/types';
import { z } from 'zod';

const maximumViewportSpanDegrees = 2;
const maximumDateRangeMilliseconds = 366 * 24 * 60 * 60 * 1_000;

const longitudeSchema = z.coerce.number().finite().min(-180).max(180);
const latitudeSchema = z.coerce.number().finite().min(-90).max(90);
const publicDateTimeSchema = z.iso.datetime({ offset: true });
const cursorSchema = z.string().regex(/^[A-Za-z0-9_-]{1,512}$/u);

const uniqueQueryList = <T extends z.ZodType>(itemSchema: T, maximumItems: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined) {
        return undefined;
      }

      const values = Array.isArray(value) ? value : [value];
      if (!values.every((entry) => typeof entry === 'string')) {
        return value;
      }

      return values.flatMap((entry) => entry.split(',')).map((entry) => entry.trim());
    },
    z
      .array(itemSchema)
      .min(1)
      .max(maximumItems)
      .refine((items) => new Set(items).size === items.length, 'Filter values must be unique.')
      .optional(),
  );

const publicCategoryCodeSchema = z.string().regex(/^[a-z][a-z0-9_]{1,79}$/u);
const publicGovernanceCodeSchema = z
  .string()
  .min(1)
  .max(80)
  .refine((value) => value === value.trim(), 'Public governance codes must be trimmed.');
const publicLocalBodyCodeSchema = z
  .string()
  .max(80)
  .regex(/^[0-9]+$/u);
const categoryCodesSchema = uniqueQueryList(publicCategoryCodeSchema, 20);
const publicStatusesSchema = uniqueQueryList(z.enum(publicComplaintStatuses), 4);

const viewportShape = {
  west: longitudeSchema,
  south: latitudeSchema,
  east: longitudeSchema,
  north: latitudeSchema,
} as const;

const filterShape = {
  categoryCodes: categoryCodesSchema,
  statuses: publicStatusesSchema,
  from: publicDateTimeSchema.optional(),
  to: publicDateTimeSchema.optional(),
} as const;

const addViewportAndDateBounds = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.superRefine((value, context) => {
    const fields = value as Record<string, unknown>;
    const west = Number(fields['west']);
    const south = Number(fields['south']);
    const east = Number(fields['east']);
    const north = Number(fields['north']);

    if (east <= west || east - west > maximumViewportSpanDegrees) {
      context.addIssue({
        code: 'custom',
        message: `The viewport longitude span must be greater than zero and no more than ${maximumViewportSpanDegrees} degrees.`,
        path: ['east'],
      });
    }

    if (north <= south || north - south > maximumViewportSpanDegrees) {
      context.addIssue({
        code: 'custom',
        message: `The viewport latitude span must be greater than zero and no more than ${maximumViewportSpanDegrees} degrees.`,
        path: ['north'],
      });
    }

    const from = fields['from'];
    const to = fields['to'];
    if (typeof from === 'string' && typeof to === 'string') {
      const range = Date.parse(to) - Date.parse(from);
      if (range < 0 || range > maximumDateRangeMilliseconds) {
        context.addIssue({
          code: 'custom',
          message: 'The transparency date range must be ordered and no longer than 366 days.',
          path: ['to'],
        });
      }
    }
  });

export const publicComplaintMapQuerySchema = addViewportAndDateBounds(
  z
    .object({
      ...viewportShape,
      ...filterShape,
      zoom: z.coerce.number().int().min(0).max(22).default(12),
      limit: z.coerce.number().int().min(1).max(200).default(100),
      sort: z.enum(publicComplaintSorts).default('recent'),
      cursor: cursorSchema.optional(),
    })
    .strict(),
);

export const publicComplaintHotspotQuerySchema = addViewportAndDateBounds(
  z
    .object({
      ...viewportShape,
      ...filterShape,
      zoom: z.coerce.number().int().min(0).max(22).default(12),
      limit: z.coerce.number().int().min(1).max(200).default(100),
    })
    .strict(),
);

export const publicWardBoundaryQuerySchema = addViewportAndDateBounds(
  z
    .object({
      ...viewportShape,
      limit: z.coerce.number().int().min(1).max(200).default(100),
    })
    .strict(),
);

export const publicComplaintIdParametersSchema = z
  .object({
    publicId: z.uuid(),
  })
  .strict();

const publicApproximateLocationSchema = z
  .object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    precisionMeters: z.number().finite().int().min(1).max(200_000),
  })
  .strict();

const publicComplaintCategorySchema = z
  .object({ code: publicCategoryCodeSchema, name: z.string().trim().min(1).max(160) })
  .strict();

const publicWardSummarySchema = z
  .object({
    code: publicGovernanceCodeSchema,
    name: z.string().trim().min(1).max(160),
    wardNumber: z.string().trim().min(1).max(40).nullable(),
  })
  .strict();

const publicLocalBodySummarySchema = z
  .object({
    code: publicLocalBodyCodeSchema,
    name: z.string().trim().min(1).max(240),
  })
  .strict();

export const publicComplaintMapItemSchema = z
  .object({
    publicId: z.uuid(),
    title: z.string().trim().min(1).max(160),
    category: publicComplaintCategorySchema,
    status: z.enum(publicComplaintStatuses),
    location: publicApproximateLocationSchema,
    localBody: publicLocalBodySummarySchema,
    ward: publicWardSummarySchema.nullable(),
    submittedAt: publicDateTimeSchema,
    updatedAt: publicDateTimeSchema,
    publishedAt: publicDateTimeSchema,
    supportCount: z.number().int().min(0).max(1_000_000_000),
  })
  .strict();

export const publicComplaintMapResultSchema = z
  .object({
    items: z.array(publicComplaintMapItemSchema).max(200),
    nextCursor: cursorSchema.nullable(),
    hasMore: z.boolean(),
  })
  .strict();

export const publicComplaintDuplicateGroupSchema = z
  .object({
    canonicalPublicId: z.uuid(),
    relatedPublicIds: z.array(z.uuid()).min(1).max(99),
    totalCount: z.number().int().min(2).max(100),
  })
  .strict()
  .superRefine(({ relatedPublicIds, totalCount }, context) => {
    if (new Set(relatedPublicIds).size !== relatedPublicIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'Related public report identifiers must be unique.',
        path: ['relatedPublicIds'],
      });
    }

    const sortedPublicIds = [...relatedPublicIds].sort((left, right) => left.localeCompare(right));
    if (relatedPublicIds.some((publicId, index) => publicId !== sortedPublicIds[index])) {
      context.addIssue({
        code: 'custom',
        message: 'Related public report identifiers must be sorted.',
        path: ['relatedPublicIds'],
      });
    }

    if (totalCount !== relatedPublicIds.length + 1) {
      context.addIssue({
        code: 'custom',
        message: 'The duplicate group total must match its public report identifiers.',
        path: ['totalCount'],
      });
    }
  });

export const publicComplaintDetailSchema = publicComplaintMapItemSchema
  .extend({
    summary: z.string().trim().min(1).max(2_000),
    duplicateGroup: publicComplaintDuplicateGroupSchema.nullable(),
  })
  .strict()
  .superRefine(({ duplicateGroup, publicId }, context) => {
    if (duplicateGroup === null) return;

    if (duplicateGroup.relatedPublicIds.includes(publicId)) {
      context.addIssue({
        code: 'custom',
        message: 'The requested public report must not be repeated as a related report.',
        path: ['duplicateGroup', 'relatedPublicIds'],
      });
    }

    if (
      duplicateGroup.canonicalPublicId !== publicId &&
      !duplicateGroup.relatedPublicIds.includes(duplicateGroup.canonicalPublicId)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'A related detail must link back to its canonical public report.',
        path: ['duplicateGroup', 'relatedPublicIds'],
      });
    }
  });

export const publicComplaintHotspotSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u),
    location: publicApproximateLocationSchema,
    radiusMeters: z.number().finite().int().min(1).max(200_000),
    complaintCount: z.number().int().min(1).max(1_000_000),
    categoryCount: z.number().int().min(1).max(100_000),
    from: publicDateTimeSchema,
    to: publicDateTimeSchema,
  })
  .strict();

export const publicComplaintHotspotResultSchema = z
  .object({ items: z.array(publicComplaintHotspotSchema).max(200) })
  .strict();

const publicGeoJsonPositionSchema = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-90).max(90),
]);
const publicGeoJsonLinearRingSchema = z.array(publicGeoJsonPositionSchema).min(4).max(20_000);
const publicGeoJsonPolygonCoordinatesSchema = z
  .array(publicGeoJsonLinearRingSchema)
  .min(1)
  .max(500);

export const publicMultiPolygonGeometrySchema = z
  .object({
    type: z.literal('MultiPolygon'),
    coordinates: z.array(publicGeoJsonPolygonCoordinatesSchema).min(1).max(500),
  })
  .strict();

export const publicWardBoundarySchema = z
  .object({
    code: publicGovernanceCodeSchema,
    name: z.string().trim().min(1).max(160),
    wardNumber: z.string().trim().min(1).max(40).nullable(),
    localBodyCode: publicLocalBodyCodeSchema,
    localBodyName: z.string().trim().min(1).max(240),
    boundaryVersion: z.number().int().positive(),
    boundary: publicMultiPolygonGeometrySchema,
    complaintCount: z.number().int().min(0).max(1_000_000),
  })
  .strict();

export const publicWardBoundaryResultSchema = z
  .object({ items: z.array(publicWardBoundarySchema).max(200) })
  .strict();

export const publicComplaintEngagementLookupSchema = z
  .object({
    publicIds: z
      .array(z.uuid())
      .min(1)
      .max(100)
      .refine(
        (publicIds) => new Set(publicIds).size === publicIds.length,
        'Public complaint identifiers must be unique.',
      ),
  })
  .strict();

export const updatePublicComplaintEngagementSchema = z
  .object({ supported: z.boolean(), starred: z.boolean() })
  .strict();

export const publicComplaintEngagementStateSchema = z
  .object({
    publicId: z.uuid(),
    supportCount: z.number().int().min(0).max(1_000_000_000),
    supported: z.boolean(),
    starred: z.boolean(),
  })
  .strict();

export const publicComplaintEngagementListSchema = z
  .array(publicComplaintEngagementStateSchema)
  .max(100);

export type PublicComplaintMapQueryInput = z.infer<typeof publicComplaintMapQuerySchema>;
export type PublicComplaintHotspotQueryInput = z.infer<typeof publicComplaintHotspotQuerySchema>;
export type PublicWardBoundaryQueryInput = z.infer<typeof publicWardBoundaryQuerySchema>;
export type PublicComplaintIdParameters = z.infer<typeof publicComplaintIdParametersSchema>;
export type PublicComplaintEngagementLookupInput = z.infer<
  typeof publicComplaintEngagementLookupSchema
>;
export type UpdatePublicComplaintEngagementInput = z.infer<
  typeof updatePublicComplaintEngagementSchema
>;
