import type { AccessScopeType, GovernmentAccessScope } from '@local-wellness/types';

import { apiRequest } from './client';

export type { GovernmentAccessScope };

export const getGovernmentAccessScope = (accessToken: string): Promise<GovernmentAccessScope> =>
  apiRequest<GovernmentAccessScope>('/api/v1/government/access-scope', { accessToken });

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
