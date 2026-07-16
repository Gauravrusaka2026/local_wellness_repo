import { Controller, Get, Header, Inject, Param, Query, UseGuards } from '@nestjs/common';
import type {
  AuthenticatedUser,
  GovernmentComplaintSlaSummary,
  GovernmentKpiSnapshotResult,
} from '@local-wellness/types';
import {
  governmentComplaintSlaParametersSchema,
  governmentComplaintSlaQuerySchema,
  governmentKpiQuerySchema,
  type GovernmentComplaintSlaParameters,
  type GovernmentComplaintSlaQueryInput,
  type GovernmentKpiQueryInput,
} from '@local-wellness/validation';

import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { Authenticated } from '../common/authenticated-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AccountabilityService } from './accountability.service.js';

@Controller('government/accountability')
@UseGuards(BearerAuthGuard)
export class AccountabilityController {
  public constructor(
    @Inject(AccountabilityService) private readonly service: AccountabilityService,
  ) {}

  @Get('complaints/:complaintId/sla')
  @Header('Cache-Control', 'private, no-store')
  public getComplaintSla(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(governmentComplaintSlaParametersSchema))
    parameters: GovernmentComplaintSlaParameters,
    @Query(new ZodValidationPipe(governmentComplaintSlaQuerySchema))
    query: GovernmentComplaintSlaQueryInput,
  ): Promise<GovernmentComplaintSlaSummary> {
    return this.service.getComplaintSla(
      actor.id,
      parameters.complaintId,
      query.scopeRoleAssignmentId,
    );
  }

  @Get('kpis')
  @Header('Cache-Control', 'private, no-store')
  public listKpiSnapshots(
    @Authenticated() actor: AuthenticatedUser,
    @Query(new ZodValidationPipe(governmentKpiQuerySchema)) query: GovernmentKpiQueryInput,
  ): Promise<GovernmentKpiSnapshotResult> {
    return this.service.listKpiSnapshots(actor.id, query);
  }
}
