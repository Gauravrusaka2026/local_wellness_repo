import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  JurisdictionResolution,
  RoutingCandidate,
  RoutingEntityEvidence,
  RoutingEntityType,
  RoutingPolicy,
  RoutingResolutionInput,
  RoutingTarget,
} from '@local-wellness/types';

import { evaluateRoutingCandidates } from '../candidate-ranking.js';
import type { RoutingDataProvider } from '../data-provider.js';
import type { JurisdictionResolver } from '../gis.js';
import { RoutingEngine } from '../routing-engine.js';

const identifiers = {
  asset: '90000000-0000-4000-8000-000000000001',
  assetOwnershipVersion: '90000000-0000-4000-8000-000000000002',
  assetType: '90000000-0000-4000-8000-000000000003',
  assetVersion: '90000000-0000-4000-8000-000000000004',
  authority: '10000000-0000-4000-8000-000000000001',
  authorityDepartment: '10000000-0000-4000-8000-000000000002',
  category: '20000000-0000-4000-8000-000000000001',
  department: '30000000-0000-4000-8000-000000000001',
  district: '30000000-0000-4000-8000-000000000002',
  districtBoundary: '30000000-0000-4000-8000-000000000003',
  localBody: '40000000-0000-4000-8000-000000000001',
  localBodyBoundary: '40000000-0000-4000-8000-000000000002',
  officerRole: '50000000-0000-4000-8000-000000000001',
  rule: '60000000-0000-4000-8000-000000000001',
  ruleVersion: '60000000-0000-4000-8000-000000000002',
  state: '60000000-0000-4000-8000-000000000003',
  stateBoundary: '60000000-0000-4000-8000-000000000004',
  taluka: '60000000-0000-4000-8000-000000000005',
  talukaBoundary: '60000000-0000-4000-8000-000000000006',
  ward: '70000000-0000-4000-8000-000000000001',
  wardBoundary: '70000000-0000-4000-8000-000000000002',
} as const;

const verifiedEvidence = (
  entityType: RoutingEntityType,
  entityId: string,
  versionId: string | null = null,
): RoutingEntityEvidence => ({
  entityType,
  entityId,
  versionId,
  verificationStatus: 'verified',
  isActive: true,
  isPlaceholder: false,
  isRoutingEligible: true,
});

const jurisdiction: JurisdictionResolution = {
  status: 'resolved',
  reason: 'verified_boundary_match',
  matches: [
    {
      stateId: identifiers.state,
      districtId: identifiers.district,
      talukaId: identifiers.taluka,
      localBodyId: identifiers.localBody,
      wardId: identifiers.ward,
      stateBoundaryVersionId: identifiers.stateBoundary,
      districtBoundaryVersionId: identifiers.districtBoundary,
      talukaBoundaryVersionId: identifiers.talukaBoundary,
      localBodyBoundaryVersionId: identifiers.localBodyBoundary,
      wardBoundaryVersionId: identifiers.wardBoundary,
      evidence: [
        verifiedEvidence('state', identifiers.state),
        verifiedEvidence('jurisdiction_boundary', 'state-boundary', identifiers.stateBoundary),
        verifiedEvidence('district', identifiers.district),
        verifiedEvidence(
          'jurisdiction_boundary',
          'district-boundary',
          identifiers.districtBoundary,
        ),
        verifiedEvidence('taluka', identifiers.taluka),
        verifiedEvidence('jurisdiction_boundary', 'taluka-boundary', identifiers.talukaBoundary),
        verifiedEvidence('local_body', identifiers.localBody),
        verifiedEvidence(
          'jurisdiction_boundary',
          'local-body-boundary',
          identifiers.localBodyBoundary,
        ),
        verifiedEvidence('ward', identifiers.ward),
        verifiedEvidence('jurisdiction_boundary', 'ward-boundary', identifiers.wardBoundary),
      ],
    },
  ],
};

const input: RoutingResolutionInput = {
  categoryId: identifiers.category,
  location: { latitude: 18.52, longitude: 73.85 },
  accuracyMeters: 12,
  assetId: null,
  resolvedAt: '2026-07-13T10:00:00.000Z',
};

