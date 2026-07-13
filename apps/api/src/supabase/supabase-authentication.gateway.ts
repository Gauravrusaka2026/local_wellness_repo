import { Inject, Injectable } from '@nestjs/common';

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

@Injectable()
export class SupabaseAuthenticationGateway extends AuthenticationGateway {
  public constructor(@Inject(SupabaseClients) private readonly clients: SupabaseClients) {
    super();
  }

  public async verifyAccessToken(accessToken: string) {
    const { data, error } = await this.clients.publicClient.auth.getUser(accessToken);

    if (error) {
      if (error.status === 400 || error.status === 401 || error.status === 403) {
        return null;
      }

      throw new AuthenticationProviderUnavailableError();
    }

    if (!data.user) {
      return null;
    }

    return {
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
