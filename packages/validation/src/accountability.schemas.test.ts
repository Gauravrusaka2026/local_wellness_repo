import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  governmentComplaintSlaSummarySchema,
  governmentKpiQuerySchema,
  governmentKpiSnapshotResultSchema,
} from './accountability.schemas.js';

const identifiers = {
  clock: '10000000-0000-4000-8000-000000000001',
  complaint: '10000000-0000-4000-8000-000000000002',
  run: '10000000-0000-4000-8000-000000000003',
  scope: '10000000-0000-4000-8000-000000000004',
  snapshot: '10000000-0000-4000-8000-000000000005',
} as const;

describe('Phase 9 accountability validation', () => {
  it('accepts bounded KPI filters and requires a complete scope pair', () => {
    assert.deepEqual(
      governmentKpiQuerySchema.parse({
        metricCodes: 'backlog,resolution_compliance',
        scopeId: identifiers.scope,
        scopeType: 'ward',
      }),
      {
        metricCodes: ['backlog', 'resolution_compliance'],
        scopeId: identifiers.scope,
        scopeType: 'ward',
      },
    );

    assert.throws(() => governmentKpiQuerySchema.parse({ scopeId: identifiers.scope }));
    assert.throws(() => governmentKpiQuerySchema.parse({ metricCodes: 'backlog,backlog' }));
    assert.throws(() => governmentKpiQuerySchema.parse({ unknown: true }));
  });

  it('strictly decodes SLA summaries without private policy or lease fields', () => {
    const summary = {
      complaintId: identifiers.complaint,
      policyApplied: true,
      unavailableReason: null,
      clocks: [
        {
          id: identifiers.clock,
          milestone: 'acknowledgement',
          cycle: 1,
          state: 'active',
          policyCode: 'municipal_standard',
          policyVersion: 1,
          targetBusinessMinutes: 120,
          startedAt: '2026-07-16T08:00:00.000Z',
          targetAt: '2026-07-16T10:00:00.000Z',
          completedAt: null,
          breachedAt: null,
          pausedAt: null,
          externalDependencySegment: false,
        },
      ],
      escalations: [],
    } as const;

    assert.equal(governmentComplaintSlaSummarySchema.parse(summary).clocks.length, 1);
    assert.throws(() =>
      governmentComplaintSlaSummarySchema.parse({
        ...summary,
        clocks: [{ ...summary.clocks[0], leaseToken: 'private' }],
      }),
    );
  });

  it('strictly decodes reproducible KPI snapshot metadata', () => {
    const result = {
      runId: identifiers.run,
      windowStartedAt: '2026-07-01T00:00:00.000Z',
      windowEndedAt: '2026-07-16T00:00:00.000Z',
      sourceCutoffAt: '2026-07-16T00:05:00.000Z',
      calculatedAt: '2026-07-16T00:06:00.000Z',
      items: [
        {
          id: identifiers.snapshot,
          metricCode: 'backlog',
          metricName: 'Open backlog',
          unit: 'count',
          definitionVersion: 1,
          scopeType: 'ward',
          scopeId: identifiers.scope,
          scopeName: 'Ward 1',
          segment: 'all',
          numerator: 4,
          denominator: 4,
          value: 4,
          sampleSize: 4,
        },
      ],
    } as const;

    assert.equal(governmentKpiSnapshotResultSchema.parse(result).items[0]?.value, 4);
    assert.throws(() =>
      governmentKpiSnapshotResultSchema.parse({
        ...result,
        items: [{ ...result.items[0], individualOfficerId: identifiers.scope }],
      }),
    );
  });
});
