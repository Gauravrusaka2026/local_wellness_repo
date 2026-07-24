import {
  Inject,
  HttpStatus,
  Injectable,
  Logger,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { ApiConfiguration } from '@local-wellness/config';
import type { Profile } from '@local-wellness/types';

import { ApiException } from '../common/api-exception.js';
import type { RequestContext } from '../common/request-context.js';
import { IdentityStore } from '../data/identity.store.js';
import { API_CONFIGURATION } from '../configuration.js';
import {
  AuthenticationGateway,
  AuthenticationProviderUnavailableError,
} from './authentication.gateway.js';

const bearerTokenPattern = /^Bearer[ \t]+([^\s]+)$/iu;

type ActorAccessContext = Readonly<{
  hasVerifiedPhone: boolean;
  profile: Profile | null;
  requiresPrivilegedMfa: boolean;
}>;

@Injectable()
export class BearerAuthGuard implements CanActivate {
  private readonly actorAccessRequests = new Map<string, Promise<ActorAccessContext>>();
  private readonly logger = new Logger(BearerAuthGuard.name);

  public constructor(
    @Inject(AuthenticationGateway)
    private readonly authenticationGateway: AuthenticationGateway,
    @Inject(IdentityStore)
    private readonly identityStore: IdentityStore,
    @Inject(API_CONFIGURATION)
    private readonly configuration: ApiConfiguration,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestContext>();
    const authorization = request.headers['authorization'];

    if (typeof authorization !== 'string') {
      throw ApiException.authenticationRequired();
    }

    const match = bearerTokenPattern.exec(authorization);

    if (!match?.[1]) {
      throw ApiException.authenticationRequired();
    }

    let user;

    try {
      user = await this.authenticationGateway.verifyAccessToken(match[1]);
    } catch (error) {
      if (error instanceof AuthenticationProviderUnavailableError) {
        throw ApiException.dependencyUnavailable('Authentication is temporarily unavailable.');
      }

      throw error;
    }

    if (!user) {
      throw ApiException.authenticationRequired('The bearer token is invalid or expired.');
    }

    const actorAccess = await this.loadActorAccess(user.id);
    const profile = actorAccess.profile;

    if (!profile) {
      throw new ApiException(403, 'ACCOUNT_UNAVAILABLE', 'The account profile is unavailable.');
    }

    if (profile.status !== 'active' && profile.status !== 'pending') {
      throw new ApiException(403, 'ACCOUNT_INACTIVE', 'This account is not active.');
    }

    const requiresPrivilegedMfa = actorAccess.requiresPrivilegedMfa;

    if (requiresPrivilegedMfa && user.assuranceLevel !== 'aal2') {
      if (this.configuration.privilegedMfaMode === 'enforce') {
        throw new ApiException(
          HttpStatus.FORBIDDEN,
          'MFA_REQUIRED',
          'Multi-factor authentication is required for this account.',
        );
      }

      this.logger.warn(
        `Privileged request ${request.requestId ?? 'unavailable'} is below AAL2 while MFA is in observe mode.`,
      );
    }

    if (!requiresPrivilegedMfa) {
      if (!actorAccess.hasVerifiedPhone) {
        if (this.configuration.citizenPhoneVerificationMode === 'enforce') {
          throw new ApiException(
            HttpStatus.FORBIDDEN,
            'PHONE_VERIFICATION_REQUIRED',
            'A verified phone number is required for this account.',
          );
        }

        this.logger.warn(
          `Citizen request ${request.requestId ?? 'unavailable'} lacks a verified phone while phone verification is in observe mode.`,
        );
      }
    }

    request.authenticatedUser = user;
    return true;
  }

  private loadActorAccess(userId: string): Promise<ActorAccessContext> {
    const inFlightRequest = this.actorAccessRequests.get(userId);
    if (inFlightRequest) return inFlightRequest;

    const request = this.queryActorAccess(userId);
    this.actorAccessRequests.set(userId, request);
    const clearRequest = (): void => {
      if (this.actorAccessRequests.get(userId) === request) {
        this.actorAccessRequests.delete(userId);
      }
    };
    void request.then(clearRequest, clearRequest);
    return request;
  }

  private async queryActorAccess(userId: string): Promise<ActorAccessContext> {
    const [profile, requiresPrivilegedMfa] = await Promise.all([
      this.identityStore.findProfile(userId),
      this.identityStore.userRequiresPrivilegedMfa(userId, new Date().toISOString()),
    ]);
    const hasVerifiedPhone = requiresPrivilegedMfa
      ? false
      : await this.identityStore.userHasVerifiedPhone(userId);

    return { hasVerifiedPhone, profile, requiresPrivilegedMfa };
  }
}