const policy: RoutingPolicy = {
  id: '80000000-0000-4000-8000-000000000001',
  versionId: '80000000-0000-4000-8000-000000000002',
  version: 1,
  automaticThreshold: 0.8,
  manualReviewThreshold: 0.5,
  ambiguityDelta: 0.05,
  fallbackPenaltyPerLevel: 0.05,
  factors: [
    { code: 'jurisdiction', weight: 0.25, required: true },
    { code: 'category', weight: 0.25, required: true },
    { code: 'department', weight: 0.25, required: true },
    { code: 'role', weight: 0.25, required: true },
  ],
};

interface CandidateOptions {
  candidateId?: string;
  ruleId?: string;
  ruleVersionId?: string;
  departmentId?: string;
  wardId?: string | null;
  assetSpecific?: boolean;
  fallbackDepth?: number;
  fallbackPath?: string[];
  priority?: number;
  missedSignals?: string[];
}

const makeCandidate = (options: CandidateOptions = {}): RoutingCandidate => {
  const ruleId = options.ruleId ?? identifiers.rule;
  const ruleVersionId = options.ruleVersionId ?? identifiers.ruleVersion;
  const departmentId = options.departmentId ?? identifiers.department;
  const wardId = options.wardId === undefined ? identifiers.ward : options.wardId;
  const assetSpecific = options.assetSpecific ?? false;
  const target: RoutingTarget = {
    authorityId: identifiers.authority,
    localBodyId: identifiers.localBody,
    wardId,
    departmentId,
    authorityDepartmentId: identifiers.authorityDepartment,
    officerRoleId: identifiers.officerRole,
    officerAssignmentId: null,
    assetTypeId: assetSpecific ? identifiers.assetType : null,
    assetId: assetSpecific ? identifiers.asset : null,
    assetVersionId: assetSpecific ? identifiers.assetVersion : null,
    assetMatchDistanceMeters: assetSpecific ? 3.5 : null,
    assetOwnershipVersionId: assetSpecific ? identifiers.assetOwnershipVersion : null,
  };
  const evidence = [
    verifiedEvidence('authority', target.authorityId),
    verifiedEvidence('local_body', target.localBodyId),
    verifiedEvidence('category', identifiers.category),
    verifiedEvidence('department', target.departmentId),
    verifiedEvidence('authority_department', target.authorityDepartmentId),
    verifiedEvidence('officer_role', target.officerRoleId),
    verifiedEvidence('routing_rule', ruleId, ruleVersionId),
    ...(wardId === null ? [] : [verifiedEvidence('ward', wardId)]),
    ...(assetSpecific
      ? [
          verifiedEvidence('asset_type', identifiers.assetType),
          verifiedEvidence('asset', identifiers.asset, identifiers.assetVersion),
          verifiedEvidence('asset_ownership', 'asset-ownership', identifiers.assetOwnershipVersion),
        ]
      : []),
  ];
  const missedSignals = new Set(options.missedSignals ?? []);

  return {
    candidateId: options.candidateId ?? 'candidate-primary',
    routingRuleId: ruleId,
    routingRuleVersionId: ruleVersionId,
    routingRuleCode: 'TEST-RULE',
    explanationCode: 'verified_test_route',
    sourceReferenceId: '80000000-0000-4000-8000-000000000003',
    categoryId: identifiers.category,
    priority: options.priority ?? 10,
    fallbackDepth: options.fallbackDepth ?? 0,
    fallbackPath: options.fallbackPath ?? [],
    target,
    evidence,
    confidenceSignals: policy.factors.map(({ code }) => ({
      code,
      matched: !missedSignals.has(code),
      explanation: `test_${code}`,
    })),
  };
};

