import type {
  JurisdictionResolution,
  RoutingCandidate,
  RoutingEntityEvidence,
  RoutingEntityType,
  RoutingResolutionInput,
} from '@local-wellness/types';

export interface RoutingEligibility {
  eligible: boolean;
  rejectionReasons: string[];
}

interface RequiredEvidence {
  entityType: RoutingEntityType;
  entityId?: string;
  versionId?: string;
}

const evidenceMatches = (evidence: RoutingEntityEvidence, required: RequiredEvidence): boolean =>
  evidence.entityType === required.entityType &&
  (required.entityId === undefined || evidence.entityId === required.entityId) &&
  (required.versionId === undefined || evidence.versionId === required.versionId);

const describeRequiredEvidence = (required: RequiredEvidence): string =>
  [required.entityType, required.entityId, required.versionId].filter(Boolean).join(':');

const appendEvidenceRejections = (
  evidenceRecords: readonly RoutingEntityEvidence[],
  rejectionReasons: string[],
): void => {
  for (const evidence of evidenceRecords) {
    const identity = `${evidence.entityType}:${evidence.entityId}`;

    if (!evidence.isActive) {
      rejectionReasons.push(`inactive_entity:${identity}`);
    }
    if (evidence.verificationStatus !== 'verified') {
      rejectionReasons.push(`unverified_entity:${identity}`);
    }
    if (evidence.isPlaceholder) {
      rejectionReasons.push(`placeholder_entity:${identity}`);
    }
    if (!evidence.isRoutingEligible) {
      rejectionReasons.push(`non_routable_entity:${identity}`);
    }
  }
};

const requiredCandidateEvidence = (candidate: RoutingCandidate): RequiredEvidence[] => {
  const required: RequiredEvidence[] = [
    { entityType: 'authority', entityId: candidate.target.authorityId },
    { entityType: 'local_body', entityId: candidate.target.localBodyId },
    { entityType: 'category', entityId: candidate.categoryId },
    { entityType: 'department', entityId: candidate.target.departmentId },
    {
      entityType: 'authority_department',
      entityId: candidate.target.authorityDepartmentId,
    },
    { entityType: 'officer_role', entityId: candidate.target.officerRoleId },
    {
      entityType: 'routing_rule',
      entityId: candidate.routingRuleId,
      versionId: candidate.routingRuleVersionId,
    },
  ];

  if (candidate.target.wardId !== null) {
    required.push({ entityType: 'ward', entityId: candidate.target.wardId });
  }
  if (candidate.target.assetTypeId !== null) {
    required.push({ entityType: 'asset_type', entityId: candidate.target.assetTypeId });
  }
  if (candidate.target.assetId !== null) {
    required.push({
      entityType: 'asset',
      entityId: candidate.target.assetId,
      ...(candidate.target.assetVersionId === null
        ? {}
        : { versionId: candidate.target.assetVersionId }),
    });
  }
  if (candidate.target.assetOwnershipVersionId !== null) {
    required.push({
      entityType: 'asset_ownership',
      versionId: candidate.target.assetOwnershipVersionId,
    });
  }
  if (candidate.target.officerAssignmentId !== null) {
    required.push({
      entityType: 'officer_assignment',
      entityId: candidate.target.officerAssignmentId,
    });
  }

  return required;
};

