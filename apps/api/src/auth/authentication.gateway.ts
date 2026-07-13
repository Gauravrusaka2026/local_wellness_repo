import type { AuthenticatedUser } from '@local-wellness/types';

export class AuthenticationProviderUnavailableError extends Error {
  public constructor() {
    super('The authentication provider is unavailable.');
    this.name = 'AuthenticationProviderUnavailableError';
  }
}

export class GovernmentInvitationConflictError extends Error {
  public constructor() {
    super('The government user cannot be invited with this email address.');
    this.name = 'GovernmentInvitationConflictError';
  }
}

export interface InvitedAuthenticationUser {
  email: string;
  id: string;
}

export abstract class AuthenticationGateway {
  public abstract deleteInvitedUser(userId: string): Promise<void>;

  public abstract inviteGovernmentUser(
    email: string,
    redirectUrl: string,
  ): Promise<InvitedAuthenticationUser>;

  public abstract verifyAccessToken(accessToken: string): Promise<AuthenticatedUser | null>;
}
