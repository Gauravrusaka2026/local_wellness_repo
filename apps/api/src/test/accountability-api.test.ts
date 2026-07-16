import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  GovernmentComplaintSlaSummary,
  GovernmentKpiQuery,
  GovernmentKpiSnapshotResult,
} from '@local-wellness/types';
import request from 'supertest';

import { AccountabilityController } from '../accountability/accountability.controller.js';
import { AccountabilityService } from '../accountability/accountability.service.js';
import { configureApiApplication } from '../application.js';
import { AuthenticationGateway } from '../auth/authentication.gateway.js';
import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { RequestIdMiddleware } from '../common/request-id.middleware.js';
import { API_CONFIGURATION } from '../configuration.js';
import {
  AccountabilityAccessDeniedError,
  AccountabilityDataAccessError,
  AccountabilityNotFoundError,
  AccountabilityStore,
} from '../data/accountability.store.js';
import { IdentityStore } from '../data/identity.store.js';
import {
  activeProfile,
  apiConfiguration,
  FakeAuthenticationGateway,
  FakeIdentityStore,
} from './test-doubles.js';

const identifiers = {
  clock: '10000000-0000-4000-8000-000000000001',
  complaint: '10000000-0000-4000-8000-000000000002',
  kpi: '10000000-0000-4000-8000-000000000003',
  run: '10000000-0000-4000-8000-000000000004',
  scope: '10000000-0000-4000-8000-000000000005',
  scopeRoleAssignment: '10000000-0000-4000-8000-000000000006',
} as const;

const timestamp = '2026-07-16T10:00:00.000Z';
const slaSummary: GovernmentComplaintSlaSummary = {
  complaintId: identifiers.complaint,
  policyApplied: true,
  unavailableReason: null,
  clocks: [
    {
      id: identifiers.clock,
      milestone: 'acknowledgement',
      cycle: 1,
      state: 'active',
      policyCode: 'municipal_standard',
      policyVersion: 1,
      targetBusinessMinutes: 60,
      startedAt: timestamp,
      targetAt: '2026-07-16T11:00:00.000Z',
      completedAt: null,
      breachedAt: null,
      pausedAt: null,
      externalDependencySegment: false,
    },
  ],
  escalations: [],
};

const kpiResult: GovernmentKpiSnapshotResult = {
  runId: identifiers.run,
  windowStartedAt: '2026-07-01T00:00:00.000Z',
  windowEndedAt: timestamp,
  sourceCutoffAt: '2026-07-16T09:55:00.000Z',
  calculatedAt: timestamp,
  items: [
    {
      id: identifiers.kpi,
      metricCode: 'acknowledgement_compliance',
      metricName: 'Acknowledgement compliance',
      unit: 'percent',
      definitionVersion: 1,
      scopeType: 'municipality',
      scopeId: identifiers.scope,
      scopeName: 'Reference Municipal Corporation',
      segment: 'all',
      numerator: 8,
      denominator: 10,
      value: 80,
      sampleSize: 10,
    },
  ],
};

class FakeAccountabilityStore extends AccountabilityStore {
  public sla: GovernmentComplaintSlaSummary = slaSummary;
  public kpis: GovernmentKpiSnapshotResult = kpiResult;
  public failure: Error | null = null;
  public slaCall: Readonly<{
    actorUserId: string;
    complaintId: string;
    scopeRoleAssignmentId?: string;
  }> | null = null;
  public kpiCall: Readonly<{ actorUserId: string; query: GovernmentKpiQuery }> | null = null;

  public async getComplaintSla(
    actorUserId: string,
    complaintId: string,
    scopeRoleAssignmentId?: string,
  ): Promise<GovernmentComplaintSlaSummary> {
    this.slaCall = {
      actorUserId,
      complaintId,
      ...(scopeRoleAssignmentId ? { scopeRoleAssignmentId } : {}),
    };
    if (this.failure) throw this.failure;
    return this.sla;
  }

  public async listKpiSnapshots(
    actorUserId: string,
    query: GovernmentKpiQuery,
  ): Promise<GovernmentKpiSnapshotResult> {
    this.kpiCall = { actorUserId, query };
    if (this.failure) throw this.failure;
    return this.kpis;
  }
}

