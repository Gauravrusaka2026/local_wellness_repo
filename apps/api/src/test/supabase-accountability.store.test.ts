import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  GovernmentComplaintSlaSummary,
  GovernmentKpiQuery,
  GovernmentKpiSnapshotResult,
} from '@local-wellness/types';

import {
  AccountabilityAccessDeniedError,
  AccountabilityDataAccessError,
  AccountabilityNotFoundError,
} from '../data/accountability.store.js';
import { SupabaseAccountabilityStore } from '../supabase/supabase-accountability.store.js';
import { SupabaseClients } from '../supabase/supabase-clients.js';

const identifiers = {
  actor: '20000000-0000-4000-8000-000000000001',
  authority: '20000000-0000-4000-8000-000000000008',
  clock: '20000000-0000-4000-8000-000000000002',
  complaint: '20000000-0000-4000-8000-000000000003',
  kpi: '20000000-0000-4000-8000-000000000004',
  run: '20000000-0000-4000-8000-000000000005',
  scope: '20000000-0000-4000-8000-000000000006',
  scopeRoleAssignment: '20000000-0000-4000-8000-000000000007',
} as const;

const sla: GovernmentComplaintSlaSummary = {
  complaintId: identifiers.complaint,
  policyApplied: true,
  unavailableReason: null,
  clocks: [
    {
      id: identifiers.clock,
      milestone: 'resolution',
      cycle: 1,
      state: 'met',
      policyCode: 'municipal_standard',
      policyVersion: 2,
      targetBusinessMinutes: 1_440,
      startedAt: '2026-07-15T08:00:00.000Z',
      targetAt: '2026-07-16T08:00:00.000Z',
      completedAt: '2026-07-16T07:30:00.000Z',
      breachedAt: null,
      pausedAt: null,
      externalDependencySegment: false,
    },
  ],
  escalations: [],
};

const kpis: GovernmentKpiSnapshotResult = {
  runId: identifiers.run,
  windowStartedAt: '2026-07-01T00:00:00.000Z',
  windowEndedAt: '2026-07-16T08:00:00.000Z',
  sourceCutoffAt: '2026-07-16T07:55:00.000Z',
  calculatedAt: '2026-07-16T08:00:00.000Z',
  items: [
    {
      id: identifiers.kpi,
      metricCode: 'resolution_compliance',
      metricName: 'Resolution compliance',
      unit: 'percent',
      definitionVersion: 1,
      scopeType: 'ward',
      scopeId: identifiers.scope,
      scopeName: 'Ward 1',
      segment: 'no_external_dependency',
      numerator: 7,
      denominator: 10,
      value: 70,
      sampleSize: 10,
    },
  ],
};

interface RpcCall {
  functionName: string;
  arguments_: Record<string, unknown>;
}

type RpcHandler = (
  functionName: string,
  arguments_: Record<string, unknown>,
) => Promise<Readonly<{ data: unknown; error: unknown }>>;

const createStore = (rpc: RpcHandler): SupabaseAccountabilityStore =>
  new SupabaseAccountabilityStore({
    publicClient: {
      rpc: () => {
        throw new Error('The public Supabase client must not read accountability data.');
      },
    },
    serviceRoleClient: { rpc },
  } as unknown as SupabaseClients);

