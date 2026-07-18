import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type {
  JurisdictionMatch,
  RoutingDecision,
  RoutingEntityEvidence,
  RoutingEntityType,
  RoutingResolutionInput,
  RoutingTarget,
} from '@local-wellness/types';

import {
  RoutingDataAccessError,
  RoutingDecisionIdempotencyConflictError,
} from '../data/routing.store.js';
import { SupabaseClients } from '../supabase/supabase-clients.js';
import { SupabaseRoutingStore } from '../supabase/supabase-routing.store.js';

const identifiers = {
  actor: '10000000-0000-4000-8000-000000000001',
  asset: '10000000-0000-4000-8000-000000000002',
  assetOwnershipVersion: '10000000-0000-4000-8000-000000000003',
  assetType: '10000000-0000-4000-8000-000000000004',
  assetVersion: '10000000-0000-4000-8000-000000000005',
  authority: '20000000-0000-4000-8000-000000000001',
  authorityDepartment: '20000000-0000-4000-8000-000000000002',
  category: '30000000-0000-4000-8000-000000000001',
  decision: '30000000-0000-4000-8000-000000000002',
  department: '40000000-0000-4000-8000-000000000001',
  district: '40000000-0000-4000-8000-000000000002',
  districtBoundary: '40000000-0000-4000-8000-000000000003',
  localBody: '50000000-0000-4000-8000-000000000001',
  localBodyBoundary: '50000000-0000-4000-8000-000000000002',
  officerRole: '60000000-0000-4000-8000-000000000001',
  policy: '70000000-0000-4000-8000-000000000001',
  policyVersion: '70000000-0000-4000-8000-000000000002',
  rule: '80000000-0000-4000-8000-000000000001',
  ruleVersion: '80000000-0000-4000-8000-000000000002',
  source: '90000000-0000-4000-8000-000000000001',
  state: '90000000-0000-4000-8000-000000000002',
  stateBoundary: '90000000-0000-4000-8000-000000000003',
  taluka: '90000000-0000-4000-8000-000000000004',
  talukaBoundary: '90000000-0000-4000-8000-000000000005',
  ward: 'a0000000-0000-4000-8000-000000000001',
  wardBoundary: 'a0000000-0000-4000-8000-000000000002',
} as const;

const capturedAt = '2026-07-13T10:59:55.000Z';
const resolvedAt = '2026-07-13T11:00:00.000Z';

interface RpcCall {
  functionName: string;
  arguments_: Record<string, unknown>;
}

type RpcHandler = (
  functionName: string,
  arguments_: Record<string, unknown>,
) => Promise<Readonly<{ data: unknown; error: unknown }>>;

const createStore = (rpc: RpcHandler): SupabaseRoutingStore =>
  new SupabaseRoutingStore({
    publicClient: {
      rpc: () => {
        throw new Error('The public client must not be used for routing persistence.');
      },
    },
    serviceRoleClient: { rpc },
  } as unknown as SupabaseClients);

