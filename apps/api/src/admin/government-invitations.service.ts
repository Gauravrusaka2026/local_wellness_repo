import { Inject, Injectable, Logger } from '@nestjs/common';
import type { CreateGovernmentInvitationInput, GovernmentInvitation } from '@local-wellness/types';
import { governmentInvitationRoleScopes } from '@local-wellness/types';

import {
  AuthenticationGateway,
  AuthenticationProviderUnavailableError,
  GovernmentInvitationConflictError,
} from '../auth/authentication.gateway.js';
import { ApiException } from '../common/api-exception.js';
import { Clock } from '../common/clock.js';
import { API_CONFIGURATION } from '../configuration.js';
import { IdentityStore, type RoleDefinition } from '../data/identity.store.js';
import type { ApiConfiguration } from '@local-wellness/config';

interface InvitationAuthorization {
  targetRole: RoleDefinition;
}

@Injectable()
export class GovernmentInvitationsService {
  private readonly logger = new Logger(GovernmentInvitationsService.name);

  public constructor(
    @Inject(IdentityStore)
    private readonly identityStore: IdentityStore,
    @Inject(AuthenticationGateway)
    private readonly authenticationGateway: AuthenticationGateway,
    @Inject(Clock)
    private readonly clock: Clock,
    @Inject(API_CONFIGURATION) private readonly configuration: ApiConfiguration,
  ) {}

  public async createInvitation(
    actorUserId: string,
    input: CreateGovernmentInvitationInput,
  ): Promise<GovernmentInvitation> {
    const effectiveFrom = this.clock.now().toISOString();
    let authorization: InvitationAuthorization;
    let scopeId: string;

    try {
      const requestedScopeId =
        input.scopeType === 'authority' ? (input.scopeId ?? input.authorityId) : input.scopeId;

      if (
        !requestedScopeId ||
        (input.scopeType === 'authority' && requestedScopeId !== input.authorityId)
      ) {
        throw new ApiException(400, 'ROLE_SCOPE_INVALID', 'The requested role scope is invalid.');
      }

      scopeId = requestedScopeId;
      authorization = await this.authorizeInvitation(
        actorUserId,
        input.authorityId,
        input.roleCode,
        input.scopeType,
        effectiveFrom,
      );

      if (
        input.effectiveUntil &&
        (!Number.isFinite(Date.parse(input.effectiveUntil)) ||
          Date.parse(input.effectiveUntil) <= Date.parse(effectiveFrom))
      ) {
        throw new ApiException(400, 'VALIDATION_ERROR', 'The role expiry must be in the future.');
      }
    } catch (error) {
      await this.recordFailedInvitation(
        actorUserId,
        input.authorityId,
        input.roleCode,
        'authorization',
      );
      throw error;
    }

    let invitedUser;

    try {
      invitedUser = await this.authenticationGateway.inviteGovernmentUser(
        input.email,
        this.configuration.governmentInviteRedirectUrl,
      );
    } catch (error) {
      await this.recordFailedInvitation(
        actorUserId,
        input.authorityId,
        input.roleCode,
        'auth_invitation',
      );

      if (error instanceof GovernmentInvitationConflictError) {
        throw ApiException.conflict(
          'GOVERNMENT_INVITATION_CONFLICT',
          'A government invitation cannot be created for this email address.',
        );
      }

      if (error instanceof AuthenticationProviderUnavailableError) {
        throw ApiException.dependencyUnavailable(
          'The government invitation service is temporarily unavailable.',
        );
      }

      throw error;
    }

    let persistedInvitation;

    try {
      persistedInvitation = await this.identityStore.persistGovernmentInvitation({
        actorUserId,
        authorityId: input.authorityId,
        effectiveFrom,
        effectiveUntil: input.effectiveUntil ?? null,
        email: invitedUser.email,
        invitedUserId: invitedUser.id,
        role: authorization.targetRole,
        scopeId,
        scopeType: input.scopeType,
      });
    } catch {
      let reconciledInvitation = null;

      try {
        reconciledInvitation = await this.identityStore.findGovernmentInvitation(
          invitedUser.id,
          input.authorityId,
          authorization.targetRole.id,
          input.scopeType,
          scopeId,
        );
      } catch {
        // The Auth-user deletion below also cascades any committed Phase 1 identity rows.
      }

      if (reconciledInvitation) {
        persistedInvitation = reconciledInvitation;
      } else {
        await this.recordFailedInvitation(
          actorUserId,
          input.authorityId,
          input.roleCode,
          'persistence',
          invitedUser.id,
        );

        try {
          await this.authenticationGateway.deleteInvitedUser(invitedUser.id);
        } catch (rollbackError) {
          if (rollbackError instanceof AuthenticationProviderUnavailableError) {
            throw ApiException.dependencyUnavailable(
              'The invitation could not be completed and its rollback requires operator review.',
            );
          }

          throw rollbackError;
        }

        throw ApiException.dependencyUnavailable(
          'The invitation could not be persisted and was rolled back.',
        );
      }
    }

    return {
      userId: invitedUser.id,
      email: invitedUser.email,
      authorityId: input.authorityId,
      roleCode: input.roleCode,
      scopeType: input.scopeType,
      scopeId,
      membershipId: persistedInvitation.membershipId,
      roleAssignmentId: persistedInvitation.roleAssignmentId,
      authInvitationStatus: 'invited',
      membershipStatus: 'active',
      roleStatus: 'active',
    };
  }

