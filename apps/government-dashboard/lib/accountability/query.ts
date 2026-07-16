import {
  governmentKpiMetricCodes,
  governmentKpiScopeTypes,
  governmentKpiSegments,
  type GovernmentAccessScope,
  type GovernmentKpiMetricCode,
  type GovernmentKpiQuery,
  type GovernmentKpiScopeType,
  type GovernmentKpiSegment,
  type GovernmentKpiSnapshot,
} from '@local-wellness/types';
import { governmentKpiQuerySchema } from '@local-wellness/validation';

export type AccountabilitySearchParameters = Readonly<
  Record<string, string | string[] | undefined>
>;

export type KpiFilterValues = Readonly<{
  authorityId: string;
  metricCode: GovernmentKpiMetricCode | '';
  organizationalScope: string;
  scopeRoleAssignmentId: string;
  segment: GovernmentKpiSegment | '';
}>;

export type ParsedKpiSearch = Readonly<{
  error: string | null;
  filters: KpiFilterValues;
  query: GovernmentKpiQuery;
  selectedScope: Readonly<{ id: string; type: GovernmentKpiScopeType }> | null;
}>;

const singleValue = (value: string | string[] | undefined): string | null =>
  Array.isArray(value) ? null : (value ?? '');

const scopeSeparator = ':';

const isValidAuthorityId = (authorityId: string): boolean =>
  governmentKpiQuerySchema.safeParse({ authorityId }).success;

export const getKpiAuthorityIds = (accessScope: GovernmentAccessScope): string[] =>
  [
    ...new Set(
      [
        ...accessScope.authorities
          .filter(({ status }) => status === 'active')
          .map(({ authorityId }) => authorityId),
        ...accessScope.roles.flatMap(({ authorityId }) =>
          authorityId === null ? [] : [authorityId],
        ),
      ].filter(isValidAuthorityId),
    ),
  ].sort();

export const toOrganizationalScopeValue = (
  scopeType: GovernmentKpiScopeType,
  scopeId: string,
): string => `${scopeType}${scopeSeparator}${scopeId}`;

const parseOrganizationalScope = (
  value: string,
): Readonly<{ id: string; type: GovernmentKpiScopeType }> | null => {
  if (value === '') return null;
  const separatorIndex = value.indexOf(scopeSeparator);
  if (separatorIndex <= 0 || value.indexOf(scopeSeparator, separatorIndex + 1) !== -1) return null;
  const type = value.slice(0, separatorIndex);
  const id = value.slice(separatorIndex + 1);
  if (!governmentKpiScopeTypes.includes(type as GovernmentKpiScopeType)) return null;
  const parsed = governmentKpiQuerySchema.safeParse({ scopeId: id, scopeType: type });
  return parsed.success ? { id, type: type as GovernmentKpiScopeType } : null;
};

export const parseKpiSearch = (
  parameters: AccountabilitySearchParameters,
  accessScope: GovernmentAccessScope,
): ParsedKpiSearch => {
  const rawRole = singleValue(parameters['accessScope']);
  const rawAuthority = singleValue(parameters['authority']);
  const rawOrganizationalScope = singleValue(parameters['scope']);
  const rawSegment = singleValue(parameters['segment']);
  const rawMetric = singleValue(parameters['metric']);
  const errors: string[] = [];

  if (
    rawRole === null ||
    rawAuthority === null ||
    rawOrganizationalScope === null ||
    rawSegment === null ||
    rawMetric === null
  ) {
    errors.push('repeated filter');
  }

  const selectedRole = accessScope.roles.find(({ assignmentId }) => assignmentId === rawRole);
  const scopeRoleAssignmentId = selectedRole?.assignmentId ?? '';
  if (rawRole && scopeRoleAssignmentId === '') errors.push('access scope');

  const availableAuthorityIds = getKpiAuthorityIds(accessScope);
  const roleAuthorityId = selectedRole?.authorityId ?? null;
  let authorityId = '';
  if (roleAuthorityId !== null) {
    authorityId = roleAuthorityId;
  } else if (rawAuthority && availableAuthorityIds.includes(rawAuthority)) {
    authorityId = rawAuthority;
  } else if (!rawAuthority && availableAuthorityIds.length === 1) {
    authorityId = availableAuthorityIds[0] ?? '';
  }
  if (roleAuthorityId === null && rawAuthority && authorityId === '') errors.push('authority');

  const selectedScope = parseOrganizationalScope(rawOrganizationalScope ?? '');
  if (rawOrganizationalScope && selectedScope === null) errors.push('organizational scope');

  const segment = governmentKpiSegments.includes(rawSegment as GovernmentKpiSegment)
    ? (rawSegment as GovernmentKpiSegment)
    : '';
  if (rawSegment && segment === '') errors.push('segment');

  const metricCode = governmentKpiMetricCodes.includes(rawMetric as GovernmentKpiMetricCode)
    ? (rawMetric as GovernmentKpiMetricCode)
    : '';
  if (rawMetric && metricCode === '') errors.push('metric');

  return {
    error:
      errors.length === 0
        ? null
        : `One or more KPI filters are invalid (${[...new Set(errors)].join(', ')}).`,
    filters: {
      authorityId,
      metricCode,
      organizationalScope: selectedScope
        ? toOrganizationalScopeValue(selectedScope.type, selectedScope.id)
        : '',
      scopeRoleAssignmentId,
      segment,
    },
    query: {
      ...(authorityId === '' ? {} : { authorityId }),
      ...(scopeRoleAssignmentId === '' ? {} : { scopeRoleAssignmentId }),
    },
    selectedScope,
  };
};

export const filterKpiSnapshots = (
  items: readonly GovernmentKpiSnapshot[],
  parsed: ParsedKpiSearch,
): GovernmentKpiSnapshot[] =>
  items.filter(
    (item) =>
      (parsed.selectedScope === null ||
        (item.scopeType === parsed.selectedScope.type &&
          item.scopeId === parsed.selectedScope.id)) &&
      (parsed.filters.segment === '' || item.segment === parsed.filters.segment) &&
      (parsed.filters.metricCode === '' || item.metricCode === parsed.filters.metricCode),
  );
