import {
  accessScopeTypes,
  authorityMembershipStatuses,
  type AccessRole,
  type AccessScopeType,
  type AuthorityMembership,
  type GovernmentAccessScope,
} from '@local-wellness/types';

import { apiRequest } from './client';

export type { GovernmentAccessScope };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

const decodeRole = (value: unknown): AccessRole => {
  if (
    !isRecord(value) ||
    typeof value['assignmentId'] !== 'string' ||
    !isNullableString(value['authorityId']) ||
    typeof value['roleId'] !== 'string' ||
    typeof value['code'] !== 'string' ||
    typeof value['name'] !== 'string' ||
    !isNullableString(value['description']) ||
    typeof value['isGovernment'] !== 'boolean' ||
    typeof value['isPrivileged'] !== 'boolean' ||
    !accessScopeTypes.includes(value['scopeType'] as AccessScopeType) ||
    !isNullableString(value['scopeId']) ||
    typeof value['effectiveFrom'] !== 'string' ||
    !isNullableString(value['effectiveUntil'])
  ) {
    throw new TypeError('Invalid government role response.');
  }

  return {
    assignmentId: value['assignmentId'],
    authorityId: value['authorityId'],
    code: value['code'],
    description: value['description'],
    effectiveFrom: value['effectiveFrom'],
    effectiveUntil: value['effectiveUntil'],
    isGovernment: value['isGovernment'],
    isPrivileged: value['isPrivileged'],
    name: value['name'],
    roleId: value['roleId'],
    scopeId: value['scopeId'],
    scopeType: value['scopeType'] as AccessScopeType,
  };
};

const decodeMembership = (value: unknown): AuthorityMembership => {
  if (
    !isRecord(value) ||
    typeof value['membershipId'] !== 'string' ||
    typeof value['authorityId'] !== 'string' ||
    !authorityMembershipStatuses.includes(value['status'] as AuthorityMembership['status']) ||
    !isNullableString(value['invitationEmail']) ||
    typeof value['effectiveFrom'] !== 'string' ||
    !isNullableString(value['effectiveUntil'])
  ) {
    throw new TypeError('Invalid government membership response.');
  }

  return {
    authorityId: value['authorityId'],
    effectiveFrom: value['effectiveFrom'],
    effectiveUntil: value['effectiveUntil'],
    invitationEmail: value['invitationEmail'],
    membershipId: value['membershipId'],
    status: value['status'] as AuthorityMembership['status'],
  };
};

export const decodeGovernmentAccessScope = (value: unknown): GovernmentAccessScope => {
  if (!isRecord(value) || !Array.isArray(value['roles']) || !Array.isArray(value['authorities'])) {
    throw new TypeError('Invalid government access response.');
  }

  return {
    authorities: value['authorities'].map(decodeMembership),
    roles: value['roles'].map(decodeRole),
  };
};

export const getGovernmentAccessScope = (accessToken: string): Promise<GovernmentAccessScope> =>
  apiRequest('/api/v1/government/access-scope', {
    accessToken,
    decode: decodeGovernmentAccessScope,
  });

export const hasGovernmentAccess = (scope: GovernmentAccessScope): boolean =>
  scope.roles.length > 0;

export const getScopeTypeLabel = (scopeType: AccessScopeType): string => {
  const labels: Readonly<Record<AccessScopeType, string>> = {
    authority: 'Municipal authority',
    department: 'Department',
    global: 'Platform',
    ward: 'Ward',
  };

  return labels[scopeType];
};
