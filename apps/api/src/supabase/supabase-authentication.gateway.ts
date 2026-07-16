import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '@local-wellness/types';

import {
  AuthenticationGateway,
  AuthenticationProviderUnavailableError,
  GovernmentInvitationConflictError,
  type InvitedAuthenticationUser,
} from '../auth/authentication.gateway.js';
import { SupabaseClients } from './supabase-clients.js';

const invitationConflictCodes = new Set([
  'email_exists',
  'email_address_not_authorized',
  'user_already_exists',
]);

const isAuthenticationRejection = (status: number | undefined): boolean =>
  status === 400 || status === 401 || status === 403;

@Injectable()
export class SupabaseAuthenticationGateway extends AuthenticationGateway {
  public constructor(@Inject(SupabaseClients) private readonly clients: SupabaseClients) {
    super();
  }

  public async verifyAccessToken(accessToken: string): Promise<AuthenticatedUser | null> {
    const { data, error } = await this.clients.publicClient.auth.getUser(accessToken);

    if (error) {
      if (isAuthenticationRejection(error.status)) {
        return null;
      }

      throw new AuthenticationProviderUnavailableError();
    }

    if (!data.user) {
      return null;
    }

    const claimsResult = await this.clients.publicClient.auth.getClaims(accessToken);

    if (claimsResult.error) {
      if (isAuthenticationRejection(claimsResult.error.status)) {
        return null;
      }

      throw new AuthenticationProviderUnavailableError();
    }

    if (!claimsResult.data || claimsResult.data.claims.sub !== data.user.id) {
      return null;
    }

    return {
      assuranceLevel: claimsResult.data.claims.aal === 'aal2' ? 'aal2' : 'aal1',
      id: data.user.id,
      email: data.user.email ?? null,
      phone: data.user.phone ?? null,
    };
  }

  public async inviteGovernmentUser(
    email: string,
    redirectUrl: string,
  ): Promise<InvitedAuthenticationUser> {
    const { data, error } = await this.clients.serviceRoleClient.auth.admin.inviteUserByEmail(
      email,
      { redirectTo: redirectUrl },
    );

    if (error) {
      if (invitationConflictCodes.has(error.code ?? '') || error.status === 422) {
        throw new GovernmentInvitationConflictError();
      }

      throw new AuthenticationProviderUnavailableError();
    }

    return {
      id: data.user.id,
      email: data.user.email ?? email,
    };
  }

  public async deleteInvitedUser(userId: string): Promise<void> {
    const { error } = await this.clients.serviceRoleClient.auth.admin.deleteUser(userId);

    if (error) {
      throw new AuthenticationProviderUnavailableError();
    }
  }
}