const categoryRow = {
  category_id: identifiers.category,
  domain_code: 'public_realm',
  category_code: 'test_issue',
  category_name: 'Test issue',
  description: 'Test routing category.',
  parent_category_id: null,
  classification_level: 'category',
  default_severity: 'medium',
  requires_asset: false,
  requires_location: true,
  location_requirement: 'required',
  is_emergency: false,
  minimum_media_count: 0,
  maximum_media_count: 5,
  required_attributes: [],
  media_requirements: {},
  verification_status: 'verified',
  is_placeholder: false,
  is_routing_eligible: true,
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

const jurisdictionEvidence = [
  verifiedEvidence('state', identifiers.state),
  verifiedEvidence('district', identifiers.district),
  verifiedEvidence('taluka', identifiers.taluka),
  verifiedEvidence('jurisdiction_boundary', identifiers.stateBoundary, identifiers.stateBoundary),
  verifiedEvidence(
    'jurisdiction_boundary',
    identifiers.districtBoundary,
    identifiers.districtBoundary,
  ),
  verifiedEvidence('jurisdiction_boundary', identifiers.talukaBoundary, identifiers.talukaBoundary),
  verifiedEvidence('local_body', identifiers.localBody),
  verifiedEvidence(
    'jurisdiction_boundary',
    identifiers.localBodyBoundary,
    identifiers.localBodyBoundary,
  ),
  verifiedEvidence('ward', identifiers.ward),
  verifiedEvidence('jurisdiction_boundary', identifiers.wardBoundary, identifiers.wardBoundary),
];

const jurisdictionRow = {
  state_id: identifiers.state,
  district_id: identifiers.district,
  taluka_id: identifiers.taluka,
  local_body_id: identifiers.localBody,
  ward_id: identifiers.ward,
  state_boundary_version_id: identifiers.stateBoundary,
  district_boundary_version_id: identifiers.districtBoundary,
  taluka_boundary_version_id: identifiers.talukaBoundary,
  local_body_boundary_version_id: identifiers.localBodyBoundary,
  ward_boundary_version_id: identifiers.wardBoundary,
  evidence_metadata: { evidence: jurisdictionEvidence },
};

const jurisdictionMatch: JurisdictionMatch = {
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
  evidence: jurisdictionEvidence,
};

const routingInput: RoutingResolutionInput = {
  categoryId: identifiers.category,
  location: { latitude: 18.5204, longitude: 73.8567 },
  accuracyMeters: 12,
  assetId: null,
  resolvedAt,
};

const target: RoutingTarget = {
  authorityId: identifiers.authority,
  localBodyId: identifiers.localBody,
  wardId: identifiers.ward,
  departmentId: identifiers.department,
  authorityDepartmentId: identifiers.authorityDepartment,
  officerRoleId: identifiers.officerRole,
  officerAssignmentId: null,
  assetTypeId: null,
  assetId: null,
  assetVersionId: null,
  assetMatchDistanceMeters: null,
  assetOwnershipVersionId: null,
};

const candidateEvidence = [
  ...jurisdictionEvidence,
  verifiedEvidence('authority', identifiers.authority),
  verifiedEvidence('category', identifiers.category),
  verifiedEvidence('department', identifiers.department),
  verifiedEvidence('authority_department', identifiers.authorityDepartment),
  verifiedEvidence('officer_role', identifiers.officerRole),
  verifiedEvidence('routing_rule', identifiers.rule, identifiers.ruleVersion),
];

const policyFactors = [
  { code: 'jurisdiction', weight: 0.25, required: true },
  { code: 'category', weight: 0.25, required: true },
  { code: 'department', weight: 0.25, required: true },
  { code: 'role', weight: 0.25, required: true },
];

const confidenceSignals = policyFactors.map(({ code }) => ({
  code,
  matched: true,
  explanation: `matched_${code}`,
}));

const candidateRow = {
  candidate_id: 'candidate:test',
  category_id: identifiers.category,
  category_code: 'test_issue',
  state_id: identifiers.state,
  district_id: identifiers.district,
  taluka_id: identifiers.taluka,
  local_body_id: identifiers.localBody,
  ward_id: identifiers.ward,
  state_boundary_version_id: identifiers.stateBoundary,
  district_boundary_version_id: identifiers.districtBoundary,
  taluka_boundary_version_id: identifiers.talukaBoundary,
  local_body_boundary_version_id: identifiers.localBodyBoundary,
  ward_boundary_version_id: identifiers.wardBoundary,
  asset_type_id: null,
  asset_id: null,
  asset_version_id: null,
  asset_ownership_version_id: null,
  target_authority_id: identifiers.authority,
  department_id: identifiers.department,
  authority_department_id: identifiers.authorityDepartment,
  officer_role_id: identifiers.officerRole,
  officer_assignment_id: null,
  route_rule_id: identifiers.rule,
  route_rule_version_id: identifiers.ruleVersion,
  routing_rule_code: 'TEST-RULE',
  confidence_policy_id: identifiers.policy,
  confidence_policy_version_id: identifiers.policyVersion,
  confidence_policy_version: 1,
  confidence_weights: {
    automaticThreshold: 0.8,
    manualReviewThreshold: 0.5,
    ambiguityDelta: 0.05,
    fallbackPenaltyPerLevel: 0.05,
    factors: policyFactors,
  },
  fallback_depth: 0,
  fallback_path: [],
  priority: 10,
  asset_match_distance_meters: null,
  explanation_metadata: {
    explanationCode: 'verified_test_route',
    evidence: candidateEvidence,
    confidenceSignals,
    jurisdictionBoundaryVersionIds: [
      identifiers.stateBoundary,
      identifiers.districtBoundary,
      identifiers.talukaBoundary,
      identifiers.localBodyBoundary,
      identifiers.wardBoundary,
    ],
    sourceReferenceId: identifiers.source,
  },
};

const policyRow = {
  confidence_policy_id: identifiers.policy,
  confidence_policy_version_id: identifiers.policyVersion,
  confidence_policy_version: 1,
  confidence_weights: candidateRow.confidence_weights,
};

const confidenceFactors = policyFactors.map((factor) => ({
  ...factor,
  matched: true,
  contribution: factor.weight,
  explanation: `matched_${factor.code}`,
}));

const routedDecision: RoutingDecision = {
  status: 'routed',
  categoryId: identifiers.category,
  target,
  routingRuleId: identifiers.rule,
  routingRuleVersionId: identifiers.ruleVersion,
  confidence: {
    score: 1,
    band: 'high',
    factors: confidenceFactors,
  },
  explanation: {
    reason: 'route_resolved',
    policyId: identifiers.policy,
    policyVersionId: identifiers.policyVersion,
    policyVersion: 1,
    jurisdiction: {
      status: 'resolved',
      reason: 'verified_jurisdiction_match',
      matches: [jurisdictionMatch],
    },
    selectedCandidateId: 'candidate:test',
    selectedRoutingRuleId: identifiers.rule,
    selectedRoutingRuleVersionId: identifiers.ruleVersion,
    fallbackUsed: false,
    fallbackPath: [],
    ambiguousCandidateIds: [],
    candidateEvaluations: [
      {
        candidateId: 'candidate:test',
        routingRuleId: identifiers.rule,
        routingRuleVersionId: identifiers.ruleVersion,
        explanationCode: 'verified_test_route',
        sourceReferenceId: identifiers.source,
        target,
        eligible: true,
        rejectionReasons: [],
        fallbackDepth: 0,
        confidence: {
          score: 1,
          band: 'high',
          factors: confidenceFactors,
        },
      },
    ],
  },
};

describe('Supabase routing category catalog', () => {
  it('uses only the service-role RPC and maps verified routing categories', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      return { data: [categoryRow], error: null };
    });

    const categories = await store.listRoutingCategories();
    const category = await store.findRoutingCategory(identifiers.category);

    assert.deepEqual(categories, [
      {
        id: identifiers.category,
        code: 'test_issue',
        name: 'Test issue',
        description: 'Test routing category.',
        parentCategoryId: null,
        requiresAsset: false,
        requiresLocation: true,
        isEmergency: false,
        minimumMediaCount: 0,
        maximumMediaCount: 5,
        requiredAttributes: [],
        recommendedMediaKinds: [],
      },
    ]);
    assert.equal(category?.id, identifiers.category);
    assert.deepEqual(calls, [
      {
        functionName: 'list_routing_categories',
        arguments_: { p_include_non_routable: false },
      },
      {
        functionName: 'list_routing_categories',
        arguments_: { p_include_non_routable: false },
      },
    ]);
  });

  it('derives catalog availability from the verified-only RPC result and omits placeholders', async () => {
    const calls: RpcCall[] = [];
    const unavailableRow = {
      ...categoryRow,
      category_id: '30000000-0000-4000-8000-000000000003',
      category_code: 'awaiting_verified_route',
      category_name: 'Awaiting verified route',
      verification_status: 'unverified',
      is_routing_eligible: false,
    } as const;
    const placeholderRow = {
      ...categoryRow,
      category_id: '30000000-0000-4000-8000-000000000004',
      category_code: 'placeholder_issue',
      category_name: 'Placeholder issue',
      verification_status: 'placeholder',
      is_placeholder: true,
      is_routing_eligible: false,
    } as const;
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      return arguments_['p_include_non_routable'] === true
        ? { data: [categoryRow, unavailableRow, placeholderRow], error: null }
        : { data: [categoryRow], error: null };
    });

    const catalog = await store.listRoutingCategoryCatalog();

    assert.deepEqual(
      catalog.map((item) => ({
        id: item.id,
        submissionAvailability: item.submissionAvailability,
      })),
      [
        { id: identifiers.category, submissionAvailability: 'available' },
        { id: unavailableRow.category_id, submissionAvailability: 'unavailable' },
      ],
    );
    assert.deepEqual(calls, [
      {
        functionName: 'list_routing_categories',
        arguments_: { p_include_non_routable: true },
      },
      {
        functionName: 'list_routing_categories',
        arguments_: { p_include_non_routable: false },
      },
    ]);
  });

  it('fails the catalog closed when the verified snapshot is not present in the full snapshot', async () => {
    const store = createStore(async (_functionName, arguments_) =>
      arguments_['p_include_non_routable'] === true
        ? { data: [], error: null }
        : { data: [categoryRow], error: null },
    );

    await assert.rejects(store.listRoutingCategoryCatalog(), RoutingDataAccessError);
  });

  it('does not expose placeholder categories through list or direct lookup', async () => {
    const placeholder = {
      ...categoryRow,
      verification_status: 'placeholder',
      is_placeholder: true,
      is_routing_eligible: false,
    };
    const store = createStore(async () => ({ data: [], error: null }));
    const unsafeStore = createStore(async () => ({ data: [placeholder], error: null }));

    assert.equal(await store.findRoutingCategory(identifiers.category), null);
    assert.deepEqual(await store.listRoutingCategories(), []);
    await assert.rejects(
      unsafeStore.findRoutingCategory(identifiers.category),
      RoutingDataAccessError,
    );
  });

  it('fails closed on malformed catalog rows and normalizes RPC errors', async () => {
    const malformedStore = createStore(async () => ({
      data: [{ ...categoryRow, category_name: null }],
      error: null,
    }));
    const unavailableStore = createStore(async () => ({
      data: null,
      error: { message: 'database detail that must not escape' },
    }));

    await assert.rejects(malformedStore.listRoutingCategories(), RoutingDataAccessError);
    await assert.rejects(unavailableStore.listRoutingCategories(), RoutingDataAccessError);
  });

  it('preserves the Supabase client receiver when invoking RPC methods', async () => {
    const serviceRoleClient = {
      rpc(this: unknown, functionName: string, arguments_: Record<string, unknown>) {
        assert.equal(this, serviceRoleClient);
        assert.equal(functionName, 'list_routing_categories');
        assert.deepEqual(arguments_, { p_include_non_routable: false });
        return Promise.resolve({ data: [categoryRow], error: null });
      },
    };
    const store = new SupabaseRoutingStore({ serviceRoleClient } as unknown as SupabaseClients);

    assert.equal((await store.listRoutingCategories())[0]?.id, identifiers.category);
  });
});

