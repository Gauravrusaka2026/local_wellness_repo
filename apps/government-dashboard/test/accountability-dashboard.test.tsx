import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type {
  GovernmentAccessScope,
  GovernmentComplaintSlaSummary,
  GovernmentKpiSnapshotResult,
} from '@local-wellness/types';

import {
  AccountabilityUnavailableMessage,
  KpiAuthorityRequired,
  KpiDashboard,
} from '../app/accountability/kpi-view';
import { ComplaintSlaPanel } from '../app/complaints/[complaintId]/sla-panel';
import {
  decodeGovernmentComplaintSlaSummary,
  decodeGovernmentKpiSnapshotResult,
  getGovernmentComplaintSla,
  getGovernmentKpiSnapshots,
} from '../lib/api/accountability';
import {
  filterKpiSnapshots,
  getKpiAuthorityIds,
  parseKpiSearch,
  toOrganizationalScopeValue,
} from '../lib/accountability/query';

const identifiers = {
  authority: '30000000-0000-4000-8000-000000000001',
  clock: '30000000-0000-4000-8000-000000000002',
  complaint: '30000000-0000-4000-8000-000000000003',
  kpi: '30000000-0000-4000-8000-000000000004',
  role: '30000000-0000-4000-8000-000000000005',
  run: '30000000-0000-4000-8000-000000000006',
  scope: '30000000-0000-4000-8000-000000000007',
  scopeRoleAssignment: '30000000-0000-4000-8000-000000000008',
} as const;

const scope: GovernmentAccessScope = {
  authorities: [],
  roles: [
    {
      assignmentId: identifiers.scopeRoleAssignment,
      authorityId: identifiers.authority,
      code: 'government_operator',
      description: null,
      effectiveFrom: '2026-07-16T08:00:00.000Z',
      effectiveUntil: null,
      isGovernment: true,
      isPrivileged: false,
      name: 'Government operator',
      roleId: identifiers.role,
      scopeId: identifiers.authority,
      scopeType: 'authority',
    },
  ],
};

const kpis: GovernmentKpiSnapshotResult = {
  runId: identifiers.run,
  windowStartedAt: '2026-07-01T00:00:00.000Z',
  windowEndedAt: '2026-07-16T10:00:00.000Z',
  sourceCutoffAt: '2026-07-16T09:55:00.000Z',
  calculatedAt: '2026-07-16T10:00:00.000Z',
  items: [
    {
      id: identifiers.kpi,
      metricCode: 'acknowledgement_compliance',
      metricName: 'Acknowledgement compliance',
      unit: 'percent',
      definitionVersion: 1,
      scopeType: 'municipality',
      scopeId: identifiers.scope,
      scopeName: 'Reference Municipal Corporation',
      segment: 'all',
      numerator: 8,
      denominator: 10,
      value: 80,
      sampleSize: 10,
    },
  ],
};

const sla: GovernmentComplaintSlaSummary = {
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
      targetBusinessMinutes: 60,
      startedAt: '2026-07-16T08:00:00.000Z',
      targetAt: '2026-07-16T09:00:00.000Z',
      completedAt: null,
      breachedAt: null,
      pausedAt: null,
      externalDependencySegment: false,
    },
  ],
  escalations: [],
};

const originalApiUrl = process.env['NEXT_PUBLIC_API_URL'];
const originalFetch = globalThis.fetch;

beforeEach(() => {
  Reflect.set(process.env, 'NEXT_PUBLIC_API_URL', 'http://127.0.0.1:3001');
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiUrl === undefined) Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_API_URL');
  else Reflect.set(process.env, 'NEXT_PUBLIC_API_URL', originalApiUrl);
});

