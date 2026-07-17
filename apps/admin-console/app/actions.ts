'use server';

import {
  governmentInvitationRoleCodes,
  governmentInvitationRoleScopes,
  type GovernmentInvitationRoleCode,
} from '@local-wellness/types';

import { getUserFacingApiError, getVerifiedAccessToken } from '../lib/api/client';
import {
  createGovernmentInvitation,
  type GovernmentInvitation,
} from '../lib/api/government-invitations';
import { createServerSupabaseClient } from '../lib/supabase/server';

export type InvitationActionState = Readonly<{
  invitation: GovernmentInvitation | null;
  message: string | null;
  status: 'error' | 'idle' | 'success';
}>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const getString = (formData: FormData, name: string): string => {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
};

const parseRoleCode = (value: string): GovernmentInvitationRoleCode | null =>
  governmentInvitationRoleCodes.includes(value as GovernmentInvitationRoleCode)
    ? (value as GovernmentInvitationRoleCode)
    : null;

export const createGovernmentInvitationAction = async (
  previousState: InvitationActionState,
  formData: FormData,
): Promise<InvitationActionState> => {
  void previousState;
  const email = getString(formData, 'email').toLowerCase();
  const authorityId = getString(formData, 'authorityId');
  const roleCode = parseRoleCode(getString(formData, 'roleCode'));
  const effectiveUntilValue = getString(formData, 'effectiveUntil');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) || email.length > 254) {
    return { invitation: null, message: 'Enter a valid official email address.', status: 'error' };
  }

  if (!UUID_PATTERN.test(authorityId)) {
    return { invitation: null, message: 'Enter a valid authority ID.', status: 'error' };
  }

  if (roleCode === null) {
    return { invitation: null, message: 'Choose a supported government role.', status: 'error' };
  }

  const scopeType = governmentInvitationRoleScopes[roleCode];
  const suppliedScopeId = getString(formData, 'scopeId');
  const scopeId = scopeType === 'authority' ? authorityId : suppliedScopeId;

  if (!UUID_PATTERN.test(scopeId)) {
    return {
      invitation: null,
      message: `Choose a valid ${scopeType} scope.`,
      status: 'error',
    };
  }

  let effectiveUntil: string | undefined;
  if (effectiveUntilValue) {
    const parsedDate = new Date(effectiveUntilValue);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.getTime() <= Date.now()) {
      return {
        invitation: null,
        message: 'Role expiry must be a valid future date and time.',
        status: 'error',
      };
    }
    effectiveUntil = parsedDate.toISOString();
  }

  try {
    const supabase = await createServerSupabaseClient();
    const accessToken = await getVerifiedAccessToken(supabase);
    const invitation = await createGovernmentInvitation(accessToken, {
      authorityId,
      email,
      roleCode,
      scopeId,
      scopeType,
      ...(effectiveUntil === undefined ? {} : { effectiveUntil }),
    });

    return {
      invitation,
      message: `Invitation created for ${invitation.email}.`,
      status: 'success',
    };
  } catch (error) {
    return {
      invitation: null,
      message: getUserFacingApiError(error),
      status: 'error',
    };
  }
};
