import { Inject, Injectable } from '@nestjs/common';
import {
  routingConfidenceBands,
  complaintMediaKinds,
  routingDecisionStatuses,
  routingEntityTypes,
  routingVerificationStatuses,
  type JurisdictionMatch,
  type JurisdictionResolution,
  type RoutingCandidate,
  type RoutingAssetOption,
  type RoutingCategory,
  type RoutingCategoryCatalogItem,
  type RoutingDecision,
  type RoutingEntityEvidence,
  type RoutingPolicy,
  type RoutingResolutionInput,
} from '@local-wellness/types';
import type { JurisdictionResolutionQuery, RoutingContext } from '@local-wellness/routing-engine';
import { z } from 'zod';

import {
  RoutingDataAccessError,
  RoutingDecisionIdempotencyConflictError,
  RoutingStore,
  type RoutingAssetDiscoveryQuery,
  type RecordRoutingDecisionInput,
  type RecordedRoutingDecision,
} from '../data/routing.store.js';
import { SupabaseClients } from './supabase-clients.js';

interface RpcResult {
  data: unknown;
  error: unknown;
}

type ServiceRoleRpc = (
  functionName: string,
  arguments_: Record<string, unknown>,
) => PromiseLike<RpcResult>;

const uuidSchema = z.uuid();
const nullableUuidSchema = uuidSchema.nullable();
const verificationStatusSchema = z.enum(routingVerificationStatuses);
const entityTypeSchema = z.enum(routingEntityTypes);

const categoryRowSchema = z
  .object({
    category_id: uuidSchema,
    domain_code: z.string().regex(/^[a-z][a-z0-9_]{1,79}$/u),
    category_code: z.string().regex(/^[a-z][a-z0-9_]{1,79}$/u),
    category_name: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(1_000).nullable(),
    parent_category_id: nullableUuidSchema,
    classification_level: z.enum(['category', 'subcategory', 'issue']),
    default_severity: z.enum(['low', 'medium', 'high', 'critical']),
    requires_asset: z.boolean(),
    requires_location: z.boolean(),
    location_requirement: z.enum(['required', 'optional']),
    is_emergency: z.boolean(),
    minimum_media_count: z.number().int().min(0).max(20),
    maximum_media_count: z.number().int().min(0).max(20),
    required_attributes: z.array(z.string().regex(/^[a-z][a-z0-9_]{0,63}$/u)).max(20),
    media_requirements: z.record(z.string(), z.unknown()),
    verification_status: verificationStatusSchema,
    is_placeholder: z.boolean(),
    is_routing_eligible: z.boolean(),
  })
  .strict();

const categoryRowsSchema = z.array(categoryRowSchema).max(500);

const publishedMediaRequirementsSchema = z
  .object({ recommended: z.array(z.enum(complaintMediaKinds)).max(3).optional() })
  .loose();

const routingAssetRowSchema = z
  .object({
    asset_id: uuidSchema,
    display_name: z.string().trim().min(1).max(240),
    asset_type_name: z.string().trim().min(1).max(160),
    distance_meters: z.number().finite().nonnegative().max(5_000),
  })
  .strict();

const routingEntityEvidenceSchema = z
  .object({
    entityType: entityTypeSchema,
    entityId: uuidSchema,
    versionId: nullableUuidSchema,
    verificationStatus: verificationStatusSchema,
    isActive: z.boolean(),
    isPlaceholder: z.boolean(),
    isRoutingEligible: z.boolean(),
  })
  .strict();

const jurisdictionRowSchema = z
  .object({
    state_id: uuidSchema,
    district_id: nullableUuidSchema,
    taluka_id: nullableUuidSchema,
    local_body_id: uuidSchema,
    ward_id: nullableUuidSchema,
    state_boundary_version_id: nullableUuidSchema,
    district_boundary_version_id: nullableUuidSchema,
    taluka_boundary_version_id: nullableUuidSchema,
    local_body_boundary_version_id: uuidSchema,
    ward_boundary_version_id: nullableUuidSchema,
    evidence_metadata: z.object({ evidence: z.array(routingEntityEvidenceSchema) }).strict(),
  })
  .strict();

const routingPolicyFactorSchema = z
  .object({
    code: z.string().min(1),
    weight: z.number().finite().nonnegative(),
    required: z.boolean(),
  })
  .strict();

const confidenceWeightsSchema = z
  .object({
    automaticThreshold: z.number().finite().min(0).max(1),
    manualReviewThreshold: z.number().finite().min(0).max(1),
    ambiguityDelta: z.number().finite().min(0).max(1),
    fallbackPenaltyPerLevel: z.number().finite().min(0).max(1),
    factors: z.array(routingPolicyFactorSchema).min(1),
  })
  .strict();

const routingPolicyRowSchema = z
  .object({
    confidence_policy_id: uuidSchema,
    confidence_policy_version_id: uuidSchema,
    confidence_policy_version: z.number().int().positive(),
    confidence_weights: confidenceWeightsSchema,
  })
  .strict();

const confidenceSignalSchema = z
  .object({
    code: z.string().min(1),
    matched: z.boolean(),
    explanation: z.string().min(1),
  })
  .strict();