test('loads authenticated SLA and KPI contracts with selected scope filters', async () => {
  const requests: Readonly<{ input: string; init: RequestInit }>[] = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({ input: String(input), init: init ?? {} });
    const data = String(input).endsWith(
      '/sla?scopeRoleAssignmentId=' + identifiers.scopeRoleAssignment,
    )
      ? sla
      : kpis;
    return new Response(JSON.stringify({ data, meta: { requestId: 'accountability-test' } }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  }) as typeof fetch;

  const loadedKpis = await getGovernmentKpiSnapshots('government-token', {
    authorityId: identifiers.authority,
    scopeRoleAssignmentId: identifiers.scopeRoleAssignment,
    scopeType: 'municipality',
    scopeId: identifiers.scope,
    segment: 'all',
    metricCodes: ['acknowledgement_compliance'],
  });
  const loadedSla = await getGovernmentComplaintSla(
    'government-token',
    identifiers.complaint,
    identifiers.scopeRoleAssignment,
  );

  assert.deepEqual(loadedKpis, kpis);
  assert.deepEqual(loadedSla, sla);
  assert.match(requests[0]?.input ?? '', new RegExp(`authorityId=${identifiers.authority}`, 'u'));
  assert.match(requests[0]?.input ?? '', /scopeType=municipality/u);
  assert.match(requests[0]?.input ?? '', /metricCodes=acknowledgement_compliance/u);
  assert.match(
    requests[1]?.input ?? '',
    new RegExp(`/complaints/${identifiers.complaint}/sla`, 'u'),
  );
  assert.equal(
    (requests[0]?.init.headers as Record<string, string> | undefined)?.['Authorization'],
    'Bearer government-token',
  );
});

test('strict decoders reject private or malformed accountability fields', () => {
  assert.deepEqual(decodeGovernmentComplaintSlaSummary(sla), sla);
  assert.deepEqual(decodeGovernmentKpiSnapshotResult(kpis), kpis);
  assert.throws(() =>
    decodeGovernmentComplaintSlaSummary({ ...sla, internalPolicyId: identifiers.scope }),
  );
  assert.throws(() =>
    decodeGovernmentKpiSnapshotResult({
      ...kpis,
      items: [{ ...kpis.items[0], staffUserId: identifiers.role }],
    }),
  );
});

test('parses only current access and organizational KPI filters', () => {
  const parsed = parseKpiSearch(
    {
      accessScope: identifiers.scopeRoleAssignment,
      metric: 'acknowledgement_compliance',
      scope: toOrganizationalScopeValue('municipality', identifiers.scope),
      segment: 'all',
    },
    scope,
  );
  assert.equal(parsed.error, null);
  assert.deepEqual(parsed.query, {
    authorityId: identifiers.authority,
    scopeRoleAssignmentId: identifiers.scopeRoleAssignment,
  });
  assert.deepEqual(filterKpiSnapshots(kpis.items, parsed), kpis.items);

  const invalid = parseKpiSearch(
    { accessScope: identifiers.complaint, metric: 'invented', scope: 'ward:not-a-uuid' },
    scope,
  );
  assert.match(invalid.error ?? '', /access scope/u);
  assert.deepEqual(invalid.query, { authorityId: identifiers.authority });
});

test('derives KPI authorities only from active access and never accepts a free UUID', () => {
  const platformScope: GovernmentAccessScope = {
    authorities: [
      {
        authorityId: identifiers.authority,
        effectiveFrom: '2026-07-16T08:00:00.000Z',
        effectiveUntil: null,
        invitationEmail: null,
        membershipId: identifiers.kpi,
        status: 'active',
      },
      {
        authorityId: identifiers.complaint,
        effectiveFrom: '2026-07-16T08:00:00.000Z',
        effectiveUntil: null,
        invitationEmail: null,
        membershipId: identifiers.clock,
        status: 'revoked',
      },
    ],
    roles: [
      {
        assignmentId: identifiers.scopeRoleAssignment,
        authorityId: null,
        code: 'platform_admin',
        description: null,
        effectiveFrom: '2026-07-16T08:00:00.000Z',
        effectiveUntil: null,
        isGovernment: false,
        isPrivileged: true,
        name: 'Platform administrator',
        roleId: identifiers.role,
        scopeId: null,
        scopeType: 'global',
      },
    ],
  };

  assert.deepEqual(getKpiAuthorityIds(platformScope), [identifiers.authority]);
  assert.deepEqual(parseKpiSearch({}, platformScope).query, {
    authorityId: identifiers.authority,
  });
  assert.deepEqual(
    parseKpiSearch({ accessScope: identifiers.scopeRoleAssignment }, platformScope).query,
    {
      authorityId: identifiers.authority,
      scopeRoleAssignmentId: identifiers.scopeRoleAssignment,
    },
  );

  const tampered = parseKpiSearch({ authority: identifiers.complaint }, platformScope);
  assert.match(tampered.error ?? '', /authority/u);
  assert.deepEqual(tampered.query, {});
});

