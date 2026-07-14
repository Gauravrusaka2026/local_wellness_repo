import type {
  DuplicateCandidateEvidence,
  DuplicateConfidenceFactor,
  DuplicateDetectionInput,
  DuplicateDetectionPolicy,
  DuplicateDetectionResult,
} from '@local-wellness/types';

import { RoutingConfigurationError } from './errors.js';

const roundScore = (value: number): number => Math.round(value * 1_000_000) / 1_000_000;
const clampSimilarity = (value: number): number => Math.max(0, Math.min(1, value));

const validateDuplicateInput = (input: DuplicateDetectionInput): void => {
  if (
    !input.categoryId ||
    !Number.isFinite(input.location.latitude) ||
    input.location.latitude < -90 ||
    input.location.latitude > 90 ||
    !Number.isFinite(input.location.longitude) ||
    input.location.longitude < -180 ||
    input.location.longitude > 180 ||
    !Number.isFinite(Date.parse(input.occurredAt)) ||
    input.mediaHashes.some((hash) => !/^[0-9a-f]{64}$/u.test(hash)) ||
    new Set(input.mediaHashes).size !== input.mediaHashes.length
  ) {
    throw new RangeError('The duplicate detection input is invalid.');
  }
};

const validateDuplicatePolicy = (policy: DuplicateDetectionPolicy): void => {
  if (!policy.id || !policy.versionId || !Number.isInteger(policy.version) || policy.version < 1) {
    throw new RoutingConfigurationError('The duplicate policy identity or version is invalid.');
  }
  if (
    !Number.isFinite(policy.maximumDistanceMeters) ||
    policy.maximumDistanceMeters <= 0 ||
    !Number.isFinite(policy.maximumAgeSeconds) ||
    policy.maximumAgeSeconds <= 0
  ) {
    throw new RoutingConfigurationError('The duplicate policy search bounds are invalid.');
  }
  if (!Number.isFinite(policy.minimumScore) || policy.minimumScore < 0 || policy.minimumScore > 1) {
    throw new RoutingConfigurationError('The duplicate policy score threshold is invalid.');
  }
  if (!Number.isInteger(policy.maximumResults) || policy.maximumResults < 1) {
    throw new RoutingConfigurationError('The duplicate policy result limit is invalid.');
  }

  const weights = Object.values(policy.weights);
  if (weights.some((weight) => !Number.isFinite(weight) || weight < 0)) {
    throw new RoutingConfigurationError('Duplicate policy weights must be non-negative.');
  }
  if (weights.every((weight) => weight === 0)) {
    throw new RoutingConfigurationError('The duplicate policy total weight must be positive.');
  }
};

const factor = (
  code: DuplicateConfidenceFactor['code'],
  similarity: number,
  weight: number,
): DuplicateConfidenceFactor => ({
  code,
  similarity: roundScore(clampSimilarity(similarity)),
  weight,
  contribution: roundScore(clampSimilarity(similarity) * weight),
});

const scoreDuplicateCandidate = (
  input: DuplicateDetectionInput,
  candidate: DuplicateCandidateEvidence,
  policy: DuplicateDetectionPolicy,
) => {
  if (
    !candidate.complaintId ||
    !Number.isFinite(candidate.distanceMeters) ||
    candidate.distanceMeters < 0 ||
    !Number.isFinite(candidate.ageSeconds) ||
    candidate.ageSeconds < 0 ||
    !Number.isInteger(candidate.matchingMediaHashes) ||
    candidate.matchingMediaHashes < 0 ||
    candidate.matchingMediaHashes > input.mediaHashes.length ||
    (candidate.descriptionSimilarity !== null &&
      (!Number.isFinite(candidate.descriptionSimilarity) ||
        candidate.descriptionSimilarity < 0 ||
        candidate.descriptionSimilarity > 1))
  ) {
    throw new RoutingConfigurationError('Duplicate candidate evidence is invalid.');
  }

  const factors: DuplicateConfidenceFactor[] = [
    factor('category', candidate.categoryId === input.categoryId ? 1 : 0, policy.weights.category),
    factor(
      'location',
      1 - candidate.distanceMeters / policy.maximumDistanceMeters,
      policy.weights.location,
    ),
    factor('time', 1 - candidate.ageSeconds / policy.maximumAgeSeconds, policy.weights.time),
  ];

  if (input.description !== null) {
    factors.push(
      factor('description', candidate.descriptionSimilarity ?? 0, policy.weights.description),
    );
  }
  if (input.mediaHashes.length > 0) {
    factors.push(
      factor(
        'media',
        candidate.matchingMediaHashes / input.mediaHashes.length,
        policy.weights.media,
      ),
    );
  }
  if (input.assetId !== null) {
    factors.push(
      factor('asset', candidate.assetId === input.assetId ? 1 : 0, policy.weights.asset),
    );
  }

  const applicableWeight = factors.reduce((total, current) => total + current.weight, 0);
  if (!Number.isFinite(applicableWeight) || applicableWeight <= 0) {
    throw new RoutingConfigurationError(
      'The duplicate policy has no positive weight for the supplied evidence.',
    );
  }

  return {
    complaintId: candidate.complaintId,
    score: roundScore(
      factors.reduce((total, current) => total + current.contribution, 0) / applicableWeight,
    ),
    distanceMeters: candidate.distanceMeters,
    factors,
  };
};

export const detectDuplicates = (
  input: DuplicateDetectionInput,
  candidates: readonly DuplicateCandidateEvidence[],
  policy: DuplicateDetectionPolicy,
): DuplicateDetectionResult => {
  validateDuplicateInput(input);
  validateDuplicatePolicy(policy);

  const complaintIds = new Set<string>();
  const evaluated = candidates.map((candidate) => {
    if (complaintIds.has(candidate.complaintId)) {
      throw new RoutingConfigurationError('Duplicate candidate identifiers must be unique.');
    }
    complaintIds.add(candidate.complaintId);
    return {
      withinSearchBounds:
        candidate.distanceMeters <= policy.maximumDistanceMeters &&
        candidate.ageSeconds <= policy.maximumAgeSeconds,
      match: scoreDuplicateCandidate(input, candidate, policy),
    };
  });
  const matches = evaluated
    .filter(({ withinSearchBounds }) => withinSearchBounds)
    .map(({ match }) => match);

  matches.sort(
    (left, right) =>
      right.score - left.score ||
      left.distanceMeters - right.distanceMeters ||
      left.complaintId.localeCompare(right.complaintId),
  );

  return {
    policyId: policy.id,
    policyVersionId: policy.versionId,
    policyVersion: policy.version,
    matches: matches
      .filter((match) => match.score >= policy.minimumScore)
      .slice(0, policy.maximumResults),
  };
};
