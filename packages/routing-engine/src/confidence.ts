import type {
  RoutingCandidate,
  RoutingConfidence,
  RoutingConfidenceBand,
  RoutingPolicy,
} from '@local-wellness/types';

import { RoutingConfigurationError } from './errors.js';

const isUnitInterval = (value: number): boolean =>
  Number.isFinite(value) && value >= 0 && value <= 1;

const roundScore = (value: number): number => Math.round(value * 1_000_000) / 1_000_000;

export const validateRoutingPolicy = (policy: RoutingPolicy): void => {
  if (!policy.id || !policy.versionId || !Number.isInteger(policy.version) || policy.version < 1) {
    throw new RoutingConfigurationError('The routing policy identity or version is invalid.');
  }
  if (
    !isUnitInterval(policy.automaticThreshold) ||
    !isUnitInterval(policy.manualReviewThreshold) ||
    policy.automaticThreshold < policy.manualReviewThreshold
  ) {
    throw new RoutingConfigurationError('The routing policy thresholds are invalid.');
  }
  if (!isUnitInterval(policy.ambiguityDelta) || !isUnitInterval(policy.fallbackPenaltyPerLevel)) {
    throw new RoutingConfigurationError('The routing policy penalties are invalid.');
  }
  if (policy.factors.length === 0) {
    throw new RoutingConfigurationError('The routing policy has no confidence factors.');
  }

  const factorCodes = new Set<string>();
  let totalWeight = 0;

  for (const factor of policy.factors) {
    if (!factor.code || factorCodes.has(factor.code)) {
      throw new RoutingConfigurationError('Routing policy factor codes must be unique.');
    }
    if (!Number.isFinite(factor.weight) || factor.weight < 0) {
      throw new RoutingConfigurationError('Routing policy factor weights must be non-negative.');
    }
    factorCodes.add(factor.code);
    totalWeight += factor.weight;
  }

  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    throw new RoutingConfigurationError('The routing policy total factor weight must be positive.');
  }
};

const confidenceBand = (score: number, policy: RoutingPolicy): RoutingConfidenceBand => {
  if (score >= policy.automaticThreshold) {
    return 'high';
  }
  if (score >= policy.manualReviewThreshold) {
    return 'medium';
  }
  if (score > 0) {
    return 'low';
  }
  return 'none';
};

export const scoreRoutingCandidate = (
  candidate: RoutingCandidate,
  policy: RoutingPolicy,
): RoutingConfidence => {
  validateRoutingPolicy(policy);
  if (!Number.isSafeInteger(candidate.fallbackDepth) || candidate.fallbackDepth < 0) {
    throw new RoutingConfigurationError('The routing candidate fallback depth is invalid.');
  }

  const signalsByCode = new Map<string, (typeof candidate.confidenceSignals)[number]>();
  for (const signal of candidate.confidenceSignals) {
    if (!signal.code || signalsByCode.has(signal.code)) {
      throw new RoutingConfigurationError('Routing candidate signal codes must be unique.');
    }
    signalsByCode.set(signal.code, signal);
  }

  const totalWeight = policy.factors.reduce((total, factor) => total + factor.weight, 0);
  const factors = policy.factors.map((factor) => {
    const signal = signalsByCode.get(factor.code);
    const matched = signal?.matched ?? false;

    return {
      code: factor.code,
      matched,
      required: factor.required,
      weight: factor.weight,
      contribution: matched ? factor.weight : 0,
      explanation: signal?.explanation ?? 'No matching signal was supplied.',
    };
  });
  const weightedScore =
    factors.reduce((total, factor) => total + factor.contribution, 0) / totalWeight;
  const fallbackPenalty = candidate.fallbackDepth * policy.fallbackPenaltyPerLevel;
  const score = roundScore(Math.max(0, Math.min(1, weightedScore - fallbackPenalty)));

  return {
    score,
    band: confidenceBand(score, policy),
    factors,
  };
};
