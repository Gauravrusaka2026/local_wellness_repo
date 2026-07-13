import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { GovernmentInvitationsController } from './government-invitations.controller.js';
import { GovernmentInvitationsService } from './government-invitations.service.js';

@Module({
  imports: [AuthModule],
  controllers: [GovernmentInvitationsController],
  providers: [GovernmentInvitationsService],
})
// Nest uses the decorated class itself as the module token.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AdminModule {}
