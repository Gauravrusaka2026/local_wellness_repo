import { Inject, Injectable } from '@nestjs/common';
import type { GovernmentAccessScope, UserAccess } from '@local-wellness/types';

import { ApiException } from '../common/api-exception.js';
import { Clock } from '../common/clock.js';
import { IdentityStore } from '../data/identity.store.js';

@Injectable()
export class AccessService {
  public constructor(
    @Inject(IdentityStore)
    private readonly identityStore: IdentityStore,
    @Inject(Clock)
    private readonly clock: Clock,
  ) {}

  public getUserAccess(userId: string): Promise<UserAccess> {
    return this.identityStore.findActiveAccess(userId, this.clock.now().toISOString());
  }

  public async getGovernmentAccessScope(userId: string): Promise<GovernmentAccessScope> {
    const [profile, access] = await Promise.all([
      this.identityStore.findProfile(userId),
      this.getUserAccess(userId),
    ]);

    if (profile?.status !== 'active') {
      throw ApiException.accessDenied('An active account is required for government access.');
    }

    const activeAuthorityIds = new Set(
      access.authorities.map((membership) => membership.authorityId),
    );
    const governmentRoles = access.roles.filter(
      (role) =>
        (role.isGovernment || role.code === 'platform_admin') &&
        (role.scopeType === 'global' ||
          (role.authorityId !== null && activeAuthorityIds.has(role.authorityId))),
    );

    if (governmentRoles.length === 0) {
      throw ApiException.accessDenied('An active government role is required.');
    }

    const hasGlobalRole = governmentRoles.some((role) => role.scopeType === 'global');
    const authorityIds = new Set(
      governmentRoles.flatMap((role) => {
        const authorityId =
          role.authorityId ?? (role.scopeType === 'authority' ? role.scopeId : null);

        return authorityId ? [authorityId] : [];
      }),
    );

    return {
      roles: governmentRoles,
      authorities: hasGlobalRole
        ? access.authorities
        : access.authorities.filter((membership) => authorityIds.has(membership.authorityId)),
    };
  }
}
