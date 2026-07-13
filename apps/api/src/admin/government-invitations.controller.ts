import { Body, Controller, HttpCode, HttpStatus, Inject, Post, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser, GovernmentInvitation } from '@local-wellness/types';
import {
  createGovernmentInvitationSchema,
  type CreateGovernmentInvitationRequest,
} from '@local-wellness/validation';

import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { Authenticated } from '../common/authenticated-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { GovernmentInvitationsService } from './government-invitations.service.js';

@Controller('admin/government-invitations')
@UseGuards(BearerAuthGuard)
export class GovernmentInvitationsController {
  public constructor(
    @Inject(GovernmentInvitationsService)
    private readonly governmentInvitationsService: GovernmentInvitationsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  public createInvitation(
    @Authenticated() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createGovernmentInvitationSchema))
    input: CreateGovernmentInvitationRequest,
  ): Promise<GovernmentInvitation> {
    return this.governmentInvitationsService.createInvitation(user.id, input);
  }
}
