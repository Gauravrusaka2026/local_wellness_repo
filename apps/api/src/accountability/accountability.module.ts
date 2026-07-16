import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { AccountabilityController } from './accountability.controller.js';
import { AccountabilityService } from './accountability.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AccountabilityController],
  providers: [AccountabilityService],
})
// Nest uses the decorated class itself as the application module token.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AccountabilityModule {}