describe('Supabase routing jurisdiction resolution', () => {
  it('decodes verified PostGIS evidence and passes accuracy to the service RPC', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      return { data: [jurisdictionRow], error: null };
    });

    const result = await store.resolveJurisdiction({
      location: routingInput.location,
      accuracyMeters: routingInput.accuracyMeters,
      resolvedAt,
    });

    assert.equal(result.status, 'resolved');
    assert.deepEqual(result.matches, [jurisdictionMatch]);
    assert.deepEqual(calls, [
      {
        functionName: 'resolve_jurisdiction_context',
        arguments_: {
          p_longitude: 73.8567,
          p_latitude: 18.5204,
          p_accuracy_meters: 12,
          p_resolved_at: resolvedAt,
        },
      },
    ]);
  });

  it('distinguishes unsupported and accuracy-ambiguous jurisdictions', async () => {
    const unsupported = createStore(async () => ({ data: [], error: null }));
    const ambiguous = createStore(async () => ({
      data: [
        jurisdictionRow,
        {
          ...jurisdictionRow,
          ward_id: null,
          ward_boundary_version_id: null,
          evidence_metadata: {
            evidence: jurisdictionEvidence.filter(
              (evidence) =>
                evidence.entityType !== 'ward' && evidence.entityId !== identifiers.wardBoundary,
            ),
          },
        },
      ],
      error: null,
    }));
    const query = {
      location: routingInput.location,
      accuracyMeters: routingInput.accuracyMeters,
      resolvedAt,
    };

    assert.equal((await unsupported.resolveJurisdiction(query)).status, 'unsupported');
    assert.equal((await ambiguous.resolveJurisdiction(query)).status, 'ambiguous');
    assert.equal((await ambiguous.resolveJurisdiction(query)).matches.length, 2);
  });

  it('rejects incomplete or ineligible jurisdiction evidence', async () => {
    const store = createStore(async () => ({
      data: [
        {
          ...jurisdictionRow,
          evidence_metadata: {
            evidence: jurisdictionEvidence.map((evidence) =>
              evidence.entityType === 'local_body'
                ? {
                    ...evidence,
                    verificationStatus: 'placeholder',
                    isPlaceholder: true,
                    isRoutingEligible: false,
                  }
                : evidence,
            ),
          },
        },
      ],
      error: null,
    }));
    const inconsistentWardStore = createStore(async () => ({
      data: [{ ...jurisdictionRow, ward_id: null }],
      error: null,
    }));
    const query = {
      location: routingInput.location,
      accuracyMeters: routingInput.accuracyMeters,
      resolvedAt,
    };

    await assert.rejects(store.resolveJurisdiction(query), RoutingDataAccessError);
    await assert.rejects(inconsistentWardStore.resolveJurisdiction(query), RoutingDataAccessError);
  });
});

