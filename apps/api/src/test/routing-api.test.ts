import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  JurisdictionResolution,
  RoutingCandidate,
  RoutingCategory,
  RoutingPolicy,
  RoutingResolutionInput,
} from '@local-wellness/types';
import type { JurisdictionResolutionQuery, RoutingContext } from '@local-wellness/routing-engine';
import request from 'supertest';

import { configureApiApplication } from '../application.js';
import { AuthenticationGateway } from '../auth/authentication.gateway.js';
import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { Clock } from '../common/clock.js';
import { RequestIdMiddleware } from '../common/request-id.middleware.js';
import { API_CONFIGURATION } from '../configuration.js';
import { IdentityStore } from '../data/identity.store.js';
import {
  RoutingDataAccessError,
  RoutingDecisionIdempotencyConflictError,
  RoutingStore,
  type RecordRoutingDecisionInput,
  type RecordedRoutingDecision,
} from '../data/routing.store.js';
import { CategoriesController } from '../routing/categories.controller.js';
import { CategoriesService } from '../routing/categories.service.js';
import { JurisdictionsController } from '../routing/jurisdictions.controller.js';
import { JurisdictionsService } from '../routing/jurisdictions.service.js';
import { RoutingController } from '../routing/routing.controller.js';
import { RoutingService } from '../routing/routing.service.js';
import {
  apiConfiguration,
  FakeAuthenticationGateway,
  FakeIdentityStore,
  FixedClock,
} from './test-doubles.js';

const ids = {
  asset: '11111111-1111-4111-8111-111111111112',
  assetOwnershipVersion: '11111111-1111-4111-8111-111111111111',
  assetType: '11111111-1111-4111-8111-111111111113',
  assetVersion: '11111111-1111-4111-8111-111111111114',
  authority: '22222222-2222-4222-8222-222222222222',
  authorityDepartment: '22222222-2222-4222-8222-222222222223',
  boundary: '33333333-3333-4333-8333-333333333333',
  category: '44444444-4444-4444-8444-444444444444',
  department: '55555555-5555-4555-8555-555555555555',
  localBody: '66666666-6666-4666-8666-666666666666',
  officerRole: '77777777-7777-4777-8777-777777777777',
  policy: '88888888-8888-4888-8888-888888888888',
  policyVersion: '88888888-8888-4888-8888-888888888889',
  routingRule: '99999999-9999-4999-8999-999999999999',
  routingRuleVersion: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  state: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
} as const;

const category: RoutingCategory = {
  id: ids.category,
  code: 'pilot_category',
  name: 'Pilot category',
  description: 'Synthetic verified test category.',
  parentCategoryId: null,
  requiresAsset: false,
  requiresLocation: true,
  isEmergency: false,
};

const verifiedEvidence = (
  entityType: RoutingCandidate['evidence'][number]['entityType'],
  entityId: string,
  versionId: string | null = null,
): RoutingCandidate['evidence'][number] => ({
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
      stateId: ids.state,
      districtId: null,
      talukaId: null,
      localBodyId: ids.localBody,
      wardId: null,
      stateBoundaryVersionId: null,
      districtBoundaryVersionId: null,
      talukaBoundaryVersionId: null,
      localBodyBoundaryVersionId: ids.boundary,
      wardBoundaryVersionId: null,
      evidence: [
        verifiedEvidence('state', ids.state),
        verifiedEvidence('local_body', ids.localBody),
        verifiedEvidence('jurisdiction_boundary', ids.boundary, ids.boundary),
      ],
    },
  ],
};