const candidateExplanationSchema = z
  .object({
    explanationCode: z.string().min(1),
    evidence: z.array(routingEntityEvidenceSchema),
    confidenceSignals: z.array(confidenceSignalSchema),
    jurisdictionBoundaryVersionIds: z.tuple([
      nullableUuidSchema,
      nullableUuidSchema,
      nullableUuidSchema,
      uuidSchema,
      nullableUuidSchema,
    ]),
    sourceReferenceId: nullableUuidSchema,
  })
  .strict();

const routingTargetReplaySchema = z
  .object({
    authorityId: uuidSchema,
    localBodyId: uuidSchema,
    wardId: nullableUuidSchema,
    departmentId: uuidSchema,
    authorityDepartmentId: uuidSchema,
    officerRoleId: uuidSchema,
    officerAssignmentId: nullableUuidSchema,
    assetTypeId: nullableUuidSchema,
    assetId: nullableUuidSchema,
    assetVersionId: nullableUuidSchema,
    assetMatchDistanceMeters: z.number().finite().nonnegative().nullable(),
    assetOwnershipVersionId: nullableUuidSchema,
  })
  .strict();

const jurisdictionMatchReplaySchema = z
  .object({
    stateId: uuidSchema,
    districtId: nullableUuidSchema,
    talukaId: nullableUuidSchema,
    localBodyId: uuidSchema,
    wardId: nullableUuidSchema,
    stateBoundaryVersionId: nullableUuidSchema,
    districtBoundaryVersionId: nullableUuidSchema,
    talukaBoundaryVersionId: nullableUuidSchema,
    localBodyBoundaryVersionId: uuidSchema,
    wardBoundaryVersionId: nullableUuidSchema,
    evidence: z.array(routingEntityEvidenceSchema),
  })
  .strict();

const jurisdictionResolutionReplaySchema = z
  .object({
    status: z.enum(['resolved', 'ambiguous', 'unsupported']),
    matches: z.array(jurisdictionMatchReplaySchema),
    reason: z.string().min(1),
  })
  .strict();

const routingConfidenceFactorReplaySchema = z
  .object({
    code: z.string().min(1),
    matched: z.boolean(),
    required: z.boolean(),
    weight: z.number().finite().nonnegative(),
    contribution: z.number().finite().nonnegative(),
    explanation: z.string().min(1),
  })
  .strict();

const routingConfidenceReplaySchema = z
  .object({
    score: z.number().finite().min(0).max(1),
    band: z.enum(routingConfidenceBands),
    factors: z.array(routingConfidenceFactorReplaySchema),
  })
  .strict();

const routingCandidateEvaluationReplaySchema = z
  .object({
    candidateId: z.string().min(1),
    routingRuleId: uuidSchema,
    routingRuleVersionId: uuidSchema,
    explanationCode: z.string().min(1),
    sourceReferenceId: nullableUuidSchema,
    target: routingTargetReplaySchema,
    eligible: z.boolean(),
    rejectionReasons: z.array(z.string()),
    fallbackDepth: z.number().int().min(0).max(32),
    confidence: routingConfidenceReplaySchema,
  })
  .strict();

const routingReplayMetadataSchema = z
  .object({
    policyId: nullableUuidSchema,
    policyVersionId: nullableUuidSchema,
    policyVersion: z.number().int().positive().nullable(),
    requestedAssetId: nullableUuidSchema,
    confidenceBand: z.enum(routingConfidenceBands),
    confidenceFactors: z.array(routingConfidenceFactorReplaySchema),
    jurisdiction: jurisdictionResolutionReplaySchema,
    selectedCandidateId: z.string().min(1).nullable(),
    selectedRoutingRuleId: nullableUuidSchema,
    selectedRoutingRuleVersionId: nullableUuidSchema,
    fallbackUsed: z.boolean(),
    fallbackPath: z.array(uuidSchema).max(32),
    ambiguousCandidateIds: z.array(z.string()),
    candidateEvaluations: z.array(routingCandidateEvaluationReplaySchema),
  })
  .strict();

const routingReplayRowSchema = z
  .object({
    routing_decision_id: uuidSchema,
    request_id: z.string().min(1).max(128),
    category_id: uuidSchema,
    longitude: z.number().finite().min(-180).max(180),
    latitude: z.number().finite().min(-90).max(90),
    accuracy_meters: z.number().finite().nonnegative().max(5_000),
    captured_at: z.iso.datetime({ offset: true }),
    resolved_at: z.iso.datetime({ offset: true }),
    decision_status: z.enum(routingDecisionStatuses),
    confidence_score: z.number().finite().min(0).max(1).nullable(),
    state_id: nullableUuidSchema,
    district_id: nullableUuidSchema,
    taluka_id: nullableUuidSchema,
    local_body_id: nullableUuidSchema,
    ward_id: nullableUuidSchema,
    state_boundary_version_id: nullableUuidSchema,
    district_boundary_version_id: nullableUuidSchema,
    taluka_boundary_version_id: nullableUuidSchema,
    local_body_boundary_version_id: nullableUuidSchema,
    ward_boundary_version_id: nullableUuidSchema,
    asset_type_id: nullableUuidSchema,
    asset_id: nullableUuidSchema,
    asset_version_id: nullableUuidSchema,
    asset_match_distance_meters: z.number().finite().nonnegative().nullable(),
    asset_ownership_version_id: nullableUuidSchema,
    target_authority_id: nullableUuidSchema,
    department_id: nullableUuidSchema,
    authority_department_id: nullableUuidSchema,
    officer_role_id: nullableUuidSchema,
    officer_assignment_id: nullableUuidSchema,
    route_rule_id: nullableUuidSchema,
    route_rule_version_id: nullableUuidSchema,
    confidence_policy_version_id: nullableUuidSchema,
    fallback_depth: z.number().int().min(0).max(32),
    explanation_codes: z.array(z.string().min(1)),
    explanation_metadata: routingReplayMetadataSchema,
    ambiguity_count: z.number().int().nonnegative(),
  })
  .strict();

