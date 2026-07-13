import { Module } from '@nestjs/common';

import { AuthAuditController } from './auth-audit.controller.js';
import { AuthAuditService } from './auth-audit.service.js';
import { BearerAuthGuard } from './bearer-auth.guard.js';

@Module({
  controllers: [AuthAuditController],
  providers: [AuthAuditService, BearerAuthGuard],
  exports: [BearerAuthGuard],
})
// Nest uses the decorated class itself as the module token.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AuthModule {}
