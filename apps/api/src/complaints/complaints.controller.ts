import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  AuthenticatedUser,
  ComplaintDetail,
  ComplaintListResult,
  ComplaintReceipt,
  ComplaintTimeline,
  SubmitComplaintInput,
} from '@local-wellness/types';
import {
  complaintDraftIdParametersSchema,
  complaintIdParametersSchema,
  complaintListQuerySchema,
  submitComplaintSchema,
  type ComplaintDraftIdParameters,
  type ComplaintIdParameters,
  type ComplaintListQueryInput,
} from '@local-wellness/validation';

import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { Authenticated } from '../common/authenticated-user.decorator.js';
import { requireIdempotencyKey } from '../common/idempotency-key.js';
import { RateLimit, rateLimitPolicies } from '../common/rate-limit.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { ComplaintsService } from './complaints.service.js';

@Controller('complaints')
@UseGuards(BearerAuthGuard)
export class ComplaintsController {
  public constructor(
    @Inject(ComplaintsService)
    private readonly complaintsService: ComplaintsService,
  ) {}

  @Post(':draftId/submit')
  @RateLimit(rateLimitPolicies.complaintSubmission)
  public submit(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(complaintDraftIdParametersSchema))
    parameters: ComplaintDraftIdParameters,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body(new ZodValidationPipe(submitComplaintSchema)) input: SubmitComplaintInput,
  ): Promise<ComplaintReceipt> {
    return this.complaintsService.submit(
      actor,
      parameters.draftId,
      input,
      requireIdempotencyKey(idempotencyKey),
    );
  }

  @Get()
  public listComplaints(
    @Authenticated() actor: AuthenticatedUser,
    @Query(new ZodValidationPipe(complaintListQuerySchema)) query: ComplaintListQueryInput,
  ): Promise<ComplaintListResult> {
    return this.complaintsService.listComplaints(actor, query);
  }

  @Get(':complaintId')
  public getComplaint(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(complaintIdParametersSchema)) parameters: ComplaintIdParameters,
  ): Promise<ComplaintDetail> {
    return this.complaintsService.getComplaint(actor, parameters.complaintId);
  }

  @Get(':complaintId/timeline')
  public getTimeline(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(complaintIdParametersSchema)) parameters: ComplaintIdParameters,
  ): Promise<ComplaintTimeline> {
    return this.complaintsService.getTimeline(actor, parameters.complaintId);
  }
}