describe('authenticated government accountability API', () => {
  let application: INestApplication;
  let store: FakeAccountabilityStore;

  beforeEach(async () => {
    store = new FakeAccountabilityStore();
    const testingModule = await Test.createTestingModule({
      controllers: [AccountabilityController],
      providers: [
        AccountabilityService,
        BearerAuthGuard,
        RequestIdMiddleware,
        { provide: API_CONFIGURATION, useValue: apiConfiguration },
        { provide: AccountabilityStore, useValue: store },
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

  it('requires authentication for SLA and KPI reads', async () => {
    await request(application.getHttpServer())
      .get(`/api/v1/government/accountability/complaints/${identifiers.complaint}/sla`)
      .expect(401);
    await request(application.getHttpServer())
      .get('/api/v1/government/accountability/kpis')
      .expect(401);
    assert.equal(store.slaCall, null);
    assert.equal(store.kpiCall, null);
  });

  it('returns a scoped SLA summary and forwards only the authenticated actor and selected scope', async () => {
    const response = await request(application.getHttpServer())
      .get(`/api/v1/government/accountability/complaints/${identifiers.complaint}/sla`)
      .query({ scopeRoleAssignmentId: identifiers.scopeRoleAssignment })
      .set('authorization', 'Bearer valid-access-token')
      .expect(200);

    assert.equal(response.headers['cache-control'], 'private, no-store');
    assert.deepEqual(response.body.data, slaSummary);
    assert.deepEqual(store.slaCall, {
      actorUserId: activeProfile.id,
      complaintId: identifiers.complaint,
      scopeRoleAssignmentId: identifiers.scopeRoleAssignment,
    });
  });

  it('returns filtered organizational KPI snapshots without officer ranking fields', async () => {
    const response = await request(application.getHttpServer())
      .get('/api/v1/government/accountability/kpis')
      .query({
        scopeRoleAssignmentId: identifiers.scopeRoleAssignment,
        scopeType: 'municipality',
        scopeId: identifiers.scope,
        segment: 'all',
        metricCodes: 'acknowledgement_compliance,backlog',
      })
      .set('authorization', 'Bearer valid-access-token')
      .expect(200);

    assert.deepEqual(response.body.data, kpiResult);
    assert.deepEqual(store.kpiCall, {
      actorUserId: activeProfile.id,
      query: {
        scopeRoleAssignmentId: identifiers.scopeRoleAssignment,
        scopeType: 'municipality',
        scopeId: identifiers.scope,
        segment: 'all',
        metricCodes: ['acknowledgement_compliance', 'backlog'],
      },
    });
    assert.equal(JSON.stringify(response.body.data).toLowerCase().includes('officer'), false);
  });

  it('returns explicit empty and unconfigured results without inventing KPI data', async () => {
    store.kpis = {
      runId: null,
      windowStartedAt: null,
      windowEndedAt: null,
      sourceCutoffAt: null,
      calculatedAt: null,
      items: [],
    };
    store.sla = {
      complaintId: identifiers.complaint,
      policyApplied: false,
      unavailableReason: 'no_approved_policy',
      clocks: [],
      escalations: [],
    };

    const [kpis, sla] = await Promise.all([
      request(application.getHttpServer())
        .get('/api/v1/government/accountability/kpis')
        .set('authorization', 'Bearer valid-access-token')
        .expect(200),
      request(application.getHttpServer())
        .get(`/api/v1/government/accountability/complaints/${identifiers.complaint}/sla`)
        .set('authorization', 'Bearer valid-access-token')
        .expect(200),
    ]);

    assert.deepEqual(kpis.body.data, store.kpis);
    assert.deepEqual(sla.body.data, store.sla);
  });

  it('rejects invalid KPI filters before persistence and fails closed on malformed output', async () => {
    await request(application.getHttpServer())
      .get('/api/v1/government/accountability/kpis')
      .query({ scopeType: 'ward' })
      .set('authorization', 'Bearer valid-access-token')
      .expect(400);
    assert.equal(store.kpiCall, null);

    store.sla = {
      ...slaSummary,
      internalPolicyId: identifiers.scope,
    } as GovernmentComplaintSlaSummary;
    const malformed = await request(application.getHttpServer())
      .get(`/api/v1/government/accountability/complaints/${identifiers.complaint}/sla`)
      .set('authorization', 'Bearer valid-access-token')
      .expect(503);
    assert.equal(malformed.body.error.code, 'DEPENDENCY_UNAVAILABLE');
  });

  it('maps access, not-found, and dependency failures without database details', async () => {
    store.failure = new AccountabilityAccessDeniedError();
    const denied = await request(application.getHttpServer())
      .get('/api/v1/government/accountability/kpis')
      .set('authorization', 'Bearer valid-access-token')
      .expect(403);
    assert.equal(denied.body.error.code, 'GOVERNMENT_ACCESS_REQUIRED');

    store.failure = new AccountabilityNotFoundError();
    const missing = await request(application.getHttpServer())
      .get(`/api/v1/government/accountability/complaints/${identifiers.complaint}/sla`)
      .set('authorization', 'Bearer valid-access-token')
      .expect(404);
    assert.equal(missing.body.error.code, 'COMPLAINT_NOT_FOUND');

    store.failure = new AccountabilityDataAccessError('private database operation');
    const unavailable = await request(application.getHttpServer())
      .get('/api/v1/government/accountability/kpis')
      .set('authorization', 'Bearer valid-access-token')
      .expect(503);
    assert.deepEqual(unavailable.body.error, {
      code: 'DEPENDENCY_UNAVAILABLE',
      message: 'SLA and KPI data is temporarily unavailable.',
    });
  });
});