const routingCandidateRowSchema = z
  .object({
    candidate_id: z.string().min(1),
    category_id: uuidSchema,
    category_code: z.string().min(1),
    state_id: uuidSchema,
    district_id: nullableUuidSchema,
    taluka_id: nullableUuidSchema,
    local_body_id: uuidSchema,
    ward_id: nullableUuidSchema,
    state_boundary_version_id: nullableUuidSchema,
    district_boundary_version_id: nullableUuidSchema,
    taluka_boundary_version_id: nullableUuidSchema,
    local_body_boundary_version_id: uuidSchema,
    ward_boundary_version_id: nullableUuidSchema,
    asset_type_id: nullableUuidSchema,
    asset_id: nullableUuidSchema,
    asset_version_id: nullableUuidSchema,
    asset_ownership_version_id: nullableUuidSchema,
    target_authority_id: uuidSchema,
    department_id: uuidSchema,
    authority_department_id: uuidSchema,
    officer_role_id: uuidSchema,
    officer_assignment_id: nullableUuidSchema,
    route_rule_id: uuidSchema,
    route_rule_version_id: uuidSchema,
    routing_rule_code: z.string().min(1),
    confidence_policy_id: uuidSchema,
    confidence_policy_version_id: uuidSchema,
    confidence_policy_version: z.number().int().positive(),
    confidence_weights: confidenceWeightsSchema,
    fallback_depth: z.number().int().min(0).max(32),
    fallback_path: z.array(uuidSchema).max(32),
    priority: z.number().int().nonnegative(),
    asset_match_distance_meters: z.number().finite().nonnegative().nullable(),
    explanation_metadata: candidateExplanationSchema,
  })
  .strict();

const decode = <Output>(schema: z.ZodType<Output>, data: unknown, operation: string): Output => {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new RoutingDataAccessError(operation);
  }

  return result.data;
};

const hasDatabaseErrorMarker = (error: unknown, marker: string): boolean =>
  typeof error === 'object' && error !== null && 'message' in error && error.message === marker;

const decodeCategory = (row: z.infer<typeof categoryRowSchema>): RoutingCategory => {
  const mediaRequirements = publishedMediaRequirementsSchema.safeParse(row.media_requirements);
  if (!mediaRequirements.success) {
    throw new RoutingDataAccessError('decode routing category');
  }

  return {
    id: row.category_id,
    code: row.category_code,
    name: row.category_name,
    description: row.description,
    parentCategoryId: row.parent_category_id,
    requiresAsset: row.requires_asset,
    requiresLocation: row.requires_location,
    isEmergency: row.is_emergency,
    minimumMediaCount: row.minimum_media_count,
    maximumMediaCount: row.maximum_media_count,
    requiredAttributes: row.required_attributes,
    recommendedMediaKinds: mediaRequirements.data.recommended ?? [],
  };
};

const decodeCatalogCategory = (
  row: z.infer<typeof categoryRowSchema>,
  submissionAvailability: RoutingCategoryCatalogItem['submissionAvailability'],
): RoutingCategoryCatalogItem => ({
  ...decodeCategory(row),
  submissionAvailability,
});

const assertCategoryRowIntegrity = (
  rows: readonly z.infer<typeof categoryRowSchema>[],
  operation: string,
): void => {
  const categoryIds = new Set<string>();

  for (const row of rows) {
    if (
      categoryIds.has(row.category_id) ||
      row.maximum_media_count < row.minimum_media_count ||
      new Set(row.required_attributes).size !== row.required_attributes.length
    ) {
      throw new RoutingDataAccessError(operation);
    }

    categoryIds.add(row.category_id);
  }
};

const assertPublishedCategoryRows = (
  rows: readonly z.infer<typeof categoryRowSchema>[],
  operation: string,
): void => {
  assertCategoryRowIntegrity(rows, operation);

  for (const row of rows) {
    if (row.verification_status !== 'verified' || row.is_placeholder || !row.is_routing_eligible) {
      throw new RoutingDataAccessError(operation);
    }
  }
};

const isVerifiedRoutingEvidence = (evidence: RoutingEntityEvidence): boolean =>
  evidence.verificationStatus === 'verified' &&
  evidence.isActive &&
  !evidence.isPlaceholder &&
  evidence.isRoutingEligible;