describe('routing candidate evaluation', () => {
  it('routes only when all required evidence is verified and eligible', () => {
    const decision = evaluateRoutingCandidates(input, jurisdiction, [makeCandidate()], policy);

    assert.equal(decision.status, 'routed');
    assert.equal(decision.routingRuleId, identifiers.rule);
    assert.equal(decision.confidence.score, 1);
    assert.equal(decision.explanation.policyId, policy.id);
    assert.equal(decision.explanation.policyVersionId, policy.versionId);
    assert.equal(decision.explanation.fallbackUsed, false);
  });

  it('never routes a placeholder entity even when every confidence signal matches', () => {
    const candidate = makeCandidate();
    candidate.evidence = candidate.evidence.map((evidence) =>
      evidence.entityType === 'department'
        ? {
            ...evidence,
            verificationStatus: 'placeholder',
            isPlaceholder: true,
            isRoutingEligible: false,
          }
        : evidence,
    );

    const decision = evaluateRoutingCandidates(input, jurisdiction, [candidate], policy);

    assert.equal(decision.status, 'mapping_required');
    assert.equal(decision.target, null);
    assert.equal(
      decision.explanation.candidateEvaluations[0]?.rejectionReasons.some((reason) =>
        reason.startsWith('placeholder_entity:department:'),
      ),
      true,
    );
  });

  it('never routes unverified or explicitly non-routable candidate evidence', () => {
    const scenarios = [
      {
        name: 'unverified',
        update: (evidence: RoutingEntityEvidence): RoutingEntityEvidence => ({
          ...evidence,
          verificationStatus: 'unverified',
        }),
        rejectionPrefix: 'unverified_entity:department:',
      },
      {
        name: 'non-routable',
        update: (evidence: RoutingEntityEvidence): RoutingEntityEvidence => ({
          ...evidence,
          isRoutingEligible: false,
        }),
        rejectionPrefix: 'non_routable_entity:department:',
      },
    ] as const;

    for (const scenario of scenarios) {
      const candidate = makeCandidate({ candidateId: `candidate-${scenario.name}` });
      candidate.evidence = candidate.evidence.map((evidence) =>
        evidence.entityType === 'department' ? scenario.update(evidence) : evidence,
      );

      const decision = evaluateRoutingCandidates(input, jurisdiction, [candidate], policy);

      assert.equal(decision.status, 'mapping_required', scenario.name);
      assert.equal(decision.target, null, scenario.name);
      assert.equal(
        decision.explanation.candidateEvaluations[0]?.rejectionReasons.some((reason) =>
          reason.startsWith(scenario.rejectionPrefix),
        ),
        true,
        scenario.name,
      );
    }
  });

  it('never routes through placeholder jurisdiction evidence', () => {
    const placeholderJurisdiction: JurisdictionResolution = {
      ...jurisdiction,
      matches: jurisdiction.matches.map((match) => ({
        ...match,
        evidence: match.evidence.map((evidence) =>
          evidence.entityType === 'jurisdiction_boundary'
            ? {
                ...evidence,
                verificationStatus: 'placeholder',
                isPlaceholder: true,
                isRoutingEligible: false,
              }
            : evidence,
        ),
      })),
    };

    const decision = evaluateRoutingCandidates(
      input,
      placeholderJurisdiction,
      [makeCandidate()],
      policy,
    );

    assert.equal(decision.status, 'mapping_required');
    assert.equal(decision.target, null);
    assert.equal(
      decision.explanation.candidateEvaluations[0]?.rejectionReasons.some((reason) =>
        reason.startsWith('placeholder_entity:jurisdiction_boundary:'),
      ),
      true,
    );
  });

  it('requires every required confidence factor before considering a candidate eligible', () => {
    const decision = evaluateRoutingCandidates(
      input,
      jurisdiction,
      [makeCandidate({ missedSignals: ['role'] })],
      policy,
    );

    assert.equal(decision.status, 'mapping_required');
    assert.equal(decision.explanation.reason, 'no_eligible_candidate');
    assert.equal(
      decision.explanation.candidateEvaluations[0]?.rejectionReasons.includes(
        'required_confidence_signal_missing:role',
      ),
      true,
    );
  });

  it('routes automatically when an eligible score equals the automatic threshold', () => {
    const automaticPolicy: RoutingPolicy = {
      ...policy,
      automaticThreshold: 0.75,
      factors: policy.factors.map((factor) => ({ ...factor, required: false })),
    };

    const decision = evaluateRoutingCandidates(
      input,
      jurisdiction,
      [makeCandidate({ missedSignals: ['role'] })],
      automaticPolicy,
    );

    assert.equal(decision.status, 'routed');
    assert.equal(decision.confidence.score, 0.75);
    assert.equal(decision.confidence.band, 'high');
    assert.equal(decision.explanation.reason, 'route_resolved');
  });

  it('requires manual review when an eligible score equals its lower threshold', () => {
    const reviewPolicy: RoutingPolicy = {
      ...policy,
      manualReviewThreshold: 0.75,
      factors: policy.factors.map((factor) => ({ ...factor, required: false })),
    };

    const decision = evaluateRoutingCandidates(
      input,
      jurisdiction,
      [makeCandidate({ missedSignals: ['role'] })],
      reviewPolicy,
    );

    assert.equal(decision.status, 'manual_review');
    assert.equal(decision.confidence.score, 0.75);
    assert.equal(decision.confidence.band, 'medium');
    assert.equal(decision.explanation.reason, 'confidence_requires_manual_review');
  });

  it('requires missing mappings for an eligible score below the manual-review threshold', () => {
    const reviewPolicy: RoutingPolicy = {
      ...policy,
      factors: policy.factors.map((factor) => ({ ...factor, required: false })),
    };

    const decision = evaluateRoutingCandidates(
      input,
      jurisdiction,
      [makeCandidate({ missedSignals: ['category', 'department', 'role'] })],
      reviewPolicy,
    );

    assert.equal(decision.status, 'mapping_required');
    assert.equal(decision.confidence.score, 0.25);
    assert.equal(decision.confidence.band, 'low');
    assert.equal(decision.explanation.reason, 'confidence_below_manual_review_threshold');
  });

  it('rejects an invalid candidate priority instead of ranking it', () => {
    const decision = evaluateRoutingCandidates(
      input,
      jurisdiction,
      [makeCandidate({ priority: -1 })],
      policy,
    );

    assert.equal(decision.status, 'mapping_required');
    assert.equal(
      decision.explanation.candidateEvaluations[0]?.rejectionReasons.includes('invalid_priority'),
      true,
    );
  });

  it('rejects self-referencing and duplicate fallback paths as cycles', () => {
    const selfReferencing = makeCandidate({
      candidateId: 'candidate-self-reference',
      fallbackDepth: 1,
      fallbackPath: [identifiers.rule],
    });
    const duplicatePath = makeCandidate({
      candidateId: 'candidate-duplicate-path',
      ruleId: '60000000-0000-4000-8000-000000000070',
      ruleVersionId: '60000000-0000-4000-8000-000000000071',
      fallbackDepth: 2,
      fallbackPath: [identifiers.rule, identifiers.rule],
    });

    for (const candidate of [selfReferencing, duplicatePath]) {
      const decision = evaluateRoutingCandidates(input, jurisdiction, [candidate], policy);

      assert.equal(decision.status, 'mapping_required');
      assert.equal(
        decision.explanation.candidateEvaluations[0]?.rejectionReasons.includes('fallback_cycle'),
        true,
      );
    }
  });

  it('uses a DB-defined fallback only when the direct candidate is ineligible', () => {
    const direct = makeCandidate({ candidateId: 'candidate-direct' });
    direct.evidence = direct.evidence.map((evidence) =>
      evidence.entityType === 'department'
        ? { ...evidence, verificationStatus: 'unverified', isRoutingEligible: false }
        : evidence,
    );
    const fallback = makeCandidate({
      candidateId: 'candidate-fallback',
      ruleId: '60000000-0000-4000-8000-000000000010',
      ruleVersionId: '60000000-0000-4000-8000-000000000011',
      fallbackDepth: 1,
      fallbackPath: [identifiers.rule],
    });

    const decision = evaluateRoutingCandidates(input, jurisdiction, [fallback, direct], policy);

    assert.equal(decision.status, 'routed');
    assert.equal(decision.explanation.selectedCandidateId, 'candidate-fallback');
    assert.equal(decision.explanation.fallbackUsed, true);
    assert.deepEqual(decision.explanation.fallbackPath, [identifiers.rule]);
  });

  it('does not allow a stronger fallback score to displace an eligible direct route', () => {
    const direct = makeCandidate({
      candidateId: 'candidate-direct',
      missedSignals: ['role'],
    });
    const fallback = makeCandidate({
      candidateId: 'candidate-fallback',
      ruleId: '60000000-0000-4000-8000-000000000010',
      ruleVersionId: '60000000-0000-4000-8000-000000000011',
      fallbackDepth: 1,
      fallbackPath: [identifiers.rule],
    });
    const permissivePolicy: RoutingPolicy = {
      ...policy,
      automaticThreshold: 0.7,
      factors: policy.factors.map((factor) => ({ ...factor, required: false })),
    };

    const decision = evaluateRoutingCandidates(
      input,
      jurisdiction,
      [fallback, direct],
      permissivePolicy,
    );

    assert.equal(decision.status, 'routed');
    assert.equal(decision.explanation.selectedCandidateId, 'candidate-direct');
    assert.equal(decision.confidence.score, 0.75);
    assert.equal(decision.explanation.fallbackUsed, false);
  });

  it('prefers asset, then ward, then local-body specificity before priority and confidence', () => {
    const localBodyCandidate = makeCandidate({
      candidateId: 'candidate-local-body',
      wardId: null,
      priority: 1,
    });
    const wardCandidate = makeCandidate({
      candidateId: 'candidate-ward',
      priority: 1,
    });
    const assetCandidate = makeCandidate({
      candidateId: 'candidate-asset',
      assetSpecific: true,
      priority: 50,
      missedSignals: ['role'],
    });
    const permissivePolicy: RoutingPolicy = {
      ...policy,
      automaticThreshold: 0.7,
      factors: policy.factors.map((factor) => ({ ...factor, required: false })),
    };

    const decision = evaluateRoutingCandidates(
      input,
      jurisdiction,
      [localBodyCandidate, wardCandidate, assetCandidate],
      permissivePolicy,
    );
    const wardDecision = evaluateRoutingCandidates(
      input,
      jurisdiction,
      [localBodyCandidate, wardCandidate],
      permissivePolicy,
    );

    assert.equal(decision.status, 'routed');
    assert.equal(decision.explanation.selectedCandidateId, 'candidate-asset');
    assert.equal(decision.target?.assetId, identifiers.asset);
    assert.equal(decision.target?.assetVersionId, identifiers.assetVersion);
    assert.equal(decision.target?.assetMatchDistanceMeters, 3.5);
    assert.equal(wardDecision.status, 'routed');
    assert.equal(wardDecision.explanation.selectedCandidateId, 'candidate-ward');
  });

  it('rejects asset candidates without exact geometry-version and distance evidence', () => {
    const candidate = makeCandidate({ assetSpecific: true });
    candidate.target = {
      ...candidate.target,
      assetVersionId: null,
      assetMatchDistanceMeters: null,
    };

    const decision = evaluateRoutingCandidates(input, jurisdiction, [candidate], policy);

    assert.equal(decision.status, 'mapping_required');
    assert.equal(
      decision.explanation.candidateEvaluations[0]?.rejectionReasons.includes(
        'incomplete_asset_evidence',
      ),
      true,
    );
  });

  it('applies DB priority before confidence for equally specific direct candidates', () => {
    const higherPriority = makeCandidate({
      candidateId: 'candidate-priority-1',
      priority: 1,
      missedSignals: ['role'],
    });
    const strongerConfidence = makeCandidate({
      candidateId: 'candidate-priority-10',
      ruleId: '60000000-0000-4000-8000-000000000030',
      ruleVersionId: '60000000-0000-4000-8000-000000000031',
      priority: 10,
    });
    const permissivePolicy: RoutingPolicy = {
      ...policy,
      automaticThreshold: 0.7,
      factors: policy.factors.map((factor) => ({ ...factor, required: false })),
    };

    const decision = evaluateRoutingCandidates(
      input,
      jurisdiction,
      [strongerConfidence, higherPriority],
      permissivePolicy,
    );

    assert.equal(decision.status, 'routed');
    assert.equal(decision.explanation.selectedCandidateId, 'candidate-priority-1');
    assert.equal(decision.confidence.score, 0.75);
  });

  it('uses the candidate identifier as a deterministic tie-breaker for the same target', () => {
    const first = makeCandidate({
      candidateId: 'candidate-a',
      ruleId: '60000000-0000-4000-8000-000000000040',
      ruleVersionId: '60000000-0000-4000-8000-000000000041',
    });
    const second = makeCandidate({
      candidateId: 'candidate-b',
      ruleId: '60000000-0000-4000-8000-000000000050',
      ruleVersionId: '60000000-0000-4000-8000-000000000051',
    });

    const decision = evaluateRoutingCandidates(input, jurisdiction, [second, first], policy);

    assert.equal(decision.status, 'routed');
    assert.equal(decision.explanation.selectedCandidateId, 'candidate-a');
    assert.equal(decision.explanation.reason, 'route_resolved');
  });

  it('requires manual review when equally ranked rules disagree on the target', () => {
    const first = makeCandidate({ candidateId: 'candidate-a' });
    const second = makeCandidate({
      candidateId: 'candidate-b',
      ruleId: '60000000-0000-4000-8000-000000000020',
      ruleVersionId: '60000000-0000-4000-8000-000000000021',
      departmentId: '30000000-0000-4000-8000-000000000099',
    });
    const unrelatedLowerPriority = makeCandidate({
      candidateId: 'candidate-c',
      ruleId: '60000000-0000-4000-8000-000000000030',
      ruleVersionId: '60000000-0000-4000-8000-000000000031',
      departmentId: '30000000-0000-4000-8000-000000000098',
      priority: 20,
    });

    const decision = evaluateRoutingCandidates(
      input,
      jurisdiction,
      [unrelatedLowerPriority, second, first],
      policy,
    );

    assert.equal(decision.status, 'manual_review');
    assert.equal(decision.target, null);
    assert.equal(decision.explanation.reason, 'ambiguous_candidate_scores');
    assert.deepEqual(decision.explanation.ambiguousCandidateIds, ['candidate-a', 'candidate-b']);
  });
});

