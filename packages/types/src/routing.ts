import type { ComplaintMediaKind } from './complaints.js';

export const routingDecisionStatuses = [
  'routed',
  'manual_review',
  'mapping_required',
  'unsupported_area',
] as const;

export type RoutingDecisionStatus = (typeof routingDecisionStatuses)[number];

export const routingEntityTypes = [
  'state',
  'district',
  'taluka',
  'authority',
  'local_body',
  'ward',
  'jurisdiction_boundary',
  'category',
  'asset_type',
  'asset',
  'asset_ownership',
  'department',
  'authority_department',
  'officer_role',
  'officer_assignment',
  'routing_rule',
] as const;

export type RoutingEntityType = (typeof routingEntityTypes)[number];

export const routingVerificationStatuses = [
  'verified',
  'partially_verified',
  'unverified',
  'placeholder',
] as const;

export type RoutingVerificationStatus = (typeof routingVerificationStatuses)[number];

export const routingConfidenceBands = ['high', 'medium', 'low', 'none'] as const;
export type RoutingConfidenceBand = (typeof routingConfidenceBands)[number];

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface LocationEvidence extends GeoPoint {
  accuracyMeters: number;
  capturedAt: string;
}

export type ResolveJurisdictionRequest = LocationEvidence;

export interface ResolveRoutingRequest extends LocationEvidence {
  categoryId: string;
  assetId?: string | undefined;
}

export interface DiscoverRoutingAssetsRequest extends LocationEvidence {
  categoryId: string;
}

export interface RoutingAssetOption {
  id: string;
  displayName: string;
  assetTypeName: string;
  distanceMeters: number;
}

export interface RoutingAssetDiscoveryResult {
  categoryId: string;
  assets: RoutingAssetOption[];
}

export interface CheckDuplicatesRequest extends ResolveRoutingRequest {
  description?: string | undefined;
  mediaHashes?: string[] | undefined;
}

export interface RoutingCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  parentCategoryId: string | null;
  requiresAsset: boolean;
  requiresLocation: boolean;
  isEmergency: boolean;
  minimumMediaCount: number;
  maximumMediaCount: number;
  requiredAttributes: string[];
  recommendedMediaKinds: ComplaintMediaKind[];
}

export interface RoutingResolutionInput {
  categoryId: string;
  location: GeoPoint;
  accuracyMeters: number;
  assetId: string | null;
  resolvedAt: string;
}

export interface RoutingEntityEvidence {
  entityType: RoutingEntityType;
  entityId: string;
  versionId: string | null;
  verificationStatus: RoutingVerificationStatus;
  isActive: boolean;
  isPlaceholder: boolean;
  isRoutingEligible: boolean;
}

export interface JurisdictionMatch {
  stateId: string;
  districtId: string | null;
  talukaId: string | null;
  localBodyId: string;
  wardId: string | null;
  stateBoundaryVersionId: string | null;
  districtBoundaryVersionId: string | null;
  talukaBoundaryVersionId: string | null;
  localBodyBoundaryVersionId: string;
  wardBoundaryVersionId: string | null;
  evidence: RoutingEntityEvidence[];
}

export type JurisdictionResolutionStatus = 'resolved' | 'ambiguous' | 'unsupported';

export interface JurisdictionResolution {
  status: JurisdictionResolutionStatus;
  matches: JurisdictionMatch[];
  reason: string;
}

export interface RoutingTarget {
  authorityId: string;
  localBodyId: string;
  wardId: string | null;
  departmentId: string;
  authorityDepartmentId: string;
  officerRoleId: string;
  officerAssignmentId: string | null;
  assetTypeId: string | null;
  assetId: string | null;
  assetVersionId: string | null;
  assetMatchDistanceMeters: number | null;
  assetOwnershipVersionId: string | null;
}

export interface RoutingConfidenceSignal {
  code: string;
  matched: boolean;
  explanation: string;
}

export interface RoutingCandidate {
  candidateId: string;
  routingRuleId: string;
  routingRuleVersionId: string;
  routingRuleCode: string;
  explanationCode: string;
  sourceReferenceId: string | null;
  categoryId: string;
  priority: number;
  fallbackDepth: number;
  fallbackPath: string[];
  target: RoutingTarget;
  evidence: RoutingEntityEvidence[];
  confidenceSignals: RoutingConfidenceSignal[];
}

