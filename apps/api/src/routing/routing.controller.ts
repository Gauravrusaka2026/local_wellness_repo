import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser, RoutingResolutionResult } from '@local-wellness/types';
import {
  resolveRoutingRequestSchema,
  type ResolveRoutingRequestInput,
} from '@local-wellness/validation';

import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { Authenticated } from '../common/authenticated-user.decorator.js';
import { requireIdempotencyKey } from '../common/idempotency-key.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { RoutingService } from './routing.service.js';

@Controller('routing')
@UseGuards(BearerAuthGuard)
export class RoutingController {
  public constructor(
    @Inject(RoutingService)
    private readonly routingService: RoutingService,
  ) {}

  @Post('resolve')
  @HttpCode(HttpStatus.OK)
  public resolveRouting(
    @Authenticated() actor: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body(new ZodValidationPipe(resolveRoutingRequestSchema)) input: ResolveRoutingRequestInput,
  ): Promise<RoutingResolutionResult> {
    return this.routingService.resolveRouting({
      actor,
      input,
      idempotencyKey: requireIdempotencyKey(idempotencyKey),
    });
  }
}