const hasEvidence = (
  evidence: readonly RoutingEntityEvidence[],
  entityType: RoutingEntityEvidence['entityType'],
  entityId: string,
  versionId?: string,
): boolean =>
  evidence.some(
    (entry) =>
      entry.entityType === entityType &&
      entry.entityId === entityId &&
      (versionId === undefined || entry.versionId === versionId),
  );

const hasJurisdictionEntityEvidence = (
  evidence: readonly RoutingEntityEvidence[],
  entityType: 'state' | 'district' | 'taluka',
  entityId: string | null,
  boundaryVersionId: string | null,
): boolean => {
  if (entityId === null) {
    return boundaryVersionId === null;
  }

  if (!hasEvidence(evidence, entityType, entityId)) {
    return false;
  }

  if (boundaryVersionId === null) {
    return entityType === 'state';
  }

  return hasEvidence(evidence, 'jurisdiction_boundary', boundaryVersionId, boundaryVersionId);
};

const decodeJurisdictionMatch = (
  row: z.infer<typeof jurisdictionRowSchema>,
  operation: string,
): JurisdictionMatch => {
  const evidence = row.evidence_metadata.evidence;
  const hasRequiredEvidence =
    evidence.every(isVerifiedRoutingEvidence) &&
    hasJurisdictionEntityEvidence(evidence, 'state', row.state_id, row.state_boundary_version_id) &&
    hasJurisdictionEntityEvidence(
      evidence,
      'district',
      row.district_id,
      row.district_boundary_version_id,
    ) &&
    hasJurisdictionEntityEvidence(
      evidence,
      'taluka',
      row.taluka_id,
      row.taluka_boundary_version_id,
    ) &&
    (row.taluka_id === null || row.district_id !== null) &&
    hasEvidence(evidence, 'local_body', row.local_body_id) &&
    hasEvidence(
      evidence,
      'jurisdiction_boundary',
      row.local_body_boundary_version_id,
      row.local_body_boundary_version_id,
    ) &&
    (row.ward_id === null
      ? row.ward_boundary_version_id === null
      : row.ward_boundary_version_id !== null &&
        hasEvidence(evidence, 'ward', row.ward_id) &&
        hasEvidence(
          evidence,
          'jurisdiction_boundary',
          row.ward_boundary_version_id,
          row.ward_boundary_version_id,
        ));

  if (!hasRequiredEvidence) {
    throw new RoutingDataAccessError(operation);
  }

  return {
    stateId: row.state_id,
    districtId: row.district_id,
    talukaId: row.taluka_id,
    localBodyId: row.local_body_id,
    wardId: row.ward_id,
    stateBoundaryVersionId: row.state_boundary_version_id,
    districtBoundaryVersionId: row.district_boundary_version_id,
    talukaBoundaryVersionId: row.taluka_boundary_version_id,
    localBodyBoundaryVersionId: row.local_body_boundary_version_id,
    wardBoundaryVersionId: row.ward_boundary_version_id,
    evidence,
  };
};

const jurisdictionMatchKey = (match: JurisdictionMatch): string =>
  [
    match.stateId,
    match.districtId ?? '-',
    match.talukaId ?? '-',
    match.localBodyId,
    match.wardId ?? '-',
    match.stateBoundaryVersionId ?? '-',
    match.districtBoundaryVersionId ?? '-',
    match.talukaBoundaryVersionId ?? '-',
    match.localBodyBoundaryVersionId,
    match.wardBoundaryVersionId ?? '-',
  ].join(':');

const routingPolicyKey = (policy: RoutingPolicy): string => JSON.stringify(policy);

const decodeCandidate = (row: z.infer<typeof routingCandidateRowSchema>): RoutingCandidate => ({
  candidateId: row.candidate_id,
  routingRuleId: row.route_rule_id,
  routingRuleVersionId: row.route_rule_version_id,
  routingRuleCode: row.routing_rule_code,
  explanationCode: row.explanation_metadata.explanationCode,
  sourceReferenceId: row.explanation_metadata.sourceReferenceId,
  categoryId: row.category_id,
  priority: row.priority,
  fallbackDepth: row.fallback_depth,
  fallbackPath: row.fallback_path,
  target: {
    authorityId: row.target_authority_id,
    localBodyId: row.local_body_id,
    wardId: row.ward_id,
    departmentId: row.department_id,
    authorityDepartmentId: row.authority_department_id,
    officerRoleId: row.officer_role_id,
    officerAssignmentId: row.officer_assignment_id,
    assetTypeId: row.asset_type_id,
    assetId: row.asset_id,
    assetVersionId: row.asset_version_id,
    assetMatchDistanceMeters: row.asset_match_distance_meters,
    assetOwnershipVersionId: row.asset_ownership_version_id,
  },
  evidence: row.explanation_metadata.evidence,
  confidenceSignals: row.explanation_metadata.confidenceSignals,
});

