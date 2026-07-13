import type { GovernmentAccessScope } from '@local-wellness/types';

import { apiRequest } from './client';

export type AdminAccessScope = GovernmentAccessScope;

export const getAdminAccessScope = (accessToken: string): Promise<AdminAccessScope> =>
  apiRequest<AdminAccessScope>('/api/v1/government/access-scope', { accessToken });

export const hasPlatformAdminAccess = (scope: AdminAccessScope): boolean =>
  scope.roles.some((role) => role.code === 'platform_admin' && role.scopeType === 'global');

export const hasGovernmentInvitationAccess = (scope: AdminAccessScope): boolean => {
  if (hasPlatformAdminAccess(scope)) {
    return true;
  }

  return scope.roles.some(
    (role) =>
      role.code === 'municipal_admin' &&
      role.scopeType === 'authority' &&
      role.scopeId !== null &&
      scope.authorities.some((membership) => membership.authorityId === role.scopeId),
  );
};
