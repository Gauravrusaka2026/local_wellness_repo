import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { GovernmentInvitationsController } from '../admin/government-invitations.controller.js';
import { GovernmentInvitationsService } from '../admin/government-invitations.service.js';
import { configureApiApplication } from '../application.js';
import { AuthenticationGateway } from '../auth/authentication.gateway.js';
import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { Clock } from '../common/clock.js';
import { RequestIdMiddleware } from '../common/request-id.middleware.js';
import { API_CONFIGURATION } from '../configuration.js';
import { IdentityStore } from '../data/identity.store.js';
import {
  activeProfile,
  apiConfiguration,
  FakeAuthenticationGateway,
  FakeIdentityStore,
  FixedClock,
} from './test-doubles.js';

const authorityId = '1579439f-6e87-46d4-8411-e6559f4ddf51';

describe('government invitation options API', () => {
  let application: INestApplication;
  let identityStore: FakeIdentityStore;

  beforeEach(async () => {
    identityStore = new FakeIdentityStore();
    identityStore.privilegedMfaRequired = true;
    identityStore.access.roles = [
      {
        assignmentId: 'dd5df9ca-0e7f-45c4-93c5-c6db4c8161bf',
        authorityId: null,
        code: 'platform_admin',
        description: null,
        effectiveFrom: '2026-07-01T00:00:00.000Z',
        effectiveUntil: null,
        isGovernment: false,
        isPrivileged: true,
        name: 'Platform administrator',
        roleId: '6e59a3c4-7853-499d-b61c-cbc503d495fb',
        scopeId: null,
        scopeType: 'global',
      },
    ];
    identityStore.governmentInvitationOptions = {
      authorities: [
        {
          authorityType: 'municipal_corporation',
          code: 'BMC',
          id: authorityId,
          name: 'Brihanmumbai Municipal Corporation',
        },
      ],
      departments: [
        {
          authorityId,
          code: 'HEALTH',
          id: '7a6af88b-d00e-44dc-b21d-af5b778d1441',
          name: 'Public Health Department',
          type: 'department',
        },
      ],
      wards: [],
    };

    const authenticationGateway = new FakeAuthenticationGateway();
    authenticationGateway.verifiedUser = {
      assuranceLevel: 'aal2',
      email: activeProfile.email,
      id: activeProfile.id,
      phone: null,
    };

    const testingModule = await Test.createTestingModule({
      controllers: [GovernmentInvitationsController],
      providers: [
        GovernmentInvitationsService,
        BearerAuthGuard,
        RequestIdMiddleware,
        { provide: Clock, useValue: new FixedClock() },
        { provide: API_CONFIGURATION, useValue: apiConfiguration },
        { provide: IdentityStore, useValue: identityStore },
        { provide: AuthenticationGateway, useValue: authenticationGateway },
      ],
    }).compile();

    application = testingModule.createNestApplication();
    configureApiApplication(application);
    await application.listen(0, '127.0.0.1');
  });

  afterEach(async () => {
    await application.close();
  });

  it('returns the authorized selector contract without allowing caches to retain it', async () => {
    const response = await request(application.getHttpServer())
      .get('/api/v1/admin/government-invitations/options')
      .set('authorization', 'Bearer valid-access-token')
      .expect(200);

    assert.deepEqual(response.body.data, identityStore.governmentInvitationOptions);
    assert.equal(response.headers['cache-control'], 'private, no-store');
    assert.equal(identityStore.governmentInvitationAuthorityFilter, null);
  });

  it('requires an authenticated bearer session before listing governance scopes', async () => {
    const response = await request(application.getHttpServer())
      .get('/api/v1/admin/government-invitations/options')
      .expect(401);

    assert.equal(response.body.error.code, 'AUTH_REQUIRED');
    assert.equal(identityStore.governmentInvitationAuthorityFilter, undefined);
  });
});