const assertCandidateVersionEvidence = (
  row: z.infer<typeof routingCandidateRowSchema>,
  operation: string,
): void => {
  const evidence = row.explanation_metadata.evidence;

  if (row.asset_id === null) {
    if (
      row.asset_type_id !== null ||
      row.asset_version_id !== null ||
      row.asset_ownership_version_id !== null ||
      row.asset_match_distance_meters !== null
    ) {
      throw new RoutingDataAccessError(operation);
    }

    return;
  }

  if (
    row.asset_type_id === null ||
    row.asset_version_id === null ||
    row.asset_match_distance_meters === null ||
    !hasEvidence(evidence, 'asset_type', row.asset_type_id) ||
    !hasEvidence(evidence, 'asset', row.asset_id, row.asset_version_id) ||
    (row.asset_ownership_version_id !== null &&
      !hasEvidence(
        evidence,
        'asset_ownership',
        row.asset_ownership_version_id,
        row.asset_ownership_version_id,
      ))
  ) {
    throw new RoutingDataAccessError(operation);
  }
};

const assertCandidateJurisdictionEvidence = (
  row: z.infer<typeof routingCandidateRowSchema>,
  operation: string,
): void => {
  const evidence = row.explanation_metadata.evidence;
  const hasRequiredEvidence =
    evidence.every(isVerifiedRoutingEvidence) &&
    hasJurisdictionEntityEvidence(evidence, 'state', row.state_id, row.state_boundary_version_id) &&
    hasJurisdictionEntityEvidence(
      evidence,
      'district',
      row.district_id,
      row.district_boundary_version_id,
    ) &&
    hasJurisdictionEntityEvidence(
      evidence,
      'taluka',
      row.taluka_id,
      row.taluka_boundary_version_id,
    ) &&
    (row.taluka_id === null || row.district_id !== null) &&
    hasEvidence(evidence, 'local_body', row.local_body_id) &&
    hasEvidence(
      evidence,
      'jurisdiction_boundary',
      row.local_body_boundary_version_id,
      row.local_body_boundary_version_id,
    ) &&
    (row.ward_id === null
      ? row.ward_boundary_version_id === null
      : row.ward_boundary_version_id !== null &&
        hasEvidence(evidence, 'ward', row.ward_id) &&
        hasEvidence(
          evidence,
          'jurisdiction_boundary',
          row.ward_boundary_version_id,
          row.ward_boundary_version_id,
        ));

  if (!hasRequiredEvidence) {
    throw new RoutingDataAccessError(operation);
  }
};

const toRoutingPolicy = (row: z.infer<typeof routingPolicyRowSchema>): RoutingPolicy => ({
  id: row.confidence_policy_id,
  versionId: row.confidence_policy_version_id,
  version: row.confidence_policy_version,
  automaticThreshold: row.confidence_weights.automaticThreshold,
  manualReviewThreshold: row.confidence_weights.manualReviewThreshold,
  ambiguityDelta: row.confidence_weights.ambiguityDelta,
  fallbackPenaltyPerLevel: row.confidence_weights.fallbackPenaltyPerLevel,
  factors: row.confidence_weights.factors,
});

const ambiguityCount = (decision: RoutingDecision): number => {
  if (decision.explanation.jurisdiction.status === 'ambiguous') {
    return decision.explanation.jurisdiction.matches.length;
  }

  if (decision.explanation.reason === 'ambiguous_candidate_scores') {
    return decision.explanation.ambiguousCandidateIds.length;
  }

  return 0;
};

const explanationCodes = (decision: RoutingDecision): string[] => [
  ...new Set([
    decision.explanation.reason,
    ...decision.explanation.candidateEvaluations.flatMap(
      (evaluation) => evaluation.rejectionReasons,
    ),
  ]),
];

const explanationMetadata = (
  decision: RoutingDecision,
  routingInput: RoutingResolutionInput,
): Record<string, unknown> => ({
  policyId: decision.explanation.policyId,
  policyVersionId: decision.explanation.policyVersionId,
  policyVersion: decision.explanation.policyVersion,
  requestedAssetId: routingInput.assetId,
  confidenceBand: decision.confidence.band,
  confidenceFactors: decision.confidence.factors,
  jurisdiction: decision.explanation.jurisdiction,
  selectedCandidateId: decision.explanation.selectedCandidateId,
  selectedRoutingRuleId: decision.explanation.selectedRoutingRuleId,
  selectedRoutingRuleVersionId: decision.explanation.selectedRoutingRuleVersionId,
  fallbackUsed: decision.explanation.fallbackUsed,
  fallbackPath: decision.explanation.fallbackPath,
  ambiguousCandidateIds: decision.explanation.ambiguousCandidateIds,
  candidateEvaluations: decision.explanation.candidateEvaluations,
});