describe('Supabase routing asset discovery', () => {
  const assetRow = {
    asset_id: identifiers.asset,
    display_name: 'Verified asset 24',
    asset_type_name: 'Streetlight',
    distance_meters: 8.25,
  } as const;

  it('uses the bounded service-role PostGIS RPC and maps only public-safe fields', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      return { data: [assetRow], error: null };
    });

    const assets = await store.discoverRoutingAssets({
      categoryId: identifiers.category,
      location: routingInput.location,
      accuracyMeters: routingInput.accuracyMeters,
      resolvedAt,
    });

    assert.deepEqual(assets, [
      {
        id: identifiers.asset,
        displayName: 'Verified asset 24',
        assetTypeName: 'Streetlight',
        distanceMeters: 8.25,
      },
    ]);
    assert.deepEqual(calls, [
      {
        functionName: 'discover_routing_assets',
        arguments_: {
          p_category_id: identifiers.category,
          p_longitude: 73.8567,
          p_latitude: 18.5204,
          p_accuracy_meters: 12,
          p_resolved_at: resolvedAt,
          p_limit: 25,
        },
      },
    ]);
  });

  it('fails closed on duplicate, malformed, or oversized RPC results', async () => {
    const duplicateStore = createStore(async () => ({ data: [assetRow, assetRow], error: null }));
    const malformedStore = createStore(async () => ({
      data: [{ ...assetRow, owner_phone: 'must-not-cross-the-boundary' }],
      error: null,
    }));
    const oversizedStore = createStore(async () => ({
      data: Array.from({ length: 26 }, (_, index) => ({
        ...assetRow,
        asset_id: `10000000-0000-4000-8000-${String(index + 100).padStart(12, '0')}`,
      })),
      error: null,
    }));
    const query = {
      categoryId: identifiers.category,
      location: routingInput.location,
      accuracyMeters: routingInput.accuracyMeters,
      resolvedAt,
    };

    await assert.rejects(duplicateStore.discoverRoutingAssets(query), RoutingDataAccessError);
    await assert.rejects(malformedStore.discoverRoutingAssets(query), RoutingDataAccessError);
    await assert.rejects(oversizedStore.discoverRoutingAssets(query), RoutingDataAccessError);
  });
});

