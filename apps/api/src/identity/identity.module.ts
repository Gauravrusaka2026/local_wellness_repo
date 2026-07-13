import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { AccessController } from './access.controller.js';
import { AccessService } from './access.service.js';
import { DevicesController } from './devices.controller.js';
import { DevicesService } from './devices.service.js';
import { ProfilesController } from './profiles.controller.js';
import { ProfilesService } from './profiles.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AccessController, DevicesController, ProfilesController],
  providers: [AccessService, DevicesService, ProfilesService],
})
// Nest uses the decorated class itself as the module token.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class IdentityModule {}
