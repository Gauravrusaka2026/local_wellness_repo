import { Inject, Injectable } from '@nestjs/common';
import type { JurisdictionResolution, ResolveJurisdictionRequest } from '@local-wellness/types';

import { ApiException } from '../common/api-exception.js';
import { Clock } from '../common/clock.js';
import { RoutingStore } from '../data/routing.store.js';

@Injectable()
export class JurisdictionsService {
  public constructor(
    @Inject(RoutingStore)
    private readonly routingStore: RoutingStore,
    @Inject(Clock)
    private readonly clock: Clock,
  ) {}

  public resolveJurisdiction(input: ResolveJurisdictionRequest): Promise<JurisdictionResolution> {
    const resolvedAt = this.clock.now();

    if (Date.parse(input.capturedAt) > resolvedAt.getTime() + 120_000) {
      throw ApiException.badRequest(
        'LOCATION_CAPTURED_IN_FUTURE',
        'The location capture time is too far in the future.',
      );
    }

    return this.routingStore.resolveJurisdiction({
      location: {
        latitude: input.latitude,
        longitude: input.longitude,
      },
      accuracyMeters: input.accuracyMeters,
      resolvedAt: resolvedAt.toISOString(),
    });
  }
}
