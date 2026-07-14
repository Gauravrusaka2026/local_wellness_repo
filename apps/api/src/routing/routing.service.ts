import { Inject, Injectable, Logger } from '@nestjs/common';
import { RoutingEngine } from '@local-wellness/routing-engine';
import type {
  AuthenticatedUser,
  LocationEvidence,
  RoutingDecision,
  RoutingResolutionResult,
  RoutingResolutionInput,
} from '@local-wellness/types';
import type { ResolveRoutingRequestInput } from '@local-wellness/validation';

import { ApiException } from '../common/api-exception.js';
import { Clock } from '../common/clock.js';
import { RoutingDecisionIdempotencyConflictError, RoutingStore } from '../data/routing.store.js';

export interface ResolveRoutingCommand {
  actor: AuthenticatedUser;
  input: ResolveRoutingRequestInput;
  idempotencyKey: string;
}

export interface StoredRoutingResolution {
  decisionId: string;
  result: RoutingResolutionResult;
}

export const toPublicRoutingResult = (decision: RoutingDecision): RoutingResolutionResult => {
  const resolvedJurisdiction =
    decision.explanation.jurisdiction.status === 'resolved'
      ? decision.explanation.jurisdiction.matches[0]
      : undefined;

  return {
    status: decision.status,
    categoryId: decision.categoryId,
    target: decision.target,
    confidence: {
      score: decision.confidence.score,
      band: decision.confidence.band,
    },
    explanation: {
      reason: decision.explanation.reason,
      policyId: decision.explanation.policyId,
      policyVersionId: decision.explanation.policyVersionId,
      policyVersion: decision.explanation.policyVersion,
      jurisdictionStatus: decision.explanation.jurisdiction.status,
      localBodyBoundaryVersionId: resolvedJurisdiction?.localBodyBoundaryVersionId ?? null,
      wardBoundaryVersionId: resolvedJurisdiction?.wardBoundaryVersionId ?? null,
      selectedRoutingRuleId: decision.explanation.selectedRoutingRuleId,
      selectedRoutingRuleVersionId: decision.explanation.selectedRoutingRuleVersionId,
      fallbackUsed: decision.explanation.fallbackUsed,
      fallbackDepth: decision.explanation.fallbackPath.length,
    },
  };
};

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private readonly engine: RoutingEngine;

  public constructor(
    @Inject(RoutingStore)
    private readonly routingStore: RoutingStore,
    @Inject(Clock)
    private readonly clock: Clock,
  ) {
    this.engine = new RoutingEngine(routingStore, routingStore);
  }

  public async resolveRouting(command: ResolveRoutingCommand): Promise<RoutingResolutionResult> {
    const resolution = await this.resolveStoredRouting(command);
    return resolution.result;
  }

  public async resolveStoredRouting(
    command: ResolveRoutingCommand,
  ): Promise<StoredRoutingResolution> {
    const { actor, input, idempotencyKey } = command;
    const routingCategory = await this.routingStore.findRoutingCategory(input.categoryId);

    if (!routingCategory) {
      throw ApiException.notFound(
        'ROUTING_CATEGORY_NOT_FOUND',
        'The routing category was not found.',
      );
    }

    if (routingCategory.requiresAsset && input.assetId === undefined) {
      throw ApiException.badRequest(
        'ROUTING_ASSET_REQUIRED',
        'This routing category requires an identified asset.',
      );
    }

    const replay = await this.routingStore.findRecordedRoutingDecision(actor.id, idempotencyKey);
    if (replay) {
      this.assertReplayMatches(input, replay.locationEvidence, replay.routingInput);
      return {
        decisionId: replay.id,
        result: toPublicRoutingResult(replay.decision),
      };
    }

    const resolvedAt = this.clock.now();
    if (Date.parse(input.capturedAt) > resolvedAt.getTime() + 120_000) {
      throw ApiException.badRequest(
        'LOCATION_CAPTURED_IN_FUTURE',
        'The location capture time is too far in the future.',
      );
    }

    const routingInput: RoutingResolutionInput = {
      categoryId: routingCategory.id,
      location: {
        latitude: input.latitude,
        longitude: input.longitude,
      },
      accuracyMeters: input.accuracyMeters,
      assetId: input.assetId ?? null,
      resolvedAt: resolvedAt.toISOString(),
    };
    const decision = await this.engine.resolve(routingInput);

    const recordInput = {
      actorUserId: actor.id,
      requestId: idempotencyKey,
      locationEvidence: {
        latitude: input.latitude,
        longitude: input.longitude,
        accuracyMeters: input.accuracyMeters,
        capturedAt: input.capturedAt,
      },
      routingInput,
      decision,
    };
    let decisionId: string;

    try {
      decisionId = await this.routingStore.recordRoutingDecision(recordInput);
    } catch (error) {
      if (!(error instanceof RoutingDecisionIdempotencyConflictError)) {
        throw error;
      }

      const concurrentReplay = await this.routingStore.findRecordedRoutingDecision(
        actor.id,
        idempotencyKey,
      );
      if (!concurrentReplay) {
        throw error;
      }

      this.assertReplayMatches(
        input,
        concurrentReplay.locationEvidence,
        concurrentReplay.routingInput,
      );
      return {
        decisionId: concurrentReplay.id,
        result: toPublicRoutingResult(concurrentReplay.decision),
      };
    }

    this.logger.log({
      event: 'routing_decision_recorded',
      routingRequestId: idempotencyKey,
      status: decision.status,
      categoryId: routingCategory.id,
    });
    return {
      decisionId,
      result: toPublicRoutingResult(decision),
    };
  }

  private assertReplayMatches(
    input: ResolveRoutingRequestInput,
    evidence: LocationEvidence,
    routingInput: RoutingResolutionInput,
  ): void {
    if (
      routingInput.categoryId !== input.categoryId ||
      routingInput.assetId !== (input.assetId ?? null) ||
      evidence.latitude !== input.latitude ||
      evidence.longitude !== input.longitude ||
      evidence.accuracyMeters !== input.accuracyMeters ||
      evidence.capturedAt !== input.capturedAt
    ) {
      throw new RoutingDecisionIdempotencyConflictError();
    }
  }
}