describe('Supabase routing candidate context', () => {
  it('decodes a consistent versioned policy, routing target, signals, and evidence', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      return { data: [candidateRow], error: null };
    });

    const context = await store.loadRoutingContext(routingInput, {
      status: 'resolved',
      reason: 'verified_jurisdiction_match',
      matches: [jurisdictionMatch],
    });

    assert.deepEqual(context.policy, {
      id: identifiers.policy,
      versionId: identifiers.policyVersion,
      version: 1,
      automaticThreshold: 0.8,
      manualReviewThreshold: 0.5,
      ambiguityDelta: 0.05,
      fallbackPenaltyPerLevel: 0.05,
      factors: policyFactors,
    });
    assert.equal(
      context.candidates[0]?.target.authorityDepartmentId,
      identifiers.authorityDepartment,
    );
    assert.deepEqual(context.candidates[0]?.confidenceSignals, confidenceSignals);
    assert.equal(
      context.candidates[0]?.evidence.some(
        (evidence) => evidence.entityType === 'authority_department',
      ),
      true,
    );
    assert.deepEqual(calls, [
      {
        functionName: 'resolve_routing_candidates',
        arguments_: {
          p_longitude: 73.8567,
          p_latitude: 18.5204,
          p_accuracy_meters: 12,
          p_category_id: identifiers.category,
          p_asset_id: null,
          p_resolved_at: resolvedAt,
        },
      },
    ]);
  });

  it('loads the applicable policy separately when no routing candidates exist', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      return {
        data: functionName === 'resolve_routing_candidates' ? [] : [policyRow],
        error: null,
      };
    });
    const jurisdiction = {
      status: 'resolved' as const,
      reason: 'verified_jurisdiction_match',
      matches: [jurisdictionMatch],
    };

    assert.deepEqual(await store.loadRoutingContext(routingInput, jurisdiction), {
      policy: {
        id: identifiers.policy,
        versionId: identifiers.policyVersion,
        version: 1,
        automaticThreshold: 0.8,
        manualReviewThreshold: 0.5,
        ambiguityDelta: 0.05,
        fallbackPenaltyPerLevel: 0.05,
        factors: policyFactors,
      },
      candidates: [],
    });
    assert.deepEqual(calls, [
      {
        functionName: 'resolve_routing_candidates',
        arguments_: {
          p_longitude: 73.8567,
          p_latitude: 18.5204,
          p_accuracy_meters: 12,
          p_category_id: identifiers.category,
          p_asset_id: null,
          p_resolved_at: resolvedAt,
        },
      },
      {
        functionName: 'resolve_routing_policy_context',
        arguments_: {
          p_category_id: identifiers.category,
          p_local_body_id: identifiers.localBody,
          p_ward_id: identifiers.ward,
          p_resolved_at: resolvedAt,
        },
      },
    ]);
  });

  it('returns no policy when no applicable policy exists', async () => {
    const store = createStore(async () => ({ data: [], error: null }));
    const jurisdiction = {
      status: 'resolved' as const,
      reason: 'verified_jurisdiction_match',
      matches: [jurisdictionMatch],
    };

    assert.deepEqual(await store.loadRoutingContext(routingInput, jurisdiction), {
      policy: null,
      candidates: [],
    });
  });

  it('rejects ambiguous, malformed, or candidate-inconsistent policy versions', async () => {
    const inconsistentStore = createStore(async () => ({
      data: [
        candidateRow,
        {
          ...candidateRow,
          candidate_id: 'candidate:other',
          confidence_policy_version: 2,
        },
      ],
      error: null,
    }));
    const ambiguousPolicyStore = createStore(async (functionName) => ({
      data:
        functionName === 'resolve_routing_candidates'
          ? []
          : [policyRow, { ...policyRow, confidence_policy_version: 2 }],
      error: null,
    }));
    const malformedPolicyStore = createStore(async (functionName) => ({
      data:
        functionName === 'resolve_routing_candidates'
          ? []
          : [{ ...policyRow, confidence_weights: { automaticThreshold: 0.8 } }],
      error: null,
    }));
    const jurisdiction = {
      status: 'resolved' as const,
      reason: 'verified_jurisdiction_match',
      matches: [jurisdictionMatch],
    };

    await assert.rejects(
      inconsistentStore.loadRoutingContext(routingInput, jurisdiction),
      RoutingDataAccessError,
    );
    await assert.rejects(
      ambiguousPolicyStore.loadRoutingContext(routingInput, jurisdiction),
      RoutingDataAccessError,
    );
    await assert.rejects(
      malformedPolicyStore.loadRoutingContext(routingInput, jurisdiction),
      RoutingDataAccessError,
    );
  });

  it('preserves versioned asset ownership evidence and rejects malformed asset versions', async () => {
    const assetEvidence = [
      ...candidateEvidence,
      verifiedEvidence('asset_type', identifiers.assetType),
      verifiedEvidence('asset', identifiers.asset, identifiers.assetVersion),
      verifiedEvidence(
        'asset_ownership',
        identifiers.assetOwnershipVersion,
        identifiers.assetOwnershipVersion,
      ),
    ];
    const assetCandidate = {
      ...candidateRow,
      asset_type_id: identifiers.assetType,
      asset_id: identifiers.asset,
      asset_version_id: identifiers.assetVersion,
      asset_ownership_version_id: identifiers.assetOwnershipVersion,
      asset_match_distance_meters: 3.5,
      explanation_metadata: {
        ...candidateRow.explanation_metadata,
        evidence: assetEvidence,
      },
    };
    const assetInput = { ...routingInput, assetId: identifiers.asset };
    const jurisdiction = {
      status: 'resolved' as const,
      reason: 'verified_jurisdiction_match',
      matches: [jurisdictionMatch],
    };
    const store = createStore(async () => ({ data: [assetCandidate], error: null }));
    const malformedStore = createStore(async () => ({
      data: [{ ...assetCandidate, asset_version_id: null }],
      error: null,
    }));

    const context = await store.loadRoutingContext(assetInput, jurisdiction);

    assert.equal(context.candidates[0]?.target.assetId, identifiers.asset);
    assert.equal(context.candidates[0]?.target.assetVersionId, identifiers.assetVersion);
    assert.equal(context.candidates[0]?.target.assetMatchDistanceMeters, 3.5);
    assert.equal(
      context.candidates[0]?.target.assetOwnershipVersionId,
      identifiers.assetOwnershipVersion,
    );
    await assert.rejects(
      malformedStore.loadRoutingContext(assetInput, jurisdiction),
      RoutingDataAccessError,
    );
  });

  it('accepts candidate evidence without duplicate boundary entries after jurisdiction verification', async () => {
    const jurisdiction = {
      status: 'resolved' as const,
      reason: 'verified_jurisdiction_match',
      matches: [jurisdictionMatch],
    };
    const candidateWithoutBoundaryEvidence = {
      ...candidateRow,
      explanation_metadata: {
        ...candidateRow.explanation_metadata,
        evidence: candidateEvidence.filter(
          (evidence) => evidence.entityType !== 'jurisdiction_boundary',
        ),
      },
    };
    const store = createStore(async () => ({
      data: [candidateWithoutBoundaryEvidence],
      error: null,
    }));

    const context = await store.loadRoutingContext(routingInput, jurisdiction);

    assert.equal(context.candidates.length, 1);
    assert.equal(context.candidates[0]?.target.wardId, identifiers.ward);
  });

  it('rejects candidate rows with incomplete or inconsistent jurisdiction evidence', async () => {
    const jurisdiction = {
      status: 'resolved' as const,
      reason: 'verified_jurisdiction_match',
      matches: [jurisdictionMatch],
    };
    const inconsistentVersionsStore = createStore(async () => ({
      data: [
        {
          ...candidateRow,
          explanation_metadata: {
            ...candidateRow.explanation_metadata,
            jurisdictionBoundaryVersionIds: [
              identifiers.stateBoundary,
              identifiers.districtBoundary,
              identifiers.talukaBoundary,
              identifiers.localBodyBoundary,
              null,
            ],
          },
        },
      ],
      error: null,
    }));
    const incompleteEvidenceStore = createStore(async () => ({
      data: [
        {
          ...candidateRow,
          explanation_metadata: {
            ...candidateRow.explanation_metadata,
            evidence: candidateEvidence.filter(
              (evidence) => evidence.entityId !== identifiers.district,
            ),
          },
        },
      ],
      error: null,
    }));

    await assert.rejects(
      inconsistentVersionsStore.loadRoutingContext(routingInput, jurisdiction),
      RoutingDataAccessError,
    );
    await assert.rejects(
      incompleteEvidenceStore.loadRoutingContext(routingInput, jurisdiction),
      RoutingDataAccessError,
    );
  });
});