const candidate: RoutingCandidate = {
  candidateId: 'candidate-1',
  routingRuleId: ids.routingRule,
  routingRuleVersionId: ids.routingRuleVersion,
  routingRuleCode: 'TEST_RULE',
  explanationCode: 'verified_test_route',
  sourceReferenceId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  categoryId: ids.category,
  priority: 10,
  fallbackDepth: 0,
  fallbackPath: [],
  target: {
    authorityId: ids.authority,
    localBodyId: ids.localBody,
    wardId: null,
    departmentId: ids.department,
    authorityDepartmentId: ids.authorityDepartment,
    officerRoleId: ids.officerRole,
    officerAssignmentId: null,
    assetTypeId: null,
    assetId: null,
    assetVersionId: null,
    assetMatchDistanceMeters: null,
    assetOwnershipVersionId: null,
  },
  evidence: [
    verifiedEvidence('authority', ids.authority),
    verifiedEvidence('local_body', ids.localBody),
    verifiedEvidence('category', ids.category),
    verifiedEvidence('department', ids.department),
    verifiedEvidence('authority_department', ids.authorityDepartment),
    verifiedEvidence('officer_role', ids.officerRole),
    verifiedEvidence('routing_rule', ids.routingRule, ids.routingRuleVersion),
  ],
  confidenceSignals: [
    { code: 'verified_jurisdiction', matched: true, explanation: 'Verified boundary matched.' },
    { code: 'verified_mapping', matched: true, explanation: 'Verified mapping matched.' },
  ],
};

const policy: RoutingPolicy = {
  id: ids.policy,
  versionId: ids.policyVersion,
  version: 1,
  automaticThreshold: 0.8,
  manualReviewThreshold: 0.5,
  ambiguityDelta: 0.05,
  fallbackPenaltyPerLevel: 0.1,
  factors: [
    { code: 'verified_jurisdiction', weight: 0.5, required: true },
    { code: 'verified_mapping', weight: 0.5, required: true },
  ],
};

const routingIdempotencyKey = 'routing-request-000000000001';

class FakeRoutingStore extends RoutingStore {
  public category: RoutingCategory | null = category;
  public context: RoutingContext = { policy, candidates: [candidate] };
  public decisionRecords: RecordRoutingDecisionInput[] = [];
  public jurisdictionResolution: JurisdictionResolution = jurisdiction;
  public failListing = false;
  public failRecording = false;
  public failRecordingWithConflict = false;
  public replay: RecordedRoutingDecision | null = null;

  public async findRoutingCategory(categoryId: string): Promise<RoutingCategory | null> {
    return this.category?.id === categoryId ? this.category : null;
  }

  public async listRoutingCategories(): Promise<RoutingCategory[]> {
    if (this.failListing) {
      throw new RoutingDataAccessError('list routing categories');
    }
    return this.category ? [this.category] : [];
  }

  public async loadRoutingContext(
    input: RoutingResolutionInput,
    resolvedJurisdiction: JurisdictionResolution,
  ): Promise<RoutingContext> {
    void input;
    void resolvedJurisdiction;
    return this.context;
  }

  public async recordRoutingDecision(input: RecordRoutingDecisionInput): Promise<string> {
    if (this.failRecordingWithConflict) {
      throw new RoutingDecisionIdempotencyConflictError();
    }
    if (this.failRecording) {
      throw new RoutingDataAccessError('record routing decision');
    }

    this.decisionRecords.push(input);
    return 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  }

  public async findRecordedRoutingDecision(
    actorUserId: string,
    requestId: string,
  ): Promise<RecordedRoutingDecision | null> {
    if (
      this.replay &&
      this.replay.actorUserId === actorUserId &&
      this.replay.requestId === requestId
    ) {
      return this.replay;
    }

    return null;
  }

  public async resolveJurisdiction(
    query: JurisdictionResolutionQuery,
  ): Promise<JurisdictionResolution> {
    void query;
    return this.jurisdictionResolution;
  }
}

