import type {
  DuplicateDetectionInput,
  DuplicateDetectionPolicy,
  DuplicateDetectionResult,
  JurisdictionResolution,
  RoutingConfidence,
  RoutingDecision,
  RoutingResolutionInput,
} from '@local-wellness/types';

import { evaluateRoutingCandidates } from './candidate-ranking.js';
import type { DuplicateCandidateProvider, RoutingDataProvider } from './data-provider.js';
import { detectDuplicates } from './duplicate-detection.js';
import { RoutingConfigurationError } from './errors.js';
import type { JurisdictionResolver } from './gis.js';

const emptyConfidence = (): RoutingConfidence => ({
  score: 0,
  band: 'none',
  factors: [],
});

const assertRoutingInput = (input: RoutingResolutionInput): void => {
  if (
    !input.categoryId ||
    !Number.isFinite(input.location.latitude) ||
    input.location.latitude < -90 ||
    input.location.latitude > 90 ||
    !Number.isFinite(input.location.longitude) ||
    input.location.longitude < -180 ||
    input.location.longitude > 180 ||
    !Number.isFinite(input.accuracyMeters) ||
    input.accuracyMeters < 0 ||
    input.accuracyMeters > 5_000 ||
    !Number.isFinite(Date.parse(input.resolvedAt))
  ) {
    throw new RangeError('The routing input is invalid.');
  }
};

const assertJurisdictionResolution = (jurisdiction: JurisdictionResolution): void => {
  const matchCount = jurisdiction.matches.length;
  const isConsistent =
    (jurisdiction.status === 'unsupported' && matchCount === 0) ||
    (jurisdiction.status === 'resolved' && matchCount === 1) ||
    (jurisdiction.status === 'ambiguous' && matchCount > 1);

  if (!isConsistent) {
    throw new RoutingConfigurationError('The jurisdiction resolution is inconsistent.');
  }
};

const decisionWithoutCandidate = (
  input: RoutingResolutionInput,
  jurisdiction: JurisdictionResolution,
  status: RoutingDecision['status'],
  reason: string,
): RoutingDecision => ({
  status,
  categoryId: input.categoryId,
  target: null,
  routingRuleId: null,
  routingRuleVersionId: null,
  confidence: emptyConfidence(),
  explanation: {
    reason,
    policyId: null,
    policyVersionId: null,
    policyVersion: null,
    jurisdiction,
    selectedCandidateId: null,
    selectedRoutingRuleId: null,
    selectedRoutingRuleVersionId: null,
    fallbackUsed: false,
    fallbackPath: [],
    ambiguousCandidateIds: [],
    candidateEvaluations: [],
  },
});

export class RoutingEngine {
  public constructor(
    private readonly jurisdictionResolver: JurisdictionResolver,
    private readonly routingDataProvider: RoutingDataProvider,
    private readonly duplicateCandidateProvider?: DuplicateCandidateProvider,
  ) {}

  public async resolve(input: RoutingResolutionInput): Promise<RoutingDecision> {
    assertRoutingInput(input);
    const jurisdiction = await this.jurisdictionResolver.resolveJurisdiction({
      location: input.location,
      accuracyMeters: input.accuracyMeters,
      resolvedAt: input.resolvedAt,
    });
    assertJurisdictionResolution(jurisdiction);

    if (jurisdiction.status === 'unsupported') {
      return decisionWithoutCandidate(input, jurisdiction, 'unsupported_area', jurisdiction.reason);
    }
    if (jurisdiction.status === 'ambiguous') {
      return decisionWithoutCandidate(input, jurisdiction, 'manual_review', jurisdiction.reason);
    }

    const { policy, candidates } = await this.routingDataProvider.loadRoutingContext(
      input,
      jurisdiction,
    );

    if (!policy) {
      return decisionWithoutCandidate(
        input,
        jurisdiction,
        'mapping_required',
        'routing_policy_missing',
      );
    }

    return evaluateRoutingCandidates(input, jurisdiction, candidates, policy);
  }

  public async checkDuplicates(
    input: DuplicateDetectionInput,
    policy: DuplicateDetectionPolicy,
  ): Promise<DuplicateDetectionResult> {
    if (!this.duplicateCandidateProvider) {
      throw new RoutingConfigurationError('A duplicate candidate provider is not configured.');
    }

    const candidates = await this.duplicateCandidateProvider.findDuplicateCandidates(input);
    return detectDuplicates(input, candidates, policy);
  }
}