describe('Supabase routing decision audit', () => {
  it('replays a stored routing decision without recomputing current configuration', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      return {
        data: [
          {
            routing_decision_id: identifiers.decision,
            request_id: 'complaint-submit:10000000-0000-4000-8000-000000000099',
            category_id: identifiers.category,
            longitude: routingInput.location.longitude,
            latitude: routingInput.location.latitude,
            accuracy_meters: routingInput.accuracyMeters,
            captured_at: capturedAt,
            resolved_at: resolvedAt,
            decision_status: 'routed',
            confidence_score: 1,
            state_id: identifiers.state,
            district_id: identifiers.district,
            taluka_id: identifiers.taluka,
            local_body_id: identifiers.localBody,
            ward_id: identifiers.ward,
            state_boundary_version_id: identifiers.stateBoundary,
            district_boundary_version_id: identifiers.districtBoundary,
            taluka_boundary_version_id: identifiers.talukaBoundary,
            local_body_boundary_version_id: identifiers.localBodyBoundary,
            ward_boundary_version_id: identifiers.wardBoundary,
            asset_type_id: null,
            asset_id: null,
            asset_version_id: null,
            asset_match_distance_meters: null,
            asset_ownership_version_id: null,
            target_authority_id: identifiers.authority,
            department_id: identifiers.department,
            authority_department_id: identifiers.authorityDepartment,
            officer_role_id: identifiers.officerRole,
            officer_assignment_id: null,
            route_rule_id: identifiers.rule,
            route_rule_version_id: identifiers.ruleVersion,
            confidence_policy_version_id: identifiers.policyVersion,
            fallback_depth: 0,
            explanation_codes: ['route_resolved'],
            explanation_metadata: {
              policyId: identifiers.policy,
              policyVersionId: identifiers.policyVersion,
              policyVersion: 1,
              requestedAssetId: null,
              confidenceBand: 'high',
              confidenceFactors,
              jurisdiction: routedDecision.explanation.jurisdiction,
              selectedCandidateId: 'candidate:test',
              selectedRoutingRuleId: identifiers.rule,
              selectedRoutingRuleVersionId: identifiers.ruleVersion,
              fallbackUsed: false,
              fallbackPath: [],
              ambiguousCandidateIds: [],
              candidateEvaluations: routedDecision.explanation.candidateEvaluations,
            },
            ambiguity_count: 0,
          },
        ],
        error: null,
      };
    });

    const replay = await store.findRecordedRoutingDecision(
      identifiers.actor,
      'complaint-submit:10000000-0000-4000-8000-000000000099',
    );

    assert.equal(replay?.id, identifiers.decision);
    assert.deepEqual(replay?.decision, routedDecision);
    assert.deepEqual(calls, [
      {
        functionName: 'get_routing_decision_replay',
        arguments_: {
          p_actor_user_id: identifiers.actor,
          p_request_id: 'complaint-submit:10000000-0000-4000-8000-000000000099',
        },
      },
    ]);
  });

  it('persists complete, sanitized decision evidence with exact idempotency arguments', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      return { data: identifiers.decision, error: null };
    });

    const decisionId = await store.recordRoutingDecision({
      actorUserId: identifiers.actor,
      requestId: 'request-routing-1',
      locationEvidence: {
        ...routingInput.location,
        accuracyMeters: routingInput.accuracyMeters,
        capturedAt,
      },
      routingInput,
      decision: routedDecision,
    });

    assert.equal(decisionId, identifiers.decision);
    assert.deepEqual(calls, [
      {
        functionName: 'record_routing_decision',
        arguments_: {
          p_actor_user_id: identifiers.actor,
          p_request_id: 'request-routing-1',
          p_longitude: 73.8567,
          p_latitude: 18.5204,
          p_accuracy_meters: 12,
          p_captured_at: capturedAt,
          p_resolved_at: resolvedAt,
          p_category_id: identifiers.category,
          p_decision_status: 'routed',
          p_confidence_score: 1,
          p_state_id: identifiers.state,
          p_district_id: identifiers.district,
          p_taluka_id: identifiers.taluka,
          p_local_body_id: identifiers.localBody,
          p_ward_id: identifiers.ward,
          p_state_boundary_version_id: identifiers.stateBoundary,
          p_district_boundary_version_id: identifiers.districtBoundary,
          p_taluka_boundary_version_id: identifiers.talukaBoundary,
          p_local_body_boundary_version_id: identifiers.localBodyBoundary,
          p_ward_boundary_version_id: identifiers.wardBoundary,
          p_asset_type_id: null,
          p_asset_id: null,
          p_asset_version_id: null,
          p_asset_match_distance_meters: null,
          p_asset_ownership_version_id: null,
          p_target_authority_id: identifiers.authority,
          p_department_id: identifiers.department,
          p_authority_department_id: identifiers.authorityDepartment,
          p_officer_role_id: identifiers.officerRole,
          p_officer_assignment_id: null,
          p_route_rule_id: identifiers.rule,
          p_route_rule_version_id: identifiers.ruleVersion,
          p_confidence_policy_version_id: identifiers.policyVersion,
          p_fallback_depth: 0,
          p_explanation_codes: ['route_resolved'],
          p_explanation_metadata: {
            policyId: identifiers.policy,
            policyVersionId: identifiers.policyVersion,
            policyVersion: 1,
            requestedAssetId: null,
            confidenceBand: 'high',
            confidenceFactors,
            jurisdiction: routedDecision.explanation.jurisdiction,
            selectedCandidateId: 'candidate:test',
            selectedRoutingRuleId: identifiers.rule,
            selectedRoutingRuleVersionId: identifiers.ruleVersion,
            fallbackUsed: false,
            fallbackPath: [],
            ambiguousCandidateIds: [],
            candidateEvaluations: routedDecision.explanation.candidateEvaluations,
          },
          p_ambiguity_count: 0,
        },
      },
    ]);
  });

  it('persists the selected asset geometry version and match distance exactly', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      return { data: identifiers.decision, error: null };
    });
    const assetTarget: RoutingTarget = {
      ...target,
      assetTypeId: identifiers.assetType,
      assetId: identifiers.asset,
      assetVersionId: identifiers.assetVersion,
      assetMatchDistanceMeters: 3.5,
      assetOwnershipVersionId: identifiers.assetOwnershipVersion,
    };
    const assetDecision: RoutingDecision = {
      ...routedDecision,
      target: assetTarget,
      explanation: {
        ...routedDecision.explanation,
        candidateEvaluations: routedDecision.explanation.candidateEvaluations.map((evaluation) => ({
          ...evaluation,
          target: assetTarget,
        })),
      },
    };

    await store.recordRoutingDecision({
      actorUserId: identifiers.actor,
      requestId: 'request-routing-asset',
      locationEvidence: {
        ...routingInput.location,
        accuracyMeters: routingInput.accuracyMeters,
        capturedAt,
      },
      routingInput: { ...routingInput, assetId: identifiers.asset },
      decision: assetDecision,
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.functionName, 'record_routing_decision');
    assert.equal(calls[0]?.arguments_['p_asset_id'], identifiers.asset);
    assert.equal(calls[0]?.arguments_['p_asset_version_id'], identifiers.assetVersion);
    assert.equal(calls[0]?.arguments_['p_asset_match_distance_meters'], 3.5);
    assert.equal(
      calls[0]?.arguments_['p_asset_ownership_version_id'],
      identifiers.assetOwnershipVersion,
    );
    assert.equal(
      JSON.stringify(calls[0]?.arguments_['p_explanation_metadata']).includes(
        identifiers.assetVersion,
      ),
      true,
    );
  });

  it('records only the candidates that actually caused score ambiguity', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      return { data: identifiers.decision, error: null };
    });
    const [baseEvaluation] = routedDecision.explanation.candidateEvaluations;
    assert.ok(baseEvaluation);
    const manualReviewDecision: RoutingDecision = {
      ...routedDecision,
      status: 'manual_review',
      target: null,
      routingRuleId: null,
      routingRuleVersionId: null,
      explanation: {
        ...routedDecision.explanation,
        reason: 'ambiguous_candidate_scores',
        ambiguousCandidateIds: ['candidate:a', 'candidate:b'],
        candidateEvaluations: [
          ...routedDecision.explanation.candidateEvaluations,
          {
            ...baseEvaluation,
            candidateId: 'candidate:b',
          },
          {
            ...baseEvaluation,
            candidateId: 'candidate:lower-priority',
          },
        ],
      },
    };

    await store.recordRoutingDecision({
      actorUserId: identifiers.actor,
      requestId: 'request-routing-ambiguous',
      locationEvidence: {
        ...routingInput.location,
        accuracyMeters: routingInput.accuracyMeters,
        capturedAt,
      },
      routingInput,
      decision: manualReviewDecision,
    });

    assert.equal(calls[0]?.arguments_['p_ambiguity_count'], 2);
    assert.deepEqual(
      (calls[0]?.arguments_['p_explanation_metadata'] as { ambiguousCandidateIds: string[] })
        .ambiguousCandidateIds,
      ['candidate:a', 'candidate:b'],
    );
  });

  it('maps idempotency conflicts separately and normalizes all other audit failures', async () => {
    const conflictStore = createStore(async () => ({
      data: null,
      error: { message: 'ROUTING_DECISION_IDEMPOTENCY_CONFLICT' },
    }));
    const unavailableStore = createStore(async () => ({
      data: null,
      error: { code: '57014', message: 'internal database detail' },
    }));
    const input = {
      actorUserId: identifiers.actor,
      requestId: 'request-routing-1',
      locationEvidence: {
        ...routingInput.location,
        accuracyMeters: routingInput.accuracyMeters,
        capturedAt,
      },
      routingInput,
      decision: routedDecision,
    };

    await assert.rejects(
      conflictStore.recordRoutingDecision(input),
      RoutingDecisionIdempotencyConflictError,
    );
    await assert.rejects(
      unavailableStore.recordRoutingDecision(input),
      (error: unknown) =>
        error instanceof RoutingDataAccessError && error.dependencyCode === '57014',
    );
  });
});
