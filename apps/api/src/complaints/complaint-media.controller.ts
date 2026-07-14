import { Body, Controller, Get, Headers, Inject, Param, Post, UseGuards } from '@nestjs/common';
import type {
  AuthenticatedUser,
  ComplaintMedia,
  ComplaintMediaUploadIntent,
  CreateComplaintMediaUploadIntentInput,
  FinalizeComplaintMediaInput,
} from '@local-wellness/types';
import {
  complaintMediaIdParametersSchema,
  createComplaintMediaUploadIntentSchema,
  finalizeComplaintMediaSchema,
  type ComplaintMediaIdParameters,
} from '@local-wellness/validation';

import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { Authenticated } from '../common/authenticated-user.decorator.js';
import { requireIdempotencyKey } from '../common/idempotency-key.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { ComplaintMediaService } from './complaint-media.service.js';

@Controller('media')
@UseGuards(BearerAuthGuard)
export class ComplaintMediaController {
  public constructor(
    @Inject(ComplaintMediaService)
    private readonly mediaService: ComplaintMediaService,
  ) {}

  @Post('upload-intents')
  public createUploadIntent(
    @Authenticated() actor: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body(new ZodValidationPipe(createComplaintMediaUploadIntentSchema))
    input: CreateComplaintMediaUploadIntentInput,
  ): Promise<ComplaintMediaUploadIntent> {
    return this.mediaService.createUploadIntent(
      actor,
      input,
      requireIdempotencyKey(idempotencyKey),
    );
  }

  @Post(':mediaId/finalize')
  public finalizeMedia(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(complaintMediaIdParametersSchema))
    parameters: ComplaintMediaIdParameters,
    @Body(new ZodValidationPipe(finalizeComplaintMediaSchema)) input: FinalizeComplaintMediaInput,
  ): Promise<ComplaintMedia> {
    return this.mediaService.finalizeMedia(actor, parameters.mediaId, input);
  }

  @Get(':mediaId/status')
  public getMedia(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(complaintMediaIdParametersSchema))
    parameters: ComplaintMediaIdParameters,
  ): Promise<ComplaintMedia> {
    return this.mediaService.getMedia(actor, parameters.mediaId);
  }
}