const decodeRecordedRoutingDecision = (
  actorUserId: string,
  row: z.infer<typeof routingReplayRowSchema>,
): RecordedRoutingDecision => {
  const metadata = row.explanation_metadata;
  const reason = row.explanation_codes[0];
  const hasCompleteTarget =
    row.target_authority_id !== null &&
    row.local_body_id !== null &&
    row.department_id !== null &&
    row.authority_department_id !== null &&
    row.officer_role_id !== null;

  if (
    !reason ||
    row.route_rule_id !== metadata.selectedRoutingRuleId ||
    row.route_rule_version_id !== metadata.selectedRoutingRuleVersionId ||
    row.confidence_policy_version_id !== metadata.policyVersionId ||
    row.fallback_depth !== metadata.fallbackPath.length ||
    (row.decision_status === 'routed' && (!hasCompleteTarget || row.confidence_score === null)) ||
    (row.decision_status !== 'routed' && hasCompleteTarget)
  ) {
    throw new RoutingDataAccessError('decode routing decision replay');
  }

  const target =
    row.decision_status === 'routed' &&
    row.target_authority_id &&
    row.local_body_id &&
    row.department_id &&
    row.authority_department_id &&
    row.officer_role_id
      ? {
          authorityId: row.target_authority_id,
          localBodyId: row.local_body_id,
          wardId: row.ward_id,
          departmentId: row.department_id,
          authorityDepartmentId: row.authority_department_id,
          officerRoleId: row.officer_role_id,
          officerAssignmentId: row.officer_assignment_id,
          assetTypeId: row.asset_type_id,
          assetId: row.asset_id,
          assetVersionId: row.asset_version_id,
          assetMatchDistanceMeters: row.asset_match_distance_meters,
          assetOwnershipVersionId: row.asset_ownership_version_id,
        }
      : null;
  const routingInput: RoutingResolutionInput = {
    categoryId: row.category_id,
    location: {
      latitude: row.latitude,
      longitude: row.longitude,
    },
    accuracyMeters: row.accuracy_meters,
    assetId: metadata.requestedAssetId,
    resolvedAt: row.resolved_at,
  };
  const decision: RoutingDecision = {
    status: row.decision_status,
    categoryId: row.category_id,
    target,
    routingRuleId: row.route_rule_id,
    routingRuleVersionId: row.route_rule_version_id,
    confidence: {
      score: row.confidence_score ?? 0,
      band: metadata.confidenceBand,
      factors: metadata.confidenceFactors,
    },
    explanation: {
      reason,
      policyId: metadata.policyId,
      policyVersionId: metadata.policyVersionId,
      policyVersion: metadata.policyVersion,
      jurisdiction: metadata.jurisdiction,
      selectedCandidateId: metadata.selectedCandidateId,
      selectedRoutingRuleId: metadata.selectedRoutingRuleId,
      selectedRoutingRuleVersionId: metadata.selectedRoutingRuleVersionId,
      fallbackUsed: metadata.fallbackUsed,
      fallbackPath: metadata.fallbackPath,
      ambiguousCandidateIds: metadata.ambiguousCandidateIds,
      candidateEvaluations: metadata.candidateEvaluations,
    },
  };

  return {
    id: row.routing_decision_id,
    actorUserId,
    requestId: row.request_id,
    locationEvidence: {
      latitude: row.latitude,
      longitude: row.longitude,
      accuracyMeters: row.accuracy_meters,
      capturedAt: row.captured_at,
    },
    routingInput,
    decision,
  };
};

@Injectable()
export class SupabaseRoutingStore extends RoutingStore {
  public constructor(@Inject(SupabaseClients) private readonly clients: SupabaseClients) {
    super();
  }

  public async findRoutingCategory(categoryId: string): Promise<RoutingCategory | null> {
    if (!uuidSchema.safeParse(categoryId).success) {
      throw new RoutingDataAccessError('find routing category');
    }

    const data = await this.callRpc('find routing category', 'list_routing_categories', {
      p_include_non_routable: false,
    });
    const rows = decode(categoryRowsSchema, data, 'find routing category');
    assertPublishedCategoryRows(rows, 'find routing category');
    const matches = rows.filter((row) => row.category_id === categoryId);

    if (matches.length > 1) {
      throw new RoutingDataAccessError('find routing category');
    }

    return matches[0] ? decodeCategory(matches[0]) : null;
  }

  public async listRoutingCategories(): Promise<RoutingCategory[]> {
    const data = await this.callRpc('list routing categories', 'list_routing_categories', {
      p_include_non_routable: false,
    });
    const rows = decode(categoryRowsSchema, data, 'list routing categories');
    assertPublishedCategoryRows(rows, 'list routing categories');

    return rows.map(decodeCategory);
  }

  public async listRoutingCategoryCatalog(): Promise<RoutingCategoryCatalogItem[]> {
    const operation = 'list routing category catalog';
    const [catalogData, publishedData] = await Promise.all([
      this.callRpc(operation, 'list_routing_categories', { p_include_non_routable: true }),
      this.callRpc(operation, 'list_routing_categories', { p_include_non_routable: false }),
    ]);
    const catalogRows = decode(categoryRowsSchema, catalogData, operation);
    const publishedRows = decode(categoryRowsSchema, publishedData, operation);
    assertCategoryRowIntegrity(catalogRows, operation);
    assertPublishedCategoryRows(publishedRows, operation);

    const nonPlaceholderRows = catalogRows.filter((row) => !row.is_placeholder);
    const catalogRowsById = new Map(nonPlaceholderRows.map((row) => [row.category_id, row]));
    const publishedRowsById = new Map(publishedRows.map((row) => [row.category_id, row]));

    if (publishedRows.some((row) => !catalogRowsById.has(row.category_id))) {
      throw new RoutingDataAccessError(operation);
    }

    return nonPlaceholderRows.map((row) => {
      const publishedRow = publishedRowsById.get(row.category_id);
      return publishedRow
        ? decodeCatalogCategory(publishedRow, 'available')
        : decodeCatalogCategory(row, 'unavailable');
    });
  }

