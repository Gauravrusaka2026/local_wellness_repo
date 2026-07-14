import { Body, Controller, HttpCode, HttpStatus, Inject, Post, UseGuards } from '@nestjs/common';
import type { RoutingAssetDiscoveryResult } from '@local-wellness/types';
import {
  discoverRoutingAssetsRequestSchema,
  type DiscoverRoutingAssetsRequestInput,
} from '@local-wellness/validation';

import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AssetsService } from './assets.service.js';

@Controller('routing/assets')
@UseGuards(BearerAuthGuard)
export class AssetsController {
  public constructor(
    @Inject(AssetsService)
    private readonly assetsService: AssetsService,
  ) {}

  @Post('nearby')
  @HttpCode(HttpStatus.OK)
  public discoverAssets(
    @Body(new ZodValidationPipe(discoverRoutingAssetsRequestSchema))
    input: DiscoverRoutingAssetsRequestInput,
  ): Promise<RoutingAssetDiscoveryResult> {
    return this.assetsService.discoverAssets(input);
  }
}
