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
  AcknowledgeGovernmentComplaintInput,
  AddGovernmentComplaintExternalDependencyInput,
  AddGovernmentComplaintInternalNoteInput,
  AddGovernmentComplaintWorkReferenceInput,
  AssignGovernmentComplaintInput,
  AuthenticatedUser,
  CompleteGovernmentComplaintInspectionInput,
  CreateGovernmentResolutionEvidenceUploadIntentInput,
  FinalizeGovernmentResolutionEvidenceInput,
  GovernmentComplaintActionResult,
  GovernmentComplaintAssignmentOptions,
  GovernmentComplaintDetail,
  GovernmentComplaintQueueResult,
  GovernmentResolutionEvidenceAccess,
  GovernmentResolutionEvidenceFinalization,
  GovernmentResolutionEvidenceUploadIntent,
  ResolveGovernmentComplaintExternalDependencyInput,
  ScheduleGovernmentComplaintInspectionInput,
  SubmitGovernmentComplaintResolutionInput,
  TransferGovernmentComplaintInput,
  UpdateGovernmentComplaintStatusInput,
} from '@local-wellness/types';
import {
  acknowledgeGovernmentComplaintSchema,
  addGovernmentComplaintExternalDependencySchema,
  addGovernmentComplaintInternalNoteSchema,
  addGovernmentComplaintWorkReferenceSchema,
  assignGovernmentComplaintSchema,
  completeGovernmentComplaintInspectionSchema,
  createGovernmentResolutionEvidenceUploadIntentSchema,
  finalizeGovernmentResolutionEvidenceSchema,
  governmentComplaintIdParametersSchema,
  governmentComplaintQueueQuerySchema,
  governmentComplaintScopeQuerySchema,
  governmentExternalDependencyIdParametersSchema,
  governmentInspectionIdParametersSchema,
  governmentResolutionEvidenceIdParametersSchema,
  scheduleGovernmentComplaintInspectionSchema,
  resolveGovernmentComplaintExternalDependencySchema,
  submitGovernmentComplaintResolutionSchema,
  transferGovernmentComplaintSchema,
  updateGovernmentComplaintStatusSchema,
  type GovernmentComplaintIdParameters,
  type GovernmentComplaintQueueQueryInput,
  type GovernmentComplaintScopeQueryInput,
  type GovernmentExternalDependencyIdParameters,
  type GovernmentInspectionIdParameters,
  type GovernmentResolutionEvidenceIdParameters,
} from '@local-wellness/validation';

import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { Authenticated } from '../common/authenticated-user.decorator.js';
import { requireIdempotencyKey } from '../common/idempotency-key.js';
import { RequestIdentifier } from '../common/request-id.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { GovernmentComplaintAction } from '../data/government-complaint.store.js';
import { GovernmentComplaintActionsService } from './government-complaint-actions.service.js';
import { GovernmentComplaintsService } from './government-complaints.service.js';
import { GovernmentResolutionEvidenceService } from './government-resolution-evidence.service.js';

@Controller('government/complaints')
@UseGuards(BearerAuthGuard)
export class GovernmentComplaintsController {
  public constructor(
    @Inject(GovernmentComplaintsService)
    private readonly complaints: GovernmentComplaintsService,
    @Inject(GovernmentComplaintActionsService)
    private readonly actions: GovernmentComplaintActionsService,
    @Inject(GovernmentResolutionEvidenceService)
    private readonly evidence: GovernmentResolutionEvidenceService,
  ) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  public list(
    @Authenticated() actor: AuthenticatedUser,
    @Query(new ZodValidationPipe(governmentComplaintQueueQuerySchema))
    query: GovernmentComplaintQueueQueryInput,
  ): Promise<GovernmentComplaintQueueResult> {
    return this.complaints.listComplaints(actor.id, query);
  }

