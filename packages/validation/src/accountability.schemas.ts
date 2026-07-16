import {
  complaintSlaClockStates,
  governmentKpiMetricCodes,
  governmentKpiScopeTypes,
  governmentKpiSegments,
  slaMilestones,
  type GovernmentComplaintSlaSummary,
  type GovernmentKpiQuery,
  type GovernmentKpiSnapshotResult,
} from '@local-wellness/types';
import { z } from 'zod';

const offsetTimestamp = z.iso.datetime({ offset: true });
const boundedCode = z.string().regex(/^[a-z][a-z0-9_]{1,79}$/u);

const queryArray = <Value>(schema: z.ZodType<Value>) =>
  z.preprocess(
    (value) =>
      typeof value === 'string'
        ? value
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean)
        : value,
    z
      .array(schema)
      .min(1)
      .max(20)
      .refine((values) => new Set(values).size === values.length, {
        message: 'Filter values must be unique.',
      }),
  );

export const governmentKpiQuerySchema: z.ZodType<GovernmentKpiQuery> = z
  .object({
    authorityId: z.uuid().optional(),
    scopeRoleAssignmentId: z.uuid().optional(),
    scopeType: z.enum(governmentKpiScopeTypes).optional(),
    scopeId: z.uuid().optional(),
    segment: z.enum(governmentKpiSegments).optional(),
    metricCodes: queryArray(z.enum(governmentKpiMetricCodes)).optional(),
  })
  .strict()
  .refine(
    ({ scopeId, scopeType }) =>
      (scopeId === undefined && scopeType === undefined) ||
      (scopeId !== undefined && scopeType !== undefined),
    {
      message: 'Scope type and scope identifier must be provided together.',
      path: ['scopeId'],
    },
  );

export const governmentComplaintSlaParametersSchema = z.object({ complaintId: z.uuid() }).strict();

const governmentComplaintSlaClockSchema = z
  .object({
    id: z.uuid(),
    milestone: z.enum(slaMilestones),
    cycle: z.number().int().positive(),
    state: z.enum(complaintSlaClockStates),
    policyCode: boundedCode,
    policyVersion: z.number().int().positive(),
    targetBusinessMinutes: z.number().int().positive(),
    startedAt: offsetTimestamp,
    targetAt: offsetTimestamp,
    completedAt: offsetTimestamp.nullable(),
    breachedAt: offsetTimestamp.nullable(),
    pausedAt: offsetTimestamp.nullable(),
    externalDependencySegment: z.boolean(),
  })
  .strict();

const governmentComplaintSlaEscalationSchema = z
  .object({
    id: z.uuid(),
    clockId: z.uuid(),
    milestone: z.enum(slaMilestones),
    level: z.number().int().min(1).max(20),
    action: z.enum(['record', 'mark_escalated']),
    occurredAt: offsetTimestamp,
    resultingStatus: boundedCode,
  })
  .strict();

export const governmentComplaintSlaSummarySchema: z.ZodType<GovernmentComplaintSlaSummary> = z
  .object({
    complaintId: z.uuid(),
    policyApplied: z.boolean(),
    unavailableReason: z
      .enum(['no_approved_policy', 'ambiguous_policy', 'invalid_configuration', 'not_materialized'])
      .nullable(),
    clocks: z.array(governmentComplaintSlaClockSchema).max(60),
    escalations: z.array(governmentComplaintSlaEscalationSchema).max(100),
  })
  .strict()
  .refine(
    ({ policyApplied, unavailableReason }) =>
      policyApplied ? unavailableReason === null : unavailableReason !== null,
    {
      message: 'Unavailable reason must reflect whether an SLA policy was applied.',
      path: ['unavailableReason'],
    },
  );

export const governmentComplaintSlaQuerySchema = z
  .object({ scopeRoleAssignmentId: z.uuid().optional() })
  .strict();

const governmentKpiSnapshotSchema = z
  .object({
    id: z.uuid(),
    metricCode: z.enum(governmentKpiMetricCodes),
    metricName: z.string().trim().min(1).max(120),
    unit: z.enum(['count', 'percent']),
    definitionVersion: z.number().int().positive(),
    scopeType: z.enum(governmentKpiScopeTypes),
    scopeId: z.uuid(),
    scopeName: z.string().trim().min(1).max(240),
    segment: z.enum(governmentKpiSegments),
    numerator: z.number().int().nonnegative(),
    denominator: z.number().int().nonnegative(),
    value: z.number().nonnegative().nullable(),
    sampleSize: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((snapshot, context) => {
    if (snapshot.unit === 'percent' && snapshot.value !== null && snapshot.value > 100) {
      context.addIssue({
        code: 'custom',
        message: 'Percentage KPI values cannot exceed 100.',
        path: ['value'],
      });
    }
  });

export const governmentKpiSnapshotResultSchema: z.ZodType<GovernmentKpiSnapshotResult> = z
  .object({
    runId: z.uuid().nullable(),
    windowStartedAt: offsetTimestamp.nullable(),
    windowEndedAt: offsetTimestamp.nullable(),
    sourceCutoffAt: offsetTimestamp.nullable(),
    calculatedAt: offsetTimestamp.nullable(),
    items: z.array(governmentKpiSnapshotSchema).max(2_000),
  })
  .strict();

export type GovernmentKpiQueryInput = z.infer<typeof governmentKpiQuerySchema>;
export type GovernmentComplaintSlaParameters = z.infer<
  typeof governmentComplaintSlaParametersSchema
>;
export type GovernmentComplaintSlaQueryInput = z.infer<typeof governmentComplaintSlaQuerySchema>;
