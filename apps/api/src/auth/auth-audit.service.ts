import { Inject, Injectable } from '@nestjs/common';
import type {
  RecordClientAuthAuditEventInput,
  RecordedAuthAuditEvent,
} from '@local-wellness/types';

import { ApiException } from '../common/api-exception.js';
import { Clock } from '../common/clock.js';
import { IdentityStore } from '../data/identity.store.js';

@Injectable()
export class AuthAuditService {
  public constructor(
    @Inject(IdentityStore)
    private readonly identityStore: IdentityStore,
    @Inject(Clock)
    private readonly clock: Clock,
  ) {}

  public async recordClientEvent(
    userId: string,
    input: RecordClientAuthAuditEventInput,
  ): Promise<RecordedAuthAuditEvent> {
    if (input.deviceId && !(await this.identityStore.deviceBelongsToUser(input.deviceId, userId))) {
      throw ApiException.accessDenied('The device does not belong to the authenticated user.');
    }

    if (input.authorityId) {
      const access = await this.identityStore.findActiveAccess(
        userId,
        this.clock.now().toISOString(),
      );

      if (!access.authorities.some((membership) => membership.authorityId === input.authorityId)) {
        throw ApiException.accessDenied(
          'The authority does not belong to the authenticated user scope.',
        );
      }
    }

    const metadata = {
      ...(input.metadata?.authMethod === undefined
        ? {}
        : { authMethod: input.metadata.authMethod }),
      ...(input.metadata?.clientSurface === undefined
        ? {}
        : { clientSurface: input.metadata.clientSurface }),
      source: 'client_reported',
    };

    return this.identityStore.appendAuthAuditEvent({
      actorUserId: userId,
      ...(input.authorityId === undefined ? {} : { authorityId: input.authorityId }),
      ...(input.deviceId === undefined ? {} : { deviceId: input.deviceId }),
      eventType: input.eventType,
      metadata,
      outcome: 'success',
      subjectUserId: userId,
    });
  }
}
