import { Inject, Injectable, Logger } from '@nestjs/common';
import type { RoutingAssetDiscoveryResult } from '@local-wellness/types';
import type { DiscoverRoutingAssetsRequestInput } from '@local-wellness/validation';

import { ApiException } from '../common/api-exception.js';
import { Clock } from '../common/clock.js';
import { RoutingStore } from '../data/routing.store.js';

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  public constructor(
    @Inject(RoutingStore)
    private readonly routingStore: RoutingStore,
    @Inject(Clock)
    private readonly clock: Clock,
  ) {}

  public async discoverAssets(
    input: DiscoverRoutingAssetsRequestInput,
  ): Promise<RoutingAssetDiscoveryResult> {
    const category = await this.routingStore.findRoutingCategory(input.categoryId);

    if (!category) {
      throw ApiException.notFound(
        'ROUTING_CATEGORY_NOT_FOUND',
        'The routing category was not found.',
      );
    }

    if (!category.requiresAsset) {
      throw ApiException.badRequest(
        'ROUTING_ASSET_NOT_REQUIRED',
        'This routing category does not require an asset selection.',
      );
    }

    const resolvedAt = this.clock.now();
    if (Date.parse(input.capturedAt) > resolvedAt.getTime() + 120_000) {
      throw ApiException.badRequest(
        'LOCATION_CAPTURED_IN_FUTURE',
        'The location capture time is too far in the future.',
      );
    }

    const assets = await this.routingStore.discoverRoutingAssets({
      categoryId: category.id,
      location: { latitude: input.latitude, longitude: input.longitude },
      accuracyMeters: input.accuracyMeters,
      resolvedAt: resolvedAt.toISOString(),
    });

    this.logger.log({
      event: 'routing_assets_discovered',
      categoryId: category.id,
      resultCount: assets.length,
    });

    return { categoryId: category.id, assets };
  }
}
