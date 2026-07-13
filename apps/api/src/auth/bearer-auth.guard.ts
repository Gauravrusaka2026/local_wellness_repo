import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';

import { ApiException } from '../common/api-exception.js';
import type { RequestContext } from '../common/request-context.js';
import { IdentityStore } from '../data/identity.store.js';
import {
  AuthenticationGateway,
  AuthenticationProviderUnavailableError,
} from './authentication.gateway.js';

const bearerTokenPattern = /^Bearer[ \t]+([^\s]+)$/iu;

@Injectable()
export class BearerAuthGuard implements CanActivate {
  public constructor(
    @Inject(AuthenticationGateway)
    private readonly authenticationGateway: AuthenticationGateway,
    @Inject(IdentityStore)
    private readonly identityStore: IdentityStore,
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

    const profile = await this.identityStore.findProfile(user.id);

    if (!profile) {
      throw new ApiException(403, 'ACCOUNT_UNAVAILABLE', 'The account profile is unavailable.');
    }

    if (profile.status !== 'active' && profile.status !== 'pending') {
      throw new ApiException(403, 'ACCOUNT_INACTIVE', 'This account is not active.');
    }

    request.authenticatedUser = user;
    return true;
  }
}