test('renders explicit guidance instead of requesting KPIs without authority access', () => {
  const platformOnlyScope: GovernmentAccessScope = {
    authorities: [],
    roles: [
      {
        assignmentId: identifiers.scopeRoleAssignment,
        authorityId: null,
        code: 'platform_admin',
        description: null,
        effectiveFrom: '2026-07-16T08:00:00.000Z',
        effectiveUntil: null,
        isGovernment: false,
        isPrivileged: true,
        name: 'Platform administrator',
        roleId: identifiers.role,
        scopeId: null,
        scopeType: 'global',
      },
    ],
  };

  const parsed = parseKpiSearch({}, platformOnlyScope);
  assert.deepEqual(parsed.query, {});
  const markup = renderToStaticMarkup(
    <KpiAuthorityRequired accessScope={platformOnlyScope} selectedScopeRoleAssignmentId="" />,
  );
  assert.match(markup, /No authority-scoped membership/u);
  assert.match(markup, /activate an authority membership/u);
  assert.doesNotMatch(markup, /role="status"/u);

  const authorityFormMarkup = renderToStaticMarkup(
    <KpiAuthorityRequired accessScope={scope} selectedScopeRoleAssignmentId="" />,
  );
  assert.match(authorityFormMarkup, /Choose an authority/u);
  assert.match(authorityFormMarkup, /Load KPIs/u);
  assert.doesNotMatch(authorityFormMarkup, /role="status"/u);
});

test('announces KPI load errors but treats missing scope as an expected state', () => {
  const noScopeMarkup = renderToStaticMarkup(
    <AccountabilityUnavailableMessage status="no-scope" />,
  );
  assert.match(noScopeMarkup, /active government role is required/u);
  assert.doesNotMatch(noScopeMarkup, /role="alert"/u);

  const errorMarkup = renderToStaticMarkup(
    <AccountabilityUnavailableMessage message="Try again later." status="error" />,
  );
  assert.match(errorMarkup, /role="alert"/u);
  assert.match(errorMarkup, /Try again later/u);
});

test('renders reproducible organizational metrics without individual scoring', () => {
  const parsed = parseKpiSearch({}, scope);
  const markup = renderToStaticMarkup(
    <KpiDashboard accessScope={scope} filters={parsed.filters} items={kpis.items} result={kpis} />,
  );

  assert.match(markup, /Organizational KPIs/u);
  assert.match(markup, /Source cutoff/u);
  assert.match(markup, /Sample/u);
  assert.match(markup, /Numerator/u);
  assert.match(markup, /Denominator/u);
  assert.match(markup, /80%/u);
  assert.doesNotMatch(markup, /officer|ranking|leaderboard/u);
});

test('renders honest empty KPI and every unavailable SLA policy state', () => {
  const empty: GovernmentKpiSnapshotResult = {
    runId: null,
    windowStartedAt: null,
    windowEndedAt: null,
    sourceCutoffAt: null,
    calculatedAt: null,
    items: [],
  };
  const parsed = parseKpiSearch({}, scope);
  const emptyMarkup = renderToStaticMarkup(
    <KpiDashboard accessScope={scope} filters={parsed.filters} items={[]} result={empty} />,
  );
  assert.match(emptyMarkup, /No KPI snapshot run is available/u);
  assert.match(emptyMarkup, /not configured/u);

  const expectations = {
    no_approved_policy: 'No approved SLA policy',
    ambiguous_policy: 'SLA policy is ambiguous',
    invalid_configuration: 'SLA policy configuration is invalid',
    not_materialized: 'SLA clocks are not materialized',
  } as const;
  for (const [unavailableReason, expected] of Object.entries(expectations)) {
    const markup = renderToStaticMarkup(
      <ComplaintSlaPanel
        summary={{
          complaintId: identifiers.complaint,
          policyApplied: false,
          unavailableReason: unavailableReason as keyof typeof expectations,
          clocks: [],
          escalations: [],
        }}
      />,
    );
    assert.match(markup, new RegExp(expected, 'u'));
  }
});

test('renders materialized SLA targets and explicit dependency errors', () => {
  const markup = renderToStaticMarkup(<ComplaintSlaPanel summary={sla} />);
  assert.match(markup, /SLA milestones/u);
  assert.match(markup, /Acknowledgement/u);
  assert.match(markup, /60 minutes/u);
  assert.match(markup, /No SLA escalation event/u);

  const errorMarkup = renderToStaticMarkup(<ComplaintSlaPanel error="Try again later." />);
  assert.match(errorMarkup, /temporarily unavailable/u);
  assert.match(errorMarkup, /Try again later/u);
});
