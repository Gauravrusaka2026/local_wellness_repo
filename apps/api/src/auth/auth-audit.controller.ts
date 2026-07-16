import { Body, Controller, HttpCode, HttpStatus, Inject, Post, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser, RecordedAuthAuditEvent } from '@local-wellness/types';
import {
  recordAuthAuditEventSchema,
  type RecordAuthAuditEventRequest,
} from '@local-wellness/validation';

import { Authenticated } from '../common/authenticated-user.decorator.js';
import { RateLimit, rateLimitPolicies } from '../common/rate-limit.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { BearerAuthGuard } from './bearer-auth.guard.js';
import { AuthAuditService } from './auth-audit.service.js';

@Controller('auth/audit-events')
@UseGuards(BearerAuthGuard)
export class AuthAuditController {
  public constructor(
    @Inject(AuthAuditService) private readonly authAuditService: AuthAuditService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RateLimit(rateLimitPolicies.authAuditAppend)
  public recordEvent(
    @Authenticated() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(recordAuthAuditEventSchema)) input: RecordAuthAuditEventRequest,
  ): Promise<RecordedAuthAuditEvent> {
    return this.authAuditService.recordClientEvent(user.id, input);
  }
}
