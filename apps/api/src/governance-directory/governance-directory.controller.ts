import { Body, Controller, HttpCode, HttpStatus, Inject, Post, UseGuards } from '@nestjs/common';
import type { GoverningBodyResolution } from '@local-wellness/types';
import {
  resolveGoverningBodiesRequestSchema,
  type ResolveGoverningBodiesRequestInput,
} from '@local-wellness/validation';

import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { GovernanceDirectoryService } from './governance-directory.service.js';

@Controller('governance/bodies')
@UseGuards(BearerAuthGuard)
export class GovernanceDirectoryController {
  public constructor(
    @Inject(GovernanceDirectoryService)
    private readonly service: GovernanceDirectoryService,
  ) {}

  @Post('resolve')
  @HttpCode(HttpStatus.OK)
  public resolve(
    @Body(new ZodValidationPipe(resolveGoverningBodiesRequestSchema))
    input: ResolveGoverningBodiesRequestInput,
  ): Promise<GoverningBodyResolution> {
    return this.service.resolve(input);
  }
}
