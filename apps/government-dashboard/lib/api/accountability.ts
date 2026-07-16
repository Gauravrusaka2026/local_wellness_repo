import type {
  GovernmentComplaintSlaSummary,
  GovernmentKpiQuery,
  GovernmentKpiSnapshotResult,
} from '@local-wellness/types';
import {
  governmentComplaintSlaQuerySchema,
  governmentComplaintSlaSummarySchema,
  governmentKpiQuerySchema,
  governmentKpiSnapshotResultSchema,
} from '@local-wellness/validation';

import { ApiError, createGovernmentApiClient, getUserFacingApiError } from './client';

const identifierPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const assertIdentifier = (value: string, label: string): void => {
  if (!identifierPattern.test(value)) {
    throw new TypeError(`The ${label} identifier is invalid.`);
  }
};

export const decodeGovernmentComplaintSlaSummary = (
  value: unknown,
): GovernmentComplaintSlaSummary => governmentComplaintSlaSummarySchema.parse(value);

export const decodeGovernmentKpiSnapshotResult = (value: unknown): GovernmentKpiSnapshotResult =>
  governmentKpiSnapshotResultSchema.parse(value);

export const buildGovernmentKpiPath = (query: GovernmentKpiQuery): `/${string}` => {
  const parsed = governmentKpiQuerySchema.parse(query);
  const parameters = new URLSearchParams();
  if (parsed.authorityId) parameters.set('authorityId', parsed.authorityId);
  if (parsed.scopeRoleAssignmentId) {
    parameters.set('scopeRoleAssignmentId', parsed.scopeRoleAssignmentId);
  }
  if (parsed.scopeType) parameters.set('scopeType', parsed.scopeType);
  if (parsed.scopeId) parameters.set('scopeId', parsed.scopeId);
  if (parsed.segment) parameters.set('segment', parsed.segment);
  parsed.metricCodes?.forEach((metricCode) => parameters.append('metricCodes', metricCode));
  const search = parameters.toString();
  return search === ''
    ? '/api/v1/government/accountability/kpis'
    : `/api/v1/government/accountability/kpis?${search}`;
};

export const getGovernmentKpiSnapshots = (
  accessToken: string,
  query: GovernmentKpiQuery,
): Promise<GovernmentKpiSnapshotResult> =>
  createGovernmentApiClient(accessToken).get(buildGovernmentKpiPath(query), {
    decode: decodeGovernmentKpiSnapshotResult,
  });

export const getGovernmentComplaintSla = (
  accessToken: string,
  complaintId: string,
  scopeRoleAssignmentId?: string,
): Promise<GovernmentComplaintSlaSummary> => {
  assertIdentifier(complaintId, 'complaint');
  const query = governmentComplaintSlaQuerySchema.parse({ scopeRoleAssignmentId });
  const parameters = new URLSearchParams();
  if (query.scopeRoleAssignmentId) {
    parameters.set('scopeRoleAssignmentId', query.scopeRoleAssignmentId);
  }
  const search = parameters.toString();
  return createGovernmentApiClient(accessToken).get(
    `/api/v1/government/accountability/complaints/${complaintId}/sla${
      search === '' ? '' : `?${search}`
    }`,
    { decode: decodeGovernmentComplaintSlaSummary },
  );
};

export const getUserFacingKpiError = (error: unknown): string => {
  if (error instanceof ApiError && error.status === 403) {
    return 'Your current government role does not permit these organizational KPI snapshots.';
  }
  return getUserFacingApiError(error);
};
