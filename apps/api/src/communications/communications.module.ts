import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { CommunicationsController } from './communications.controller.js';
import { CommunicationsService } from './communications.service.js';

@Module({
  imports: [AuthModule],
  controllers: [CommunicationsController],
  providers: [CommunicationsService],
})
// Nest uses the decorated class itself as the application module token.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CommunicationsModule {}