describe('SupabaseAccountabilityStore', () => {
  it('uses scoped service-role RPCs and strictly decodes SLA and KPI payloads', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      return { data: { payload: functionName.includes('sla') ? sla : kpis }, error: null };
    });
    const query: GovernmentKpiQuery = {
      authorityId: identifiers.authority,
      scopeRoleAssignmentId: identifiers.scopeRoleAssignment,
      scopeType: 'ward',
      scopeId: identifiers.scope,
      segment: 'no_external_dependency',
      metricCodes: ['resolution_compliance', 'backlog'],
    };

    assert.deepEqual(
      await store.getComplaintSla(
        identifiers.actor,
        identifiers.complaint,
        identifiers.scopeRoleAssignment,
      ),
      sla,
    );
    assert.deepEqual(await store.listKpiSnapshots(identifiers.actor, query), kpis);
    assert.deepEqual(calls, [
      {
        functionName: 'get_government_complaint_sla',
        arguments_: {
          p_actor_user_id: identifiers.actor,
          p_complaint_id: identifiers.complaint,
          p_scope_role_assignment_id: identifiers.scopeRoleAssignment,
        },
      },
      {
        functionName: 'list_government_kpi_snapshots',
        arguments_: {
          p_actor_user_id: identifiers.actor,
          p_authority_id: identifiers.authority,
          p_scope_role_assignment_id: identifiers.scopeRoleAssignment,
          p_scope_type: 'ward',
          p_scope_id: identifiers.scope,
          p_segment: 'no_external_dependency',
          p_metric_codes: ['resolution_compliance', 'backlog'],
        },
      },
    ]);
  });

  it('preserves explicit unconfigured and empty results', async () => {
    const unconfiguredSla: GovernmentComplaintSlaSummary = {
      complaintId: identifiers.complaint,
      policyApplied: false,
      unavailableReason: 'invalid_configuration',
      clocks: [],
      escalations: [],
    };
    const emptyKpis: GovernmentKpiSnapshotResult = {
      runId: null,
      windowStartedAt: null,
      windowEndedAt: null,
      sourceCutoffAt: null,
      calculatedAt: null,
      items: [],
    };
    const store = createStore(async (functionName) => ({
      data: functionName.includes('sla') ? unconfiguredSla : emptyKpis,
      error: null,
    }));

    assert.deepEqual(
      await store.getComplaintSla(identifiers.actor, identifiers.complaint),
      unconfiguredSla,
    );
    assert.deepEqual(await store.listKpiSnapshots(identifiers.actor, {}), emptyKpis);
  });

  it('fails closed for private fields, duplicate wrappers, and malformed values', async () => {
    const privateSla = createStore(async () => ({
      data: { payload: { ...sla, policyVersionId: identifiers.scope } },
      error: null,
    }));
    await assert.rejects(
      privateSla.getComplaintSla(identifiers.actor, identifiers.complaint),
      AccountabilityDataAccessError,
    );

    const duplicateRows = createStore(async () => ({
      data: [{ payload: kpis }, { payload: kpis }],
      error: null,
    }));
    await assert.rejects(
      duplicateRows.listKpiSnapshots(identifiers.actor, {}),
      AccountabilityDataAccessError,
    );

    const malformedKpi = createStore(async () => ({
      data: { ...kpis, items: [{ ...kpis.items[0], officerId: identifiers.actor }] },
      error: null,
    }));
    await assert.rejects(
      malformedKpi.listKpiSnapshots(identifiers.actor, {}),
      AccountabilityDataAccessError,
    );
  });

  it('maps database access, not-found, and generic failures without exposing details', async () => {
    const denied = createStore(async () => ({
      data: null,
      error: { message: 'GOVERNMENT_ACCESS_REQUIRED' },
    }));
    await assert.rejects(
      denied.listKpiSnapshots(identifiers.actor, {}),
      AccountabilityAccessDeniedError,
    );

    const missing = createStore(async () => ({
      data: null,
      error: { message: 'COMPLAINT_NOT_FOUND' },
    }));
    await assert.rejects(
      missing.getComplaintSla(identifiers.actor, identifiers.complaint),
      AccountabilityNotFoundError,
    );

    const unavailable = createStore(async () => ({
      data: null,
      error: { message: 'private database detail' },
    }));
    await assert.rejects(
      unavailable.listKpiSnapshots(identifiers.actor, {}),
      AccountabilityDataAccessError,
    );

    const rejected = createStore(async () => Promise.reject(new Error('private transport detail')));
    await assert.rejects(
      rejected.listKpiSnapshots(identifiers.actor, {}),
      AccountabilityDataAccessError,
    );
  });
});