export interface RoutingPolicyFactor {
  code: string;
  weight: number;
  required: boolean;
}

export interface RoutingPolicy {
  id: string;
  versionId: string;
  version: number;
  automaticThreshold: number;
  manualReviewThreshold: number;
  ambiguityDelta: number;
  fallbackPenaltyPerLevel: number;
  factors: RoutingPolicyFactor[];
}

export interface RoutingConfidenceFactor {
  code: string;
  matched: boolean;
  required: boolean;
  weight: number;
  contribution: number;
  explanation: string;
}

export interface RoutingConfidence {
  score: number;
  band: RoutingConfidenceBand;
  factors: RoutingConfidenceFactor[];
}

export interface RoutingCandidateEvaluation {
  candidateId: string;
  routingRuleId: string;
  routingRuleVersionId: string;
  explanationCode: string;
  sourceReferenceId: string | null;
  target: RoutingTarget;
  eligible: boolean;
  rejectionReasons: string[];
  fallbackDepth: number;
  confidence: RoutingConfidence;
}

export interface RoutingExplanation {
  reason: string;
  policyId: string | null;
  policyVersionId: string | null;
  policyVersion: number | null;
  jurisdiction: JurisdictionResolution;
  selectedCandidateId: string | null;
  selectedRoutingRuleId: string | null;
  selectedRoutingRuleVersionId: string | null;
  fallbackUsed: boolean;
  fallbackPath: string[];
  ambiguousCandidateIds: string[];
  candidateEvaluations: RoutingCandidateEvaluation[];
}

export interface RoutingDecision {
  status: RoutingDecisionStatus;
  categoryId: string;
  target: RoutingTarget | null;
  routingRuleId: string | null;
  routingRuleVersionId: string | null;
  confidence: RoutingConfidence;
  explanation: RoutingExplanation;
}

export interface PublicRoutingConfidence {
  score: number;
  band: RoutingConfidenceBand;
}

export interface PublicRoutingExplanation {
  reason: string;
  policyId: string | null;
  policyVersionId: string | null;
  policyVersion: number | null;
  jurisdictionStatus: JurisdictionResolutionStatus;
  localBodyBoundaryVersionId: string | null;
  wardBoundaryVersionId: string | null;
  selectedRoutingRuleId: string | null;
  selectedRoutingRuleVersionId: string | null;
  fallbackUsed: boolean;
  fallbackDepth: number;
}

export interface RoutingResolutionResult {
  status: RoutingDecisionStatus;
  categoryId: string;
  target: RoutingTarget | null;
  confidence: PublicRoutingConfidence;
  explanation: PublicRoutingExplanation;
}

export interface DuplicateDetectionInput {
  categoryId: string;
  location: GeoPoint;
  occurredAt: string;
  assetId: string | null;
  description: string | null;
  mediaHashes: string[];
}

export interface DuplicateCandidateEvidence {
  complaintId: string;
  categoryId: string;
  assetId: string | null;
  distanceMeters: number;
  ageSeconds: number;
  descriptionSimilarity: number | null;
  matchingMediaHashes: number;
}

export interface DuplicateDetectionWeights {
  category: number;
  location: number;
  time: number;
  description: number;
  media: number;
  asset: number;
}

export interface DuplicateDetectionPolicy {
  id: string;
  versionId: string;
  version: number;
  maximumDistanceMeters: number;
  maximumAgeSeconds: number;
  minimumScore: number;
  maximumResults: number;
  weights: DuplicateDetectionWeights;
}

export type DuplicateConfidenceFactorCode =
  'category' | 'location' | 'time' | 'description' | 'media' | 'asset';

export interface DuplicateConfidenceFactor {
  code: DuplicateConfidenceFactorCode;
  similarity: number;
  weight: number;
  contribution: number;
}

export interface DuplicateMatch {
  complaintId: string;
  score: number;
  distanceMeters: number;
  factors: DuplicateConfidenceFactor[];
}

export interface DuplicateDetectionResult {
  policyId: string;
  policyVersionId: string;
  policyVersion: number;
  matches: DuplicateMatch[];
}
