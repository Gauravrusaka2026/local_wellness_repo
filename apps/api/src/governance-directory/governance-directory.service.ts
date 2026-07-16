import { Inject, Injectable } from '@nestjs/common';
import {
  maximumGoverningBodyAccuracyMeters,
  type GoverningBodyResolution,
  type ResolveJurisdictionRequest,
} from '@local-wellness/types';

import { ApiException } from '../common/api-exception.js';
import { Clock } from '../common/clock.js';
import { GovernanceDirectoryStore } from '../data/governance-directory.store.js';

@Injectable()
export class GovernanceDirectoryService {
  public constructor(
    @Inject(GovernanceDirectoryStore)
    private readonly store: GovernanceDirectoryStore,
    @Inject(Clock)
    private readonly clock: Clock,
  ) {}

  public async resolve(input: ResolveJurisdictionRequest): Promise<GoverningBodyResolution> {
    const resolvedAt = this.clock.now();

    if (Date.parse(input.capturedAt) > resolvedAt.getTime() + 120_000) {
      throw ApiException.badRequest(
        'LOCATION_CAPTURED_IN_FUTURE',
        'The location capture time is too far in the future.',
      );
    }

    if (input.accuracyMeters > maximumGoverningBodyAccuracyMeters) {
      return {
        status: 'low_accuracy',
        reason: 'location_accuracy_exceeds_governing_body_limit',
        maximumAccuracyMeters: maximumGoverningBodyAccuracyMeters,
        matches: [],
      };
    }

    const matches = await this.store.resolveVerifiedGoverningBodies({
      location: {
        latitude: input.latitude,
        longitude: input.longitude,
      },
      accuracyMeters: input.accuracyMeters,
      resolvedAt: resolvedAt.toISOString(),
    });

    if (matches.length === 0) {
      return {
        status: 'unsupported',
        reason: 'no_verified_governing_body_match',
        maximumAccuracyMeters: maximumGoverningBodyAccuracyMeters,
        matches,
      };
    }

    if (matches.length > 1) {
      return {
        status: 'ambiguous',
        reason: 'location_accuracy_intersects_multiple_governing_bodies',
        maximumAccuracyMeters: maximumGoverningBodyAccuracyMeters,
        matches,
      };
    }

    return {
      status: 'resolved',
      reason: 'verified_governing_body_match',
      maximumAccuracyMeters: maximumGoverningBodyAccuracyMeters,
      matches,
    };
  }
}
