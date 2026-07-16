import React from 'react';
import {
  governmentKpiMetricCodes,
  governmentKpiSegments,
  type GovernmentAccessScope,
  type GovernmentKpiMetricCode,
  type GovernmentKpiScopeType,
  type GovernmentKpiSnapshot,
  type GovernmentKpiSnapshotResult,
} from '@local-wellness/types';

import { getScopeTypeLabel } from '../../lib/api/access-scope';
import {
  getKpiAuthorityIds,
  toOrganizationalScopeValue,
  type KpiFilterValues,
} from '../../lib/accountability/query';
import { formatDateTime } from '../../lib/complaints/presentation';

const metricLabels: Readonly<Record<GovernmentKpiMetricCode, string>> = {
  acknowledgement_compliance: 'Acknowledgement compliance',
  resolution_compliance: 'Resolution compliance',
  citizen_confirmed_resolution_rate: 'Citizen-confirmed resolution rate',
  reopen_rate: 'Reopen rate',
  misrouting_rate: 'Misrouting rate',
  backlog: 'Backlog',
  evidence_completeness: 'Evidence completeness',
  communication_quality: 'Communication quality',
};

const scopeTypeLabels: Readonly<Record<GovernmentKpiScopeType, string>> = {
  municipality: 'Municipality',
  ward: 'Ward',
  department: 'Department',
};

const segmentLabels = {
  all: 'All complaints',
  external_dependency: 'External dependency',
  no_external_dependency: 'No external dependency',
} as const;

const formatOptionalTime = (value: string | null): string =>
  value === null ? 'Not available' : formatDateTime(value);

const formatMetricValue = (snapshot: GovernmentKpiSnapshot): string => {
  if (snapshot.value === null) return 'Not calculated';
  return snapshot.unit === 'percent'
    ? `${snapshot.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`
    : snapshot.value.toLocaleString();
};

const AuthorityField = ({
  accessScope,
  defaultValue,
}: Readonly<{ accessScope: GovernmentAccessScope; defaultValue: string }>) => (
  <div className="field-group">
    <label htmlFor="kpi-authority">Municipal authority</label>
    <select defaultValue={defaultValue} id="kpi-authority" name="authority" required>
      <option disabled value="">
        Choose an authority
      </option>
      {getKpiAuthorityIds(accessScope).map((authorityId) => (
        <option key={authorityId} value={authorityId}>
          Authority {authorityId}
        </option>
      ))}
    </select>
  </div>
);

export const KpiAuthorityRequired = ({
  accessScope,
  selectedScopeRoleAssignmentId,
}: Readonly<{
  accessScope: GovernmentAccessScope;
  selectedScopeRoleAssignmentId: string;
}>) => {
  const authorityIds = getKpiAuthorityIds(accessScope);
  if (authorityIds.length === 0) {
    return (
      <section className="content-card denied-card" role="status">
        <p className="eyebrow">Organizational accountability</p>
        <h1>No authority-scoped membership</h1>
        <p>
          Your platform role is active, but KPI snapshots are isolated by municipal authority. Ask a
          platform administrator to activate an authority membership before loading KPIs.
        </p>
      </section>
    );
  }

  return (
    <section className="content-card" role="status">
      <p className="eyebrow">Organizational accountability</p>
      <h1>Choose an authority</h1>
      <p>Select one of your active authority memberships before loading KPI snapshots.</p>
      <form action="/accountability" className="kpi-filter-grid" method="get">
        {selectedScopeRoleAssignmentId === '' ? null : (
          <input name="accessScope" type="hidden" value={selectedScopeRoleAssignmentId} />
        )}
        <AuthorityField accessScope={accessScope} defaultValue="" />
        <div className="filter-actions">
          <button className="primary-button" type="submit">
            Load KPIs
          </button>
        </div>
      </form>
    </section>
  );
};

