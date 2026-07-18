import { Body, Controller, Header, Inject, Param, Post, Put, UseGuards } from '@nestjs/common';
import type {
  AuthenticatedUser,
  PublicComplaintEngagementState,
  PublicComplaintEngagementLookupInput,
  UpdatePublicComplaintEngagementInput,
} from '@local-wellness/types';
import {
  publicComplaintEngagementLookupSchema,
  publicComplaintIdParametersSchema,
  updatePublicComplaintEngagementSchema,
  type PublicComplaintIdParameters,
} from '@local-wellness/validation';

import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { Authenticated } from '../common/authenticated-user.decorator.js';
import { RateLimit, rateLimitPolicies } from '../common/rate-limit.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { TransparencyService } from './transparency.service.js';

@Controller('transparency')
@UseGuards(BearerAuthGuard)
export class TransparencyEngagementController {
  public constructor(
    @Inject(TransparencyService)
    private readonly transparency: TransparencyService,
  ) {}

  @Post('engagements/lookup')
  @Header('Cache-Control', 'no-store')
  @RateLimit(rateLimitPolicies.communityEngagementRead)
  public listEngagements(
    @Authenticated() actor: AuthenticatedUser,
    @Body(new ZodValidationPipe(publicComplaintEngagementLookupSchema))
    input: PublicComplaintEngagementLookupInput,
  ): Promise<PublicComplaintEngagementState[]> {
    return this.transparency.listEngagements(actor.id, input.publicIds);
  }

  @Put('complaints/:publicId/engagement')
  @Header('Cache-Control', 'no-store')
  @RateLimit(rateLimitPolicies.communityEngagementMutation)
  public setEngagement(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(publicComplaintIdParametersSchema))
    parameters: PublicComplaintIdParameters,
    @Body(new ZodValidationPipe(updatePublicComplaintEngagementSchema))
    input: UpdatePublicComplaintEngagementInput,
  ): Promise<PublicComplaintEngagementState> {
    return this.transparency.setEngagement(actor.id, parameters.publicId, input);
  }
}