  public async discoverRoutingAssets(
    query: RoutingAssetDiscoveryQuery,
  ): Promise<RoutingAssetOption[]> {
    const operation = 'discover routing assets';
    const data = await this.callRpc(operation, 'discover_routing_assets', {
      p_category_id: query.categoryId,
      p_longitude: query.location.longitude,
      p_latitude: query.location.latitude,
      p_accuracy_meters: query.accuracyMeters,
      p_resolved_at: query.resolvedAt,
      p_limit: 25,
    });
    const rows = decode(z.array(routingAssetRowSchema).max(25), data, operation);
    const identifiers = new Set(rows.map((row) => row.asset_id));

    if (identifiers.size !== rows.length) {
      throw new RoutingDataAccessError(operation);
    }

    return rows.map((row) => ({
      id: row.asset_id,
      displayName: row.display_name,
      assetTypeName: row.asset_type_name,
      distanceMeters: row.distance_meters,
    }));
  }

  public async resolveJurisdiction(
    query: JurisdictionResolutionQuery,
  ): Promise<JurisdictionResolution> {
    const operation = 'resolve jurisdiction';
    const data = await this.callRpc(operation, 'resolve_jurisdiction_context', {
      p_longitude: query.location.longitude,
      p_latitude: query.location.latitude,
      p_accuracy_meters: query.accuracyMeters,
      p_resolved_at: query.resolvedAt,
    });
    const rows = decode(z.array(jurisdictionRowSchema), data, operation);
    const matchesByKey = new Map<string, JurisdictionMatch>();

    for (const row of rows) {
      const match = decodeJurisdictionMatch(row, operation);
      const key = jurisdictionMatchKey(match);

      if (matchesByKey.has(key)) {
        throw new RoutingDataAccessError(operation);
      }

      matchesByKey.set(key, match);
    }

    const matches = [...matchesByKey.values()];

    if (matches.length === 0) {
      return {
        status: 'unsupported',
        matches,
        reason: 'no_verified_jurisdiction_match',
      };
    }

    if (matches.length > 1) {
      return {
        status: 'ambiguous',
        matches,
        reason: 'location_accuracy_intersects_multiple_jurisdictions',
      };
    }

    return {
      status: 'resolved',
      matches,
      reason: 'verified_jurisdiction_match',
    };
  }

  public async loadRoutingContext(
    input: RoutingResolutionInput,
    jurisdiction: JurisdictionResolution,
  ): Promise<RoutingContext> {
    const operation = 'load routing context';
    const expectedJurisdiction =
      jurisdiction.status === 'resolved' && jurisdiction.matches.length === 1
        ? jurisdiction.matches[0]
        : undefined;

    if (!expectedJurisdiction) {
      throw new RoutingDataAccessError(operation);
    }

    const data = await this.callRpc(operation, 'resolve_routing_candidates', {
      p_longitude: input.location.longitude,
      p_latitude: input.location.latitude,
      p_accuracy_meters: input.accuracyMeters,
      p_category_id: input.categoryId,
      p_asset_id: input.assetId,
      p_resolved_at: input.resolvedAt,
    });
    const rows = decode(z.array(routingCandidateRowSchema), data, operation);

    if (rows.length === 0) {
      const policyData = await this.callRpc(operation, 'resolve_routing_policy_context', {
        p_category_id: input.categoryId,
        p_local_body_id: expectedJurisdiction.localBodyId,
        p_ward_id: expectedJurisdiction.wardId,
        p_resolved_at: input.resolvedAt,
      });
      const policyRows = decode(z.array(routingPolicyRowSchema), policyData, operation);

      if (policyRows.length > 1) {
        throw new RoutingDataAccessError(operation);
      }

      return {
        policy: policyRows[0] ? toRoutingPolicy(policyRows[0]) : null,
        candidates: [],
      };
    }

    const policies = rows.map(toRoutingPolicy);
    const policy = policies[0];

    if (
      !policy ||
      policies.some(
        (candidatePolicy) => routingPolicyKey(candidatePolicy) !== routingPolicyKey(policy),
      )
    ) {
      throw new RoutingDataAccessError(operation);
    }

    const candidates = rows.map((row) => {
      if (
        row.category_id !== input.categoryId ||
        row.state_id !== expectedJurisdiction.stateId ||
        row.district_id !== expectedJurisdiction.districtId ||
        row.taluka_id !== expectedJurisdiction.talukaId ||
        row.local_body_id !== expectedJurisdiction.localBodyId ||
        row.ward_id !== expectedJurisdiction.wardId ||
        row.state_boundary_version_id !== expectedJurisdiction.stateBoundaryVersionId ||
        row.district_boundary_version_id !== expectedJurisdiction.districtBoundaryVersionId ||
        row.taluka_boundary_version_id !== expectedJurisdiction.talukaBoundaryVersionId ||
        row.local_body_boundary_version_id !== expectedJurisdiction.localBodyBoundaryVersionId ||
        row.ward_boundary_version_id !== expectedJurisdiction.wardBoundaryVersionId ||
        row.explanation_metadata.jurisdictionBoundaryVersionIds[0] !==
          expectedJurisdiction.stateBoundaryVersionId ||
        row.explanation_metadata.jurisdictionBoundaryVersionIds[1] !==
          expectedJurisdiction.districtBoundaryVersionId ||
        row.explanation_metadata.jurisdictionBoundaryVersionIds[2] !==
          expectedJurisdiction.talukaBoundaryVersionId ||
        row.explanation_metadata.jurisdictionBoundaryVersionIds[3] !==
          expectedJurisdiction.localBodyBoundaryVersionId ||
        row.explanation_metadata.jurisdictionBoundaryVersionIds[4] !==
          expectedJurisdiction.wardBoundaryVersionId ||
        (input.assetId !== null && row.asset_id !== input.assetId)
      ) {
        throw new RoutingDataAccessError(operation);
      }

      assertCandidateJurisdictionEvidence(row, operation);
      assertCandidateVersionEvidence(row, operation);
      return decodeCandidate(row);
    });

    return { policy, candidates };
  }