describe('routing engine orchestration', () => {
  it('uses a single routing-context read after jurisdiction resolution', async () => {
    let contextReads = 0;
    const resolver: JurisdictionResolver = {
      resolveJurisdiction: async () => jurisdiction,
    };
    const provider: RoutingDataProvider = {
      loadRoutingContext: async () => {
        contextReads += 1;
        return { policy, candidates: [makeCandidate()] };
      },
    };

    const decision = await new RoutingEngine(resolver, provider).resolve(input);

    assert.equal(decision.status, 'routed');
    assert.equal(contextReads, 1);
  });

  it('requires a database-backed routing policy before evaluating candidates', async () => {
    const resolver: JurisdictionResolver = {
      resolveJurisdiction: async () => jurisdiction,
    };
    const provider: RoutingDataProvider = {
      loadRoutingContext: async () => ({ policy: null, candidates: [makeCandidate()] }),
    };

    const decision = await new RoutingEngine(resolver, provider).resolve(input);

    assert.equal(decision.status, 'mapping_required');
    assert.equal(decision.target, null);
    assert.equal(decision.explanation.reason, 'routing_policy_missing');
    assert.equal(decision.explanation.policyId, null);
    assert.deepEqual(decision.explanation.candidateEvaluations, []);
  });

  it('returns unsupported without querying routing records when no boundary covers the point', async () => {
    const resolver: JurisdictionResolver = {
      resolveJurisdiction: async () => ({
        status: 'unsupported',
        matches: [],
        reason: 'no_verified_boundary',
      }),
    };
    const provider: RoutingDataProvider = {
      loadRoutingContext: async () => {
        throw new Error('Routing data must not be read for an unsupported location.');
      },
    };

    const decision = await new RoutingEngine(resolver, provider).resolve(input);

    assert.equal(decision.status, 'unsupported_area');
    assert.equal(decision.explanation.reason, 'no_verified_boundary');
  });

  it('requires manual review without querying routing records for ambiguous jurisdictions', async () => {
    const primaryMatch = jurisdiction.matches[0];
    assert.ok(primaryMatch);
    const ambiguousJurisdiction: JurisdictionResolution = {
      status: 'ambiguous',
      reason: 'multiple_verified_boundaries',
      matches: [
        primaryMatch,
        {
          ...primaryMatch,
          localBodyId: '40000000-0000-4000-8000-000000000099',
          evidence: primaryMatch.evidence.map((evidence) =>
            evidence.entityType === 'local_body'
              ? { ...evidence, entityId: '40000000-0000-4000-8000-000000000099' }
              : evidence,
          ),
        },
      ],
    };
    const resolver: JurisdictionResolver = {
      resolveJurisdiction: async () => ambiguousJurisdiction,
    };
    const provider: RoutingDataProvider = {
      loadRoutingContext: async () => {
        throw new Error('Routing data must not be read for an ambiguous jurisdiction.');
      },
    };

    const decision = await new RoutingEngine(resolver, provider).resolve(input);

    assert.equal(decision.status, 'manual_review');
    assert.equal(decision.target, null);
    assert.equal(decision.explanation.reason, 'multiple_verified_boundaries');
    assert.equal(decision.explanation.jurisdiction.status, 'ambiguous');
  });
});