export const KpiDashboard = ({
  accessScope,
  filters,
  items,
  result,
}: Readonly<{
  accessScope: GovernmentAccessScope;
  filters: KpiFilterValues;
  items: readonly GovernmentKpiSnapshot[];
  result: GovernmentKpiSnapshotResult;
}>) => {
  const organizationalScopes = [
    ...new Map(
      result.items.map((item) => [
        toOrganizationalScopeValue(item.scopeType, item.scopeId),
        { id: item.scopeId, name: item.scopeName, type: item.scopeType },
      ]),
    ).values(),
  ].sort((left, right) => `${left.type}:${left.name}`.localeCompare(`${right.type}:${right.name}`));

  return (
    <>
      <section aria-labelledby="kpi-filter-heading" className="content-card filter-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow">Organizational controls</p>
            <h2 id="kpi-filter-heading">Filter KPI snapshots</h2>
          </div>
          <a className="text-link" href="/accountability">
            Clear all
          </a>
        </div>
        <form action="/accountability" className="kpi-filter-grid" method="get">
          <AuthorityField accessScope={accessScope} defaultValue={filters.authorityId} />
          <div className="field-group">
            <label htmlFor="access-scope">Active access scope</label>
            <select
              defaultValue={filters.scopeRoleAssignmentId}
              id="access-scope"
              name="accessScope"
            >
              <option value="">All permitted scopes</option>
              {accessScope.roles.map((role) => (
                <option key={role.assignmentId} value={role.assignmentId}>
                  {role.name} — {getScopeTypeLabel(role.scopeType)}
                </option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="organizational-scope">Organization</label>
            <select
              defaultValue={filters.organizationalScope}
              id="organizational-scope"
              name="scope"
            >
              <option value="">All organizational scopes</option>
              {organizationalScopes.map((scope) => (
                <option
                  key={toOrganizationalScopeValue(scope.type, scope.id)}
                  value={toOrganizationalScopeValue(scope.type, scope.id)}
                >
                  {scopeTypeLabels[scope.type]} — {scope.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="segment">Segment</label>
            <select defaultValue={filters.segment} id="segment" name="segment">
              <option value="">All segments</option>
              {governmentKpiSegments.map((segment) => (
                <option key={segment} value={segment}>
                  {segmentLabels[segment]}
                </option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="metric">Metric</label>
            <select defaultValue={filters.metricCode} id="metric" name="metric">
              <option value="">All metrics</option>
              {governmentKpiMetricCodes.map((metric) => (
                <option key={metric} value={metric}>
                  {metricLabels[metric]}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-actions">
            <button className="primary-button" type="submit">
              Apply filters
            </button>
          </div>
        </form>
      </section>

      <section aria-labelledby="snapshot-heading" className="content-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow">Reproducible calculation</p>
            <h2 id="snapshot-heading">Snapshot metadata</h2>
          </div>
          <span className="privacy-badge">Organization-level only</span>
        </div>
        <dl className="definition-grid">
          <div>
            <dt>Window start</dt>
            <dd>{formatOptionalTime(result.windowStartedAt)}</dd>
          </div>
          <div>
            <dt>Window end</dt>
            <dd>{formatOptionalTime(result.windowEndedAt)}</dd>
          </div>
          <div>
            <dt>Source cutoff</dt>
            <dd>{formatOptionalTime(result.sourceCutoffAt)}</dd>
          </div>
          <div>
            <dt>Calculated</dt>
            <dd>{formatOptionalTime(result.calculatedAt)}</dd>
          </div>
          <div>
            <dt>Snapshot run</dt>
            <dd>{result.runId ?? 'No completed run'}</dd>
          </div>
        </dl>
        <p className="field-hint">
          Metrics compare municipalities, wards, and departments and do not identify individual
          staff members.
        </p>
      </section>

      <section aria-labelledby="kpi-results-heading" className="content-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow">Authorized snapshots</p>
            <h2 id="kpi-results-heading">Organizational KPIs</h2>
          </div>
          <span className="result-count">{items.length} result(s)</span>
        </div>
        {result.runId === null ? (
          <div className="empty-state" role="status">
            <h3>No KPI snapshot run is available</h3>
            <p>Calculation is not configured or no completed snapshot has been published yet.</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state" role="status">
            <h3>No snapshots match these filters</h3>
            <p>
              The completed run contains no authorized organizational metric for this selection.
            </p>
          </div>
        ) : (
          <ul className="kpi-grid">
            {items.map((snapshot) => (
              <li className="kpi-card" key={snapshot.id}>
                <div className="kpi-card-heading">
                  <span>{scopeTypeLabels[snapshot.scopeType]}</span>
                  <span>{segmentLabels[snapshot.segment]}</span>
                </div>
                <h3>{snapshot.metricName}</h3>
                <p className="kpi-scope-name">{snapshot.scopeName}</p>
                <strong className="kpi-value">{formatMetricValue(snapshot)}</strong>
                <dl className="kpi-stat-grid">
                  <div>
                    <dt>Sample</dt>
                    <dd>{snapshot.sampleSize.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Numerator</dt>
                    <dd>{snapshot.numerator.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Denominator</dt>
                    <dd>{snapshot.denominator.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Definition</dt>
                    <dd>v{snapshot.definitionVersion}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
};