  public async recordRoutingDecision(input: RecordRoutingDecisionInput): Promise<string> {
    const { actorUserId, requestId, locationEvidence, routingInput, decision } = input;
    const target = decision.target;
    const resolvedJurisdiction =
      decision.explanation.jurisdiction.status === 'resolved'
        ? decision.explanation.jurisdiction.matches[0]
        : undefined;
    const data = await this.callRpc('record routing decision', 'record_routing_decision', {
      p_actor_user_id: actorUserId,
      p_request_id: requestId,
      p_longitude: locationEvidence.longitude,
      p_latitude: locationEvidence.latitude,
      p_accuracy_meters: locationEvidence.accuracyMeters,
      p_captured_at: locationEvidence.capturedAt,
      p_resolved_at: routingInput.resolvedAt,
      p_category_id: decision.categoryId,
      p_decision_status: decision.status,
      p_confidence_score: decision.confidence.score,
      p_state_id: resolvedJurisdiction?.stateId ?? null,
      p_district_id: resolvedJurisdiction?.districtId ?? null,
      p_taluka_id: resolvedJurisdiction?.talukaId ?? null,
      p_local_body_id: resolvedJurisdiction?.localBodyId ?? null,
      p_ward_id: resolvedJurisdiction?.wardId ?? null,
      p_state_boundary_version_id: resolvedJurisdiction?.stateBoundaryVersionId ?? null,
      p_district_boundary_version_id: resolvedJurisdiction?.districtBoundaryVersionId ?? null,
      p_taluka_boundary_version_id: resolvedJurisdiction?.talukaBoundaryVersionId ?? null,
      p_local_body_boundary_version_id: resolvedJurisdiction?.localBodyBoundaryVersionId ?? null,
      p_ward_boundary_version_id: resolvedJurisdiction?.wardBoundaryVersionId ?? null,
      p_asset_type_id: target?.assetTypeId ?? null,
      p_asset_id: target?.assetId ?? null,
      p_asset_version_id: target?.assetVersionId ?? null,
      p_asset_match_distance_meters: target?.assetMatchDistanceMeters ?? null,
      p_asset_ownership_version_id: target?.assetOwnershipVersionId ?? null,
      p_target_authority_id: target?.authorityId ?? null,
      p_department_id: target?.departmentId ?? null,
      p_authority_department_id: target?.authorityDepartmentId ?? null,
      p_officer_role_id: target?.officerRoleId ?? null,
      p_officer_assignment_id: target?.officerAssignmentId ?? null,
      p_route_rule_id: decision.routingRuleId,
      p_route_rule_version_id: decision.routingRuleVersionId,
      p_confidence_policy_version_id: decision.explanation.policyVersionId,
      p_fallback_depth: decision.explanation.fallbackPath.length,
      p_explanation_codes: explanationCodes(decision),
      p_explanation_metadata: explanationMetadata(decision, routingInput),
      p_ambiguity_count: ambiguityCount(decision),
    });

    return decode(uuidSchema, data, 'record routing decision');
  }

  public async findRecordedRoutingDecision(
    actorUserId: string,
    requestId: string,
  ): Promise<RecordedRoutingDecision | null> {
    const operation = 'find recorded routing decision';
    const data = await this.callRpc(operation, 'get_routing_decision_replay', {
      p_actor_user_id: actorUserId,
      p_request_id: requestId,
    });
    const rows = decode(z.array(routingReplayRowSchema).max(1), data, operation);

    return rows[0] ? decodeRecordedRoutingDecision(actorUserId, rows[0]) : null;
  }

  private async callRpc(
    operation: string,
    functionName: string,
    arguments_: Record<string, unknown>,
  ): Promise<unknown> {
    try {
      const rpc = this.clients.serviceRoleClient.rpc.bind(
        this.clients.serviceRoleClient,
      ) as unknown as ServiceRoleRpc;
      const { data, error } = await rpc(functionName, arguments_);

      if (
        functionName === 'record_routing_decision' &&
        hasDatabaseErrorMarker(error, 'ROUTING_DECISION_IDEMPOTENCY_CONFLICT')
      ) {
        throw new RoutingDecisionIdempotencyConflictError();
      }

      if (error) {
        throw new RoutingDataAccessError(operation);
      }

      return data;
    } catch (error) {
      if (error instanceof RoutingDataAccessError) {
        throw error;
      }

      throw new RoutingDataAccessError(operation);
    }
  }
}
