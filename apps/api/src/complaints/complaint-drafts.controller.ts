import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type {
  AuthenticatedUser,
  ComplaintDraft,
  ComplaintDuplicateCheckResult,
  CreateComplaintDraftInput,
  UpdateComplaintDraftInput,
} from '@local-wellness/types';
import {
  complaintDraftIdParametersSchema,
  createComplaintDraftSchema,
  updateComplaintDraftSchema,
  type ComplaintDraftIdParameters,
} from '@local-wellness/validation';

import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { Authenticated } from '../common/authenticated-user.decorator.js';
import { requireIdempotencyKey } from '../common/idempotency-key.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { ComplaintDraftsService } from './complaint-drafts.service.js';
import { ComplaintDuplicatesService } from './complaint-duplicates.service.js';

@Controller('complaints/drafts')
@UseGuards(BearerAuthGuard)
export class ComplaintDraftsController {
  public constructor(
    @Inject(ComplaintDraftsService)
    private readonly draftsService: ComplaintDraftsService,
    @Inject(ComplaintDuplicatesService)
    private readonly duplicatesService: ComplaintDuplicatesService,
  ) {}

  @Post()
  public createDraft(
    @Authenticated() actor: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body(new ZodValidationPipe(createComplaintDraftSchema)) input: CreateComplaintDraftInput,
  ): Promise<ComplaintDraft> {
    return this.draftsService.createDraft(actor, input, requireIdempotencyKey(idempotencyKey));
  }

  @Post(':draftId/duplicate-check')
  public checkDuplicates(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(complaintDraftIdParametersSchema))
    parameters: ComplaintDraftIdParameters,
  ): Promise<ComplaintDuplicateCheckResult> {
    return this.duplicatesService.checkDuplicates(actor, parameters.draftId);
  }

  @Get(':draftId')
  public getDraft(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(complaintDraftIdParametersSchema))
    parameters: ComplaintDraftIdParameters,
  ): Promise<ComplaintDraft> {
    return this.draftsService.getDraft(actor, parameters.draftId);
  }

  @Patch(':draftId')
  public updateDraft(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(complaintDraftIdParametersSchema))
    parameters: ComplaintDraftIdParameters,
    @Body(new ZodValidationPipe(updateComplaintDraftSchema)) input: UpdateComplaintDraftInput,
  ): Promise<ComplaintDraft> {
    return this.draftsService.updateDraft(actor, parameters.draftId, input);
  }

  @Delete(':draftId')
  public discardDraft(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(complaintDraftIdParametersSchema))
    parameters: ComplaintDraftIdParameters,
  ): Promise<{ discarded: true }> {
    return this.draftsService.discardDraft(actor, parameters.draftId);
  }
}
