import type {
  DuplicateCandidateEvidence,
  DuplicateDetectionInput,
  JurisdictionResolution,
  RoutingCandidate,
  RoutingPolicy,
  RoutingResolutionInput,
} from '@local-wellness/types';

export interface RoutingDataProvider {
  loadRoutingContext(
    input: RoutingResolutionInput,
    jurisdiction: JurisdictionResolution,
  ): Promise<RoutingContext>;
}

export interface RoutingContext {
  policy: RoutingPolicy | null;
  candidates: readonly RoutingCandidate[];
}

export interface DuplicateCandidateProvider {
  findDuplicateCandidates(
    input: DuplicateDetectionInput,
  ): Promise<readonly DuplicateCandidateEvidence[]>;
}