  @Get(':complaintId')
  @Header('Cache-Control', 'private, no-store')
  public get(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(governmentComplaintIdParametersSchema))
    parameters: GovernmentComplaintIdParameters,
    @Query(new ZodValidationPipe(governmentComplaintScopeQuerySchema))
    query: GovernmentComplaintScopeQueryInput,
  ): Promise<GovernmentComplaintDetail> {
    return this.complaints.getComplaint(
      actor.id,
      parameters.complaintId,
      query.scopeRoleAssignmentId,
    );
  }

  @Get(':complaintId/assignment-options')
  @Header('Cache-Control', 'private, no-store')
  public listAssignmentOptions(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(governmentComplaintIdParametersSchema))
    parameters: GovernmentComplaintIdParameters,
    @Query(new ZodValidationPipe(governmentComplaintScopeQuerySchema))
    query: GovernmentComplaintScopeQueryInput,
  ): Promise<GovernmentComplaintAssignmentOptions> {
    return this.complaints.listAssignmentOptions(
      actor.id,
      parameters.complaintId,
      query.scopeRoleAssignmentId,
    );
  }

  @Post(':complaintId/acknowledge')
  @Header('Cache-Control', 'private, no-store')
  public acknowledge(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(governmentComplaintIdParametersSchema))
    parameters: GovernmentComplaintIdParameters,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @RequestIdentifier() requestId: string,
    @Body(new ZodValidationPipe(acknowledgeGovernmentComplaintSchema))
    input: AcknowledgeGovernmentComplaintInput,
  ): Promise<GovernmentComplaintActionResult> {
    return this.performAction(
      actor,
      parameters,
      { kind: 'acknowledge', input },
      idempotencyKey,
      requestId,
    );
  }

  @Post(':complaintId/assign')
  @Header('Cache-Control', 'private, no-store')
  public assign(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(governmentComplaintIdParametersSchema))
    parameters: GovernmentComplaintIdParameters,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @RequestIdentifier() requestId: string,
    @Body(new ZodValidationPipe(assignGovernmentComplaintSchema))
    input: AssignGovernmentComplaintInput,
  ): Promise<GovernmentComplaintActionResult> {
    return this.performAction(
      actor,
      parameters,
      { kind: 'assign', input },
      idempotencyKey,
      requestId,
    );
  }

  @Post(':complaintId/transfer')
  @Header('Cache-Control', 'private, no-store')
  public transfer(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(governmentComplaintIdParametersSchema))
    parameters: GovernmentComplaintIdParameters,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @RequestIdentifier() requestId: string,
    @Body(new ZodValidationPipe(transferGovernmentComplaintSchema))
    input: TransferGovernmentComplaintInput,
  ): Promise<GovernmentComplaintActionResult> {
    return this.performAction(
      actor,
      parameters,
      { kind: 'transfer', input },
      idempotencyKey,
      requestId,
    );
  }

  @Post(':complaintId/status')
  @Header('Cache-Control', 'private, no-store')
  public updateStatus(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(governmentComplaintIdParametersSchema))
    parameters: GovernmentComplaintIdParameters,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @RequestIdentifier() requestId: string,
    @Body(new ZodValidationPipe(updateGovernmentComplaintStatusSchema))
    input: UpdateGovernmentComplaintStatusInput,
  ): Promise<GovernmentComplaintActionResult> {
    return this.performAction(
      actor,
      parameters,
      { kind: 'update_status', input },
      idempotencyKey,
      requestId,
    );
  }

  @Post(':complaintId/internal-notes')
  @Header('Cache-Control', 'private, no-store')
  public addInternalNote(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(governmentComplaintIdParametersSchema))
    parameters: GovernmentComplaintIdParameters,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @RequestIdentifier() requestId: string,
    @Body(new ZodValidationPipe(addGovernmentComplaintInternalNoteSchema))
    input: AddGovernmentComplaintInternalNoteInput,
  ): Promise<GovernmentComplaintActionResult> {
    return this.performAction(
      actor,
      parameters,
      { kind: 'add_internal_note', input },
      idempotencyKey,
      requestId,
    );
  }

  @Post(':complaintId/inspections')
  @Header('Cache-Control', 'private, no-store')
  public scheduleInspection(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(governmentComplaintIdParametersSchema))
    parameters: GovernmentComplaintIdParameters,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @RequestIdentifier() requestId: string,
    @Body(new ZodValidationPipe(scheduleGovernmentComplaintInspectionSchema))
    input: ScheduleGovernmentComplaintInspectionInput,
  ): Promise<GovernmentComplaintActionResult> {
    return this.performAction(
      actor,
      parameters,
      { kind: 'schedule_inspection', input },
      idempotencyKey,
      requestId,
    );
  }

  @Post(':complaintId/inspections/:inspectionId/complete')
  @Header('Cache-Control', 'private, no-store')
  public completeInspection(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(governmentInspectionIdParametersSchema))
    parameters: GovernmentInspectionIdParameters,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @RequestIdentifier() requestId: string,
    @Body(new ZodValidationPipe(completeGovernmentComplaintInspectionSchema))
    input: CompleteGovernmentComplaintInspectionInput,
  ): Promise<GovernmentComplaintActionResult> {
    return this.actions.performAction(
      actor.id,
      parameters.complaintId,
      { kind: 'complete_inspection', inspectionId: parameters.inspectionId, input },
      requireIdempotencyKey(idempotencyKey),
      requestId,
    );
  }

  @Post(':complaintId/work-references')
  @Header('Cache-Control', 'private, no-store')
  public addWorkReference(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(governmentComplaintIdParametersSchema))
    parameters: GovernmentComplaintIdParameters,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @RequestIdentifier() requestId: string,
    @Body(new ZodValidationPipe(addGovernmentComplaintWorkReferenceSchema))
    input: AddGovernmentComplaintWorkReferenceInput,
  ): Promise<GovernmentComplaintActionResult> {
    return this.performAction(
      actor,
      parameters,
      { kind: 'add_work_reference', input },
      idempotencyKey,
      requestId,
    );
  }

  @Post(':complaintId/external-dependencies')
  @Header('Cache-Control', 'private, no-store')
  public addExternalDependency(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(governmentComplaintIdParametersSchema))
    parameters: GovernmentComplaintIdParameters,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @RequestIdentifier() requestId: string,
    @Body(new ZodValidationPipe(addGovernmentComplaintExternalDependencySchema))
    input: AddGovernmentComplaintExternalDependencyInput,
  ): Promise<GovernmentComplaintActionResult> {
    return this.performAction(
      actor,
      parameters,
      { kind: 'add_external_dependency', input },
      idempotencyKey,
      requestId,
    );
  }

  @Post(':complaintId/external-dependencies/:dependencyId/resolve')
  @Header('Cache-Control', 'private, no-store')
  public resolveExternalDependency(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(governmentExternalDependencyIdParametersSchema))
    parameters: GovernmentExternalDependencyIdParameters,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @RequestIdentifier() requestId: string,
    @Body(new ZodValidationPipe(resolveGovernmentComplaintExternalDependencySchema))
    input: ResolveGovernmentComplaintExternalDependencyInput,
  ): Promise<GovernmentComplaintActionResult> {
    return this.actions.performAction(
      actor.id,
      parameters.complaintId,
      {
        kind: 'resolve_external_dependency',
        dependencyId: parameters.dependencyId,
        input,
      },
      requireIdempotencyKey(idempotencyKey),
      requestId,
    );
  }

  @Post(':complaintId/resolution-evidence/upload-intents')
  @Header('Cache-Control', 'private, no-store')
  public createResolutionEvidenceUploadIntent(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(governmentComplaintIdParametersSchema))
    parameters: GovernmentComplaintIdParameters,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @RequestIdentifier() requestId: string,
    @Body(new ZodValidationPipe(createGovernmentResolutionEvidenceUploadIntentSchema))
    input: CreateGovernmentResolutionEvidenceUploadIntentInput,
  ): Promise<GovernmentResolutionEvidenceUploadIntent> {
    return this.evidence.createUploadIntent(
      actor.id,
      parameters.complaintId,
      input,
      requireIdempotencyKey(idempotencyKey),
      requestId,
    );
  }

  @Post(':complaintId/resolution-evidence/:evidenceId/finalize')
  @Header('Cache-Control', 'private, no-store')
  public finalizeResolutionEvidence(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(governmentResolutionEvidenceIdParametersSchema))
    parameters: GovernmentResolutionEvidenceIdParameters,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @RequestIdentifier() requestId: string,
    @Body(new ZodValidationPipe(finalizeGovernmentResolutionEvidenceSchema))
    input: FinalizeGovernmentResolutionEvidenceInput,
  ): Promise<GovernmentResolutionEvidenceFinalization> {
    return this.evidence.finalizeEvidence(
      actor.id,
      parameters.complaintId,
      parameters.evidenceId,
      input,
      requireIdempotencyKey(idempotencyKey),
      requestId,
    );
  }

  @Post(':complaintId/resolution-evidence/:evidenceId/access')
  @Header('Cache-Control', 'private, no-store')
  public createResolutionEvidenceAccess(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(governmentResolutionEvidenceIdParametersSchema))
    parameters: GovernmentResolutionEvidenceIdParameters,
    @Query(new ZodValidationPipe(governmentComplaintScopeQuerySchema))
    query: GovernmentComplaintScopeQueryInput,
  ): Promise<GovernmentResolutionEvidenceAccess> {
    return this.evidence.createReadAccess(
      actor.id,
      parameters.complaintId,
      parameters.evidenceId,
      query.scopeRoleAssignmentId,
    );
  }

  @Post(':complaintId/resolution')
  @Header('Cache-Control', 'private, no-store')
  public submitResolution(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(governmentComplaintIdParametersSchema))
    parameters: GovernmentComplaintIdParameters,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @RequestIdentifier() requestId: string,
    @Body(new ZodValidationPipe(submitGovernmentComplaintResolutionSchema))
    input: SubmitGovernmentComplaintResolutionInput,
  ): Promise<GovernmentComplaintActionResult> {
    return this.evidence.submitResolution(
      actor.id,
      parameters.complaintId,
      input,
      requireIdempotencyKey(idempotencyKey),
      requestId,
    );
  }

  private performAction(
    actor: AuthenticatedUser,
    parameters: GovernmentComplaintIdParameters,
    action: GovernmentComplaintAction,
    idempotencyKey: string | undefined,
    requestId: string,
  ): Promise<GovernmentComplaintActionResult> {
    return this.actions.performAction(
      actor.id,
      parameters.complaintId,
      action,
      requireIdempotencyKey(idempotencyKey),
      requestId,
    );
  }
}
