import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  AuthenticatedUser,
  ComplaintEvidenceAccess,
  ComplaintReopenEvidenceFinalization,
  ComplaintReopenEvidenceUploadIntent,
  ComplaintResolutionContext,
  ComplaintResolutionFeedbackInput,
  ComplaintResolutionFeedbackResult,
  CreateComplaintReopenEvidenceUploadIntentInput,
  FinalizeComplaintReopenEvidenceInput,
  GovernmentComplaintAccountability,
  ReopenComplaintInput,
  ReopenComplaintResult,
} from '@local-wellness/types';
import {
  complaintEvidenceIdParametersSchema,
  complaintIdParametersSchema,
  complaintResolutionFeedbackSchema,
  createComplaintReopenEvidenceUploadIntentSchema,
  finalizeComplaintReopenEvidenceSchema,
  governmentComplaintScopeQuerySchema,
  reopenComplaintSchema,
  type ComplaintEvidenceIdParameters,
  type ComplaintIdParameters,
  type GovernmentComplaintScopeQueryInput,
} from '@local-wellness/validation';

import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { Authenticated } from '../common/authenticated-user.decorator.js';
import { requireIdempotencyKey } from '../common/idempotency-key.js';
import { RequestIdentifier } from '../common/request-id.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CitizenResolutionService } from './citizen-resolution.service.js';

@Controller('complaints')
@UseGuards(BearerAuthGuard)
export class CitizenResolutionController {
  public constructor(
    @Inject(CitizenResolutionService)
    private readonly service: CitizenResolutionService,
  ) {}

  @Get(':complaintId/resolution-context')
  @Header('Cache-Control', 'private, no-store')
  public getResolutionContext(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(complaintIdParametersSchema))
    parameters: ComplaintIdParameters,
  ): Promise<ComplaintResolutionContext> {
    return this.service.getResolutionContext(actor.id, parameters.complaintId);
  }

  @Post(':complaintId/feedback')
  @Header('Cache-Control', 'private, no-store')
  public submitFeedback(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(complaintIdParametersSchema))
    parameters: ComplaintIdParameters,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @RequestIdentifier() requestId: string,
    @Body(new ZodValidationPipe(complaintResolutionFeedbackSchema))
    input: ComplaintResolutionFeedbackInput,
  ): Promise<ComplaintResolutionFeedbackResult> {
    return this.service.submitFeedback(
      actor.id,
      parameters.complaintId,
      input,
      requireIdempotencyKey(idempotencyKey),
      requestId,
    );
  }

  @Post(':complaintId/reopen-evidence/upload-intents')
  @Header('Cache-Control', 'private, no-store')
  public createReopenEvidenceUploadIntent(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(complaintIdParametersSchema))
    parameters: ComplaintIdParameters,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @RequestIdentifier() requestId: string,
    @Body(new ZodValidationPipe(createComplaintReopenEvidenceUploadIntentSchema))
    input: CreateComplaintReopenEvidenceUploadIntentInput,
  ): Promise<ComplaintReopenEvidenceUploadIntent> {
    return this.service.createReopenEvidenceUploadIntent(
      actor.id,
      parameters.complaintId,
      input,
      requireIdempotencyKey(idempotencyKey),
      requestId,
    );
  }

  @Post(':complaintId/reopen-evidence/:evidenceId/finalize')
  @Header('Cache-Control', 'private, no-store')
  public finalizeReopenEvidence(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(complaintEvidenceIdParametersSchema))
    parameters: ComplaintEvidenceIdParameters,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @RequestIdentifier() requestId: string,
    @Body(new ZodValidationPipe(finalizeComplaintReopenEvidenceSchema))
    input: FinalizeComplaintReopenEvidenceInput,
  ): Promise<ComplaintReopenEvidenceFinalization> {
    return this.service.finalizeReopenEvidence(
      actor.id,
      parameters.complaintId,
      parameters.evidenceId,
      input,
      requireIdempotencyKey(idempotencyKey),
      requestId,
    );
  }

  @Post(':complaintId/evidence/:evidenceId/access')
  @Header('Cache-Control', 'private, no-store')
  public createEvidenceAccess(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(complaintEvidenceIdParametersSchema))
    parameters: ComplaintEvidenceIdParameters,
  ): Promise<ComplaintEvidenceAccess> {
    return this.service.createEvidenceAccess(
      actor.id,
      parameters.complaintId,
      parameters.evidenceId,
    );
  }

  @Post(':complaintId/reopen')
  @Header('Cache-Control', 'private, no-store')
  public reopenComplaint(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(complaintIdParametersSchema))
    parameters: ComplaintIdParameters,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @RequestIdentifier() requestId: string,
    @Body(new ZodValidationPipe(reopenComplaintSchema)) input: ReopenComplaintInput,
  ): Promise<ReopenComplaintResult> {
    return this.service.reopenComplaint(
      actor.id,
      parameters.complaintId,
      input,
      requireIdempotencyKey(idempotencyKey),
      requestId,
    );
  }
}

@Controller('government/complaints')
@UseGuards(BearerAuthGuard)
export class GovernmentComplaintAccountabilityController {
  public constructor(
    @Inject(CitizenResolutionService)
    private readonly service: CitizenResolutionService,
  ) {}

  @Get(':complaintId/accountability')
  @Header('Cache-Control', 'private, no-store')
  public getAccountability(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(complaintIdParametersSchema))
    parameters: ComplaintIdParameters,
    @Query(new ZodValidationPipe(governmentComplaintScopeQuerySchema))
    query: GovernmentComplaintScopeQueryInput,
  ): Promise<GovernmentComplaintAccountability> {
    return this.service.getGovernmentAccountability(
      actor.id,
      parameters.complaintId,
      query.scopeRoleAssignmentId,
    );
  }
}
