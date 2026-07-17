import type {
  CreateGovernmentInvitationInput,
  GovernmentInvitation,
  GovernmentInvitationOptions,
} from '@local-wellness/types';

import { apiRequest } from './client';

export type GovernmentInvitationInput = CreateGovernmentInvitationInput;
export type { GovernmentInvitation };

export const getGovernmentInvitationOptions = (
  accessToken: string,
): Promise<GovernmentInvitationOptions> =>
  apiRequest<GovernmentInvitationOptions>('/api/v1/admin/government-invitations/options', {
    accessToken,
  });

export const createGovernmentInvitation = (
  accessToken: string,
  input: GovernmentInvitationInput,
): Promise<GovernmentInvitation> =>
  apiRequest<GovernmentInvitation>('/api/v1/admin/government-invitations', {
    accessToken,
    body: input,
    method: 'POST',
  });