const appendJurisdictionRejections = (
  jurisdiction: JurisdictionResolution,
  candidate: RoutingCandidate,
  rejectionReasons: string[],
): void => {
  const matchingJurisdiction = jurisdiction.matches.find(
    (match) =>
      match.localBodyId === candidate.target.localBodyId &&
      (candidate.target.wardId === null || match.wardId === candidate.target.wardId),
  );

  if (!matchingJurisdiction) {
    rejectionReasons.push('jurisdiction_mismatch');
    return;
  }

  const requiredJurisdictionEvidence: RequiredEvidence[] = [
    { entityType: 'state', entityId: matchingJurisdiction.stateId },
    { entityType: 'local_body', entityId: matchingJurisdiction.localBodyId },
    {
      entityType: 'jurisdiction_boundary',
      versionId: matchingJurisdiction.localBodyBoundaryVersionId,
    },
  ];

  if (matchingJurisdiction.stateBoundaryVersionId !== null) {
    requiredJurisdictionEvidence.push({
      entityType: 'jurisdiction_boundary',
      versionId: matchingJurisdiction.stateBoundaryVersionId,
    });
  }
  if (matchingJurisdiction.districtId === null) {
    if (matchingJurisdiction.districtBoundaryVersionId !== null) {
      rejectionReasons.push('inconsistent_jurisdiction_context:district');
    }
  } else {
    requiredJurisdictionEvidence.push({
      entityType: 'district',
      entityId: matchingJurisdiction.districtId,
    });
    if (matchingJurisdiction.districtBoundaryVersionId === null) {
      rejectionReasons.push('missing_jurisdiction_boundary_version:district');
    } else {
      requiredJurisdictionEvidence.push({
        entityType: 'jurisdiction_boundary',
        versionId: matchingJurisdiction.districtBoundaryVersionId,
      });
    }
  }
  if (matchingJurisdiction.talukaId === null) {
    if (matchingJurisdiction.talukaBoundaryVersionId !== null) {
      rejectionReasons.push('inconsistent_jurisdiction_context:taluka');
    }
  } else {
    requiredJurisdictionEvidence.push({
      entityType: 'taluka',
      entityId: matchingJurisdiction.talukaId,
    });
    if (matchingJurisdiction.talukaBoundaryVersionId === null) {
      rejectionReasons.push('missing_jurisdiction_boundary_version:taluka');
    } else {
      requiredJurisdictionEvidence.push({
        entityType: 'jurisdiction_boundary',
        versionId: matchingJurisdiction.talukaBoundaryVersionId,
      });
    }
  }

  if (candidate.target.wardId !== null && matchingJurisdiction.wardId !== null) {
    requiredJurisdictionEvidence.push({
      entityType: 'ward',
      entityId: matchingJurisdiction.wardId,
    });
    if (matchingJurisdiction.wardBoundaryVersionId === null) {
      rejectionReasons.push('missing_jurisdiction_boundary_version:ward');
    } else {
      requiredJurisdictionEvidence.push({
        entityType: 'jurisdiction_boundary',
        versionId: matchingJurisdiction.wardBoundaryVersionId,
      });
    }
  }

  for (const required of requiredJurisdictionEvidence) {
    if (!matchingJurisdiction.evidence.some((evidence) => evidenceMatches(evidence, required))) {
      rejectionReasons.push(`missing_jurisdiction_evidence:${describeRequiredEvidence(required)}`);
    }
  }

  appendEvidenceRejections(matchingJurisdiction.evidence, rejectionReasons);
};

export const evaluateRoutingEligibility = (
  input: RoutingResolutionInput,
  jurisdiction: JurisdictionResolution,
  candidate: RoutingCandidate,
): RoutingEligibility => {
  const rejectionReasons: string[] = [];

  if (candidate.categoryId !== input.categoryId) {
    rejectionReasons.push('category_mismatch');
  }
  if (input.assetId !== null && candidate.target.assetId !== input.assetId) {
    rejectionReasons.push('asset_mismatch');
  }
  if (candidate.target.assetId === null) {
    if (
      candidate.target.assetTypeId !== null ||
      candidate.target.assetVersionId !== null ||
      candidate.target.assetMatchDistanceMeters !== null ||
      candidate.target.assetOwnershipVersionId !== null
    ) {
      rejectionReasons.push('inconsistent_asset_evidence');
    }
  } else if (
    candidate.target.assetTypeId === null ||
    candidate.target.assetVersionId === null ||
    candidate.target.assetMatchDistanceMeters === null ||
    !Number.isFinite(candidate.target.assetMatchDistanceMeters) ||
    candidate.target.assetMatchDistanceMeters < 0
  ) {
    rejectionReasons.push('incomplete_asset_evidence');
  }
  if (!Number.isInteger(candidate.fallbackDepth) || candidate.fallbackDepth < 0) {
    rejectionReasons.push('invalid_fallback_depth');
  }
  if (candidate.fallbackPath.length !== candidate.fallbackDepth) {
    rejectionReasons.push('invalid_fallback_path');
  }

  appendJurisdictionRejections(jurisdiction, candidate, rejectionReasons);

  for (const required of requiredCandidateEvidence(candidate)) {
    if (!candidate.evidence.some((evidence) => evidenceMatches(evidence, required))) {
      rejectionReasons.push(`missing_candidate_evidence:${describeRequiredEvidence(required)}`);
    }
  }

  appendEvidenceRejections(candidate.evidence, rejectionReasons);

  return {
    eligible: rejectionReasons.length === 0,
    rejectionReasons: [...new Set(rejectionReasons)].sort(),
  };
};