describe('API routing contract', () => {
  let application: INestApplication;
  let routingStore: FakeRoutingStore;

  beforeEach(async () => {
    routingStore = new FakeRoutingStore();
    const testingModule = await Test.createTestingModule({
      controllers: [CategoriesController, JurisdictionsController, RoutingController],
      providers: [
        CategoriesService,
        JurisdictionsService,
        RoutingService,
        BearerAuthGuard,
        RequestIdMiddleware,
        { provide: Clock, useValue: new FixedClock() },
        { provide: API_CONFIGURATION, useValue: apiConfiguration },
        { provide: RoutingStore, useValue: routingStore },
        { provide: IdentityStore, useValue: new FakeIdentityStore() },
        { provide: AuthenticationGateway, useValue: new FakeAuthenticationGateway() },
      ],
    }).compile();

    application = testingModule.createNestApplication();
    configureApiApplication(application);
    await application.listen(0, '127.0.0.1');
  });

  afterEach(async () => {
    await application.close();
  });

  it('lists only categories supplied by the trusted routing store', async () => {
    const response = await request(application.getHttpServer())
      .get('/api/v1/routing/categories')
      .set('authorization', 'Bearer valid-access-token')
      .expect(200);

    assert.deepEqual(response.body.data, [category]);
  });

  it('resolves and records a deterministic routing decision', async () => {
    const response = await request(application.getHttpServer())
      .post('/api/v1/routing/resolve')
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', routingIdempotencyKey)
      .set('x-request-id', 'routing-request-123')
      .send({
        categoryId: ids.category,
        latitude: 18.5204,
        longitude: 73.8567,
        accuracyMeters: 8,
        capturedAt: '2026-07-13T09:59:00+00:00',
      })
      .expect(200);

    assert.equal(response.body.data.status, 'routed');
    assert.equal(response.body.data.target.departmentId, ids.department);
    assert.equal(response.body.data.target.officerRoleId, ids.officerRole);
    assert.equal(response.body.data.explanation.reason, 'route_resolved');
    assert.equal(response.body.data.explanation.policyId, ids.policy);
    assert.equal(response.body.data.explanation.policyVersionId, ids.policyVersion);
    assert.equal(response.body.data.explanation.candidateEvaluations, undefined);
    assert.equal(response.body.data.confidence.factors, undefined);
    assert.equal(routingStore.decisionRecords.length, 1);
    assert.equal(routingStore.decisionRecords[0]?.requestId, routingIdempotencyKey);
    assert.equal(
      routingStore.decisionRecords[0]?.actorUserId,
      '7cd50865-9ebd-4a79-abaa-f059a1632985',
    );
  });

  it('preserves selected asset geometry evidence in the public target and audit input', async () => {
    routingStore.category = { ...category, requiresAsset: true };
    const assetTarget = {
      ...candidate.target,
      assetTypeId: ids.assetType,
      assetId: ids.asset,
      assetVersionId: ids.assetVersion,
      assetMatchDistanceMeters: 4.25,
      assetOwnershipVersionId: ids.assetOwnershipVersion,
    };
    routingStore.context = {
      policy,
      candidates: [
        {
          ...candidate,
          target: assetTarget,
          evidence: [
            ...candidate.evidence,
            verifiedEvidence('asset_type', ids.assetType),
            verifiedEvidence('asset', ids.asset, ids.assetVersion),
            verifiedEvidence(
              'asset_ownership',
              ids.assetOwnershipVersion,
              ids.assetOwnershipVersion,
            ),
          ],
        },
      ],
    };

    const response = await request(application.getHttpServer())
      .post('/api/v1/routing/resolve')
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', routingIdempotencyKey)
      .set('x-request-id', 'routing-request-asset')
      .send({
        categoryId: ids.category,
        assetId: ids.asset,
        latitude: 18.5204,
        longitude: 73.8567,
        accuracyMeters: 8,
        capturedAt: '2026-07-13T09:59:00+00:00',
      })
      .expect(200);

    assert.equal(response.body.data.target.assetId, ids.asset);
    assert.equal(response.body.data.target.assetVersionId, ids.assetVersion);
    assert.equal(response.body.data.target.assetMatchDistanceMeters, 4.25);
    assert.equal(routingStore.decisionRecords[0]?.decision.target?.assetId, ids.asset);
    assert.equal(
      routingStore.decisionRecords[0]?.decision.target?.assetVersionId,
      ids.assetVersion,
    );
    assert.equal(routingStore.decisionRecords[0]?.decision.target?.assetMatchDistanceMeters, 4.25);
  });

  it('records and returns unsupported areas without a target or policy', async () => {
    routingStore.jurisdictionResolution = {
      status: 'unsupported',
      matches: [],
      reason: 'no_verified_jurisdiction_match',
    };

    const response = await request(application.getHttpServer())
      .post('/api/v1/routing/resolve')
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', routingIdempotencyKey)
      .set('x-request-id', 'routing-request-unsupported')
      .send({
        categoryId: ids.category,
        latitude: 18.5204,
        longitude: 73.8567,
        accuracyMeters: 8,
        capturedAt: '2026-07-13T09:59:00+00:00',
      })
      .expect(200);

    assert.equal(response.body.data.status, 'unsupported_area');
    assert.equal(response.body.data.target, null);
    assert.equal(response.body.data.explanation.policyId, null);
    assert.equal(routingStore.decisionRecords[0]?.decision.target, null);
  });

  it('records mapping-required when the resolved context has no policy or candidates', async () => {
    routingStore.context = { policy: null, candidates: [] };

    const response = await request(application.getHttpServer())
      .post('/api/v1/routing/resolve')
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', routingIdempotencyKey)
      .set('x-request-id', 'routing-request-policy-missing')
      .send({
        categoryId: ids.category,
        latitude: 18.5204,
        longitude: 73.8567,
        accuracyMeters: 8,
        capturedAt: '2026-07-13T09:59:00+00:00',
      })
      .expect(200);

    assert.equal(response.body.data.status, 'mapping_required');
    assert.equal(response.body.data.explanation.reason, 'routing_policy_missing');
    assert.equal(response.body.data.explanation.policyVersionId, null);
    assert.equal(routingStore.decisionRecords.length, 1);
  });

  it('records jurisdiction ambiguity for manual review without exposing a target', async () => {
    const [jurisdictionMatch] = jurisdiction.matches;
    assert.ok(jurisdictionMatch);
    routingStore.jurisdictionResolution = {
      status: 'ambiguous',
      matches: [jurisdictionMatch, { ...jurisdictionMatch }],
      reason: 'location_accuracy_intersects_multiple_jurisdictions',
    };

    const response = await request(application.getHttpServer())
      .post('/api/v1/routing/resolve')
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', routingIdempotencyKey)
      .set('x-request-id', 'routing-request-jurisdiction-ambiguous')
      .send({
        categoryId: ids.category,
        latitude: 18.5204,
        longitude: 73.8567,
        accuracyMeters: 8,
        capturedAt: '2026-07-13T09:59:00+00:00',
      })
      .expect(200);

    assert.equal(response.body.data.status, 'manual_review');
    assert.equal(response.body.data.target, null);
    assert.equal(response.body.data.explanation.jurisdictionStatus, 'ambiguous');
    assert.equal(routingStore.decisionRecords.length, 1);
  });

  it('returns verified jurisdiction evidence without exposing contacts', async () => {
    const response = await request(application.getHttpServer())
      .post('/api/v1/jurisdictions/resolve')
      .set('authorization', 'Bearer valid-access-token')
      .send({
        latitude: 18.5204,
        longitude: 73.8567,
        accuracyMeters: 8,
        capturedAt: '2026-07-13T09:59:00+00:00',
      })
      .expect(200);

    assert.deepEqual(response.body.data, jurisdiction);
    assert.equal(JSON.stringify(response.body).includes('phone'), false);
    assert.equal(JSON.stringify(response.body).includes('email'), false);
  });

  it('rejects client-selected routing targets before service execution', async () => {
    await request(application.getHttpServer())
      .post('/api/v1/routing/resolve')
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', routingIdempotencyKey)
      .send({
        categoryId: ids.category,
        latitude: 18.5204,
        longitude: 73.8567,
        accuracyMeters: 8,
        capturedAt: '2026-07-13T09:59:00+00:00',
        departmentId: ids.department,
      })
      .expect(400);

    assert.equal(routingStore.decisionRecords.length, 0);
  });

  it('rejects a missing asset when the database category requires one', async () => {
    routingStore.category = { ...category, requiresAsset: true };

    const response = await request(application.getHttpServer())
      .post('/api/v1/routing/resolve')
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', routingIdempotencyKey)
      .send({
        categoryId: ids.category,
        latitude: 18.5204,
        longitude: 73.8567,
        accuracyMeters: 8,
        capturedAt: '2026-07-13T09:59:00+00:00',
      })
      .expect(400);

    assert.equal(response.body.error.code, 'ROUTING_ASSET_REQUIRED');
    assert.equal(routingStore.decisionRecords.length, 0);
  });

  it('rejects location evidence captured beyond the allowed clock skew', async () => {
    const response = await request(application.getHttpServer())
      .post('/api/v1/routing/resolve')
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', routingIdempotencyKey)
      .send({
        categoryId: ids.category,
        latitude: 18.5204,
        longitude: 73.8567,
        accuracyMeters: 8,
        capturedAt: '2026-07-13T10:03:00+00:00',
      })
      .expect(400);

    assert.equal(response.body.error.code, 'LOCATION_CAPTURED_IN_FUTURE');
    assert.equal(routingStore.decisionRecords.length, 0);
  });

  it('maps routing persistence failures to a safe dependency error', async () => {
    routingStore.failListing = true;

    const response = await request(application.getHttpServer())
      .get('/api/v1/routing/categories')
      .set('authorization', 'Bearer valid-access-token')
      .expect(503);

    assert.equal(response.body.error.code, 'DEPENDENCY_UNAVAILABLE');
    assert.equal(response.body.error.message, 'Routing data is temporarily unavailable.');
  });

  it('maps routing idempotency conflicts to a safe conflict response', async () => {
    routingStore.failRecordingWithConflict = true;

    const response = await request(application.getHttpServer())
      .post('/api/v1/routing/resolve')
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', routingIdempotencyKey)
      .set('x-request-id', 'routing-request-conflict')
      .send({
        categoryId: ids.category,
        latitude: 18.5204,
        longitude: 73.8567,
        accuracyMeters: 8,
        capturedAt: '2026-07-13T09:59:00+00:00',
      })
      .expect(409);

    assert.equal(response.body.error.code, 'ROUTING_IDEMPOTENCY_CONFLICT');
    assert.equal(
      response.body.error.message,
      'This request identifier was already used for a different routing decision.',
    );
  });

  it('maps a general decision-audit failure to a safe dependency response', async () => {
    routingStore.failRecording = true;

    const response = await request(application.getHttpServer())
      .post('/api/v1/routing/resolve')
      .set('authorization', 'Bearer valid-access-token')
      .set('idempotency-key', routingIdempotencyKey)
      .set('x-request-id', 'routing-request-audit-failure')
      .send({
        categoryId: ids.category,
        latitude: 18.5204,
        longitude: 73.8567,
        accuracyMeters: 8,
        capturedAt: '2026-07-13T09:59:00+00:00',
      })
      .expect(503);

    assert.equal(response.body.error.code, 'DEPENDENCY_UNAVAILABLE');
    assert.equal(response.body.error.message, 'Routing data is temporarily unavailable.');
  });

  it('does not expose routing endpoints without authentication', async () => {
    await request(application.getHttpServer()).get('/api/v1/routing/categories').expect(401);
    await request(application.getHttpServer()).post('/api/v1/routing/resolve').send({}).expect(401);
  });
});
