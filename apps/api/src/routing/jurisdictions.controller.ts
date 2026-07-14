import { Body, Controller, HttpCode, HttpStatus, Inject, Post, UseGuards } from '@nestjs/common';
import type { JurisdictionResolution } from '@local-wellness/types';
import {
  resolveJurisdictionRequestSchema,
  type ResolveJurisdictionRequestInput,
} from '@local-wellness/validation';

import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { JurisdictionsService } from './jurisdictions.service.js';

@Controller('jurisdictions')
@UseGuards(BearerAuthGuard)
export class JurisdictionsController {
  public constructor(
    @Inject(JurisdictionsService)
    private readonly jurisdictionsService: JurisdictionsService,
  ) {}

  @Post('resolve')
  @HttpCode(HttpStatus.OK)
  public resolveJurisdiction(
    @Body(new ZodValidationPipe(resolveJurisdictionRequestSchema))
    input: ResolveJurisdictionRequestInput,
  ): Promise<JurisdictionResolution> {
    return this.jurisdictionsService.resolveJurisdiction(input);
  }
}