  private async authorizeInvitation(
    actorUserId: string,
    authorityId: string,
    roleCode: CreateGovernmentInvitationInput['roleCode'],
    scopeType: CreateGovernmentInvitationInput['scopeType'],
    at: string,
  ): Promise<InvitationAuthorization> {
    const [actorProfile, access, targetRole] = await Promise.all([
      this.identityStore.findProfile(actorUserId),
      this.identityStore.findActiveAccess(actorUserId, at),
      this.identityStore.findRoleByCode(roleCode),
    ]);

    if (actorProfile?.status !== 'active') {
      throw ApiException.accessDenied('An active administrator account is required.');
    }

    if (!targetRole?.isGovernment || targetRole.code === 'platform_admin') {
      throw ApiException.accessDenied('The requested government role cannot be assigned.');
    }

    const requiredScopeType = governmentInvitationRoleScopes[roleCode];

    if (scopeType !== requiredScopeType) {
      throw new ApiException(
        400,
        'ROLE_SCOPE_INVALID',
        `The ${targetRole.code} role requires ${requiredScopeType} scope.`,
      );
    }

    const actorIsPlatformAdmin = access.roles.some(
      (role) => role.code === 'platform_admin' && role.scopeType === 'global',
    );
    const hasMatchingMembership = access.authorities.some(
      (membership) => membership.authorityId === authorityId,
    );
    const actorIsMatchingMunicipalAdmin = access.roles.some(
      (role) =>
        role.code === 'municipal_admin' &&
        role.scopeType === 'authority' &&
        role.scopeId === authorityId,
    );

    if (!actorIsPlatformAdmin && !(actorIsMatchingMunicipalAdmin && hasMatchingMembership)) {
      throw ApiException.accessDenied(
        'An active administrator role for this authority is required.',
      );
    }

    if (targetRole.isPrivileged && !actorIsPlatformAdmin) {
      throw ApiException.accessDenied('Only a platform administrator may grant privileged roles.');
    }

    return { targetRole };
  }

  private async recordFailedInvitation(
    actorUserId: string,
    authorityId: string,
    roleCode: string,
    failureStage: 'authorization' | 'auth_invitation' | 'persistence',
    subjectUserId: string | null = null,
  ): Promise<void> {
    try {
      await this.identityStore.appendAuthAuditEvent({
        actorUserId,
        authorityId,
        eventType: 'government_invitation_failed',
        metadata: { failureStage, roleCode },
        outcome: 'failure',
        subjectUserId,
      });
    } catch {
      this.logger.warn('A failed government invitation audit event could not be persisted.');
    }
  }
}
