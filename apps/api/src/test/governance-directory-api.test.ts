import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { VerifiedGoverningBodyMatch } from '@local-wellness/types';
import request from 'supertest';

import { configureApiApplication } from '../application.js';
import { AuthenticationGateway } from '../auth/authentication.gateway.js';
import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { Clock } from '../common/clock.js';
import { RequestIdMiddleware } from '../common/request-id.middleware.js';
import { API_CONFIGURATION } from '../configuration.js';
import {
  GovernanceDirectoryDataAccessError,
  GovernanceDirectoryStore,
  type GoverningBodyDirectoryQuery,
} from '../data/governance-directory.store.js';
import { IdentityStore } from '../data/identity.store.js';
import { GovernanceDirectoryController } from '../governance-directory/governance-directory.controller.js';
import { GovernanceDirectoryService } from '../governance-directory/governance-directory.service.js';
import {
  apiConfiguration,
  FakeAuthenticationGateway,
  FakeIdentityStore,
  FixedClock,
} from './test-doubles.js';

const verifiedMatch: VerifiedGoverningBodyMatch = {
  state: {
    kind: 'state',
    name: 'Test State',
    type: 'state',
    verificationStatus: 'verified',
    lastVerifiedOn: '2026-07-12',
    sourceUrl: 'https://state.gov.test/directory',
  },
  district: null,
  taluka: null,
  authority: {
    kind: 'authority',
    name: 'Test Municipal Authority',
    type: 'local_body',
    verificationStatus: 'verified',
    lastVerifiedOn: '2026-07-12',
    sourceUrl: 'https://municipality.gov.test/about',
  },
  localBody: {
    kind: 'local_body',
    name: 'Test Municipal Corporation',
    type: 'municipal_corporation',
    verificationStatus: 'verified',
    lastVerifiedOn: '2026-07-12',
    sourceUrl: 'https://municipality.gov.test',
  },
  ward: {
    kind: 'ward',
    name: 'Test Ward 1',
    type: 'ward',
    verificationStatus: 'verified',
    lastVerifiedOn: '2026-07-12',
    sourceUrl: 'https://municipality.gov.test/wards',
  },
};

class FakeGovernanceDirectoryStore extends GovernanceDirectoryStore {
  public matches: VerifiedGoverningBodyMatch[] = [verifiedMatch];
  public queries: GoverningBodyDirectoryQuery[] = [];
  public fail = false;

  public async resolveVerifiedGoverningBodies(
    query: GoverningBodyDirectoryQuery,
  ): Promise<VerifiedGoverningBodyMatch[]> {
    this.queries.push(query);
    if (this.fail) {
      throw new GovernanceDirectoryDataAccessError('resolve verified governing bodies');
    }
    return this.matches;
  }
}

const requestBody = {
  latitude: 18.5204,
  longitude: 73.8567,
  accuracyMeters: 20,
  capturedAt: '2026-07-13T09:59:00+00:00',
};

describe('API governing-body directory contract', () => {
  let application: INestApplication;
  let store: FakeGovernanceDirectoryStore;

  beforeEach(async () => {
    store = new FakeGovernanceDirectoryStore();
    const testingModule = await Test.createTestingModule({
      controllers: [GovernanceDirectoryController],
      providers: [
        GovernanceDirectoryService,
        BearerAuthGuard,
        RequestIdMiddleware,
        { provide: Clock, useValue: new FixedClock() },
        { provide: API_CONFIGURATION, useValue: apiConfiguration },
        { provide: GovernanceDirectoryStore, useValue: store },
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

  it('returns one useful verified projection without private governance fields', async () => {
    const response = await request(application.getHttpServer())
      .post('/api/v1/governance/bodies/resolve')
      .set('authorization', 'Bearer valid-access-token')
      .send(requestBody)
      .expect(200);

    assert.deepEqual(response.body.data, {
      status: 'resolved',
      reason: 'verified_governing_body_match',
      maximumAccuracyMeters: 100,
      matches: [verifiedMatch],
    });
    assert.deepEqual(store.queries, [
      {
        location: { latitude: requestBody.latitude, longitude: requestBody.longitude },
        accuracyMeters: requestBody.accuracyMeters,
        resolvedAt: '2026-07-13T10:00:00.000Z',
      },
    ]);

    const serialized = JSON.stringify(response.body.data);
    assert.equal(serialized.includes('phone'), false);
    assert.equal(serialized.includes('email'), false);
    assert.equal(serialized.includes('geometry'), false);
    assert.equal(serialized.includes('latitude'), false);
    assert.equal(serialized.includes('Id"'), false);
  });

  it('reports unsupported and ambiguous states honestly', async () => {
    store.matches = [];
    const unsupported = await request(application.getHttpServer())
      .post('/api/v1/governance/bodies/resolve')
      .set('authorization', 'Bearer valid-access-token')
      .send(requestBody)
      .expect(200);
    assert.equal(unsupported.body.data.status, 'unsupported');
    assert.deepEqual(unsupported.body.data.matches, []);

    store.matches = [
      verifiedMatch,
      {
        ...verifiedMatch,
        localBody: { ...verifiedMatch.localBody, name: 'Second Verified Corporation' },
      },
    ];
    const ambiguous = await request(application.getHttpServer())
      .post('/api/v1/governance/bodies/resolve')
      .set('authorization', 'Bearer valid-access-token')
      .send(requestBody)
      .expect(200);
    assert.equal(ambiguous.body.data.status, 'ambiguous');
    assert.equal(ambiguous.body.data.matches.length, 2);
  });

  it('rejects low-quality evidence before querying governance data', async () => {
    const response = await request(application.getHttpServer())
      .post('/api/v1/governance/bodies/resolve')
      .set('authorization', 'Bearer valid-access-token')
      .send({ ...requestBody, accuracyMeters: 100.01 })
      .expect(200);

    assert.deepEqual(response.body.data, {
      status: 'low_accuracy',
      reason: 'location_accuracy_exceeds_governing_body_limit',
      maximumAccuracyMeters: 100,
      matches: [],
    });
    assert.equal(store.queries.length, 0);
  });

  it('requires authentication and rejects client-selected governance scope', async () => {
    await request(application.getHttpServer())
      .post('/api/v1/governance/bodies/resolve')
      .send(requestBody)
      .expect(401);
    await request(application.getHttpServer())
      .post('/api/v1/governance/bodies/resolve')
      .set('authorization', 'Bearer valid-access-token')
      .send({ ...requestBody, localBodyId: '11111111-1111-4111-8111-111111111111' })
      .expect(400);
    assert.equal(store.queries.length, 0);
  });

  it('rejects future location evidence and safely maps dependency failures', async () => {
    const future = await request(application.getHttpServer())
      .post('/api/v1/governance/bodies/resolve')
      .set('authorization', 'Bearer valid-access-token')
      .send({ ...requestBody, capturedAt: '2026-07-13T10:03:00+00:00' })
      .expect(400);
    assert.equal(future.body.error.code, 'LOCATION_CAPTURED_IN_FUTURE');

    store.fail = true;
    const failure = await request(application.getHttpServer())
      .post('/api/v1/governance/bodies/resolve')
      .set('authorization', 'Bearer valid-access-token')
      .send(requestBody)
      .expect(503);
    assert.equal(failure.body.error.code, 'DEPENDENCY_UNAVAILABLE');
    assert.equal(
      failure.body.error.message,
      'Verified governing-body data is temporarily unavailable.',
    );
  });
});
