import { createHash } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import type { Device, RegisterDeviceInput, RevokedDevice } from '@local-wellness/types';

import { ApiException } from '../common/api-exception.js';
import { Clock } from '../common/clock.js';
import { IdentityStore } from '../data/identity.store.js';

@Injectable()
export class DevicesService {
  public constructor(
    @Inject(IdentityStore)
    private readonly identityStore: IdentityStore,
    @Inject(Clock)
    private readonly clock: Clock,
  ) {}

  public listDevices(userId: string): Promise<Device[]> {
    return this.identityStore.listDevices(userId);
  }

  public async registerDevice(userId: string, input: RegisterDeviceInput): Promise<Device> {
    const now = this.clock.now().toISOString();
    return this.identityStore.upsertDevice(userId, {
      ...(input.appVersion === undefined ? {} : { appVersion: input.appVersion }),
      deviceIdentifierHash: createHash('sha256')
        .update(input.deviceIdentifier, 'utf8')
        .digest('hex'),
      lastSeenAt: now,
      platform: input.platform,
      ...(input.pushToken === undefined ? {} : { pushToken: input.pushToken }),
    });
  }

  public async revokeDevice(userId: string, deviceId: string): Promise<RevokedDevice> {
    const device = await this.identityStore.revokeDevice(
      userId,
      deviceId,
      this.clock.now().toISOString(),
    );

    if (!device?.revokedAt) {
      throw ApiException.notFound('DEVICE_NOT_FOUND', 'The device was not found.');
    }

    return {
      id: device.id,
      revokedAt: device.revokedAt,
    };
  }
}
