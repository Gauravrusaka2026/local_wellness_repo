import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { configureApiApplication } from '../application.js';
import { AuthenticationGateway } from '../auth/authentication.gateway.js';
import { AuthAuditController } from '../auth/auth-audit.controller.js';
import { AuthAuditService } from '../auth/auth-audit.service.js';
import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { Clock } from '../common/clock.js';
import { RequestIdMiddleware } from '../common/request-id.middleware.js';
import { API_CONFIGURATION } from '../configuration.js';
import { IdentityStore } from '../data/identity.store.js';
import { ProfilesController } from '../identity/profiles.controller.js';
import { ProfilesService } from '../identity/profiles.service.js';
import {
  activeProfile,
  apiConfiguration,
  FakeAuthenticationGateway,
  FakeIdentityStore,
  FixedClock,
} from './test-doubles.js';

describe('API identity contract', () => {
  let application: INestApplication;
  let identityStore: FakeIdentityStore;

  beforeEach(async () => {
    identityStore = new FakeIdentityStore();
    const testingModule = await Test.createTestingModule({
      controllers: [AuthAuditController, ProfilesController],
      providers: [
        AuthAuditService,
        ProfilesService,
        BearerAuthGuard,
        RequestIdMiddleware,
        { provide: Clock, useValue: new FixedClock() },
        { provide: API_CONFIGURATION, useValue: apiConfiguration },
        { provide: IdentityStore, useValue: identityStore },
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

  it('returns the documented success envelope and propagates a safe request ID', async () => {
    const response = await request(application.getHttpServer())
      .get('/api/v1/me')
      .set('authorization', 'Bearer valid-access-token')
      .set('x-request-id', 'client-request-123')
      .expect(200);

    assert.deepEqual(response.body, {
      data: activeProfile,
      meta: { requestId: 'client-request-123' },
    });
    assert.equal(response.headers['x-request-id'], 'client-request-123');
  });

  it('returns the documented validation error envelope without mass assignment', async () => {
    const response = await request(application.getHttpServer())
      .patch('/api/v1/me')
      .set('authorization', 'Bearer valid-access-token')
      .send({ status: 'active' })
      .expect(400);

    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
    assert.equal(response.body.error.message, 'The request is invalid.');
    assert.equal(typeof response.body.meta.requestId, 'string');
    assert.equal(identityStore.profile?.displayName, activeProfile.displayName);
  });

  it('rejects requests without a bearer token using the error envelope', async () => {
    const response = await request(application.getHttpServer()).get('/api/v1/me').expect(401);

    assert.equal(response.body.error.code, 'AUTH_REQUIRED');
    assert.equal(typeof response.body.meta.requestId, 'string');
  });

  it('rejects a disabled application profile even when the bearer token is valid', async () => {
    identityStore.profile = { ...activeProfile, status: 'disabled' };

    const response = await request(application.getHttpServer())
      .get('/api/v1/me')
      .set('authorization', 'Bearer valid-access-token')
      .expect(403);

    assert.equal(response.body.error.code, 'ACCOUNT_INACTIVE');
    assert.equal(typeof response.body.meta.requestId, 'string');
  });

  it('rejects attempts to forge server-owned authentication audit events', async () => {
    const response = await request(application.getHttpServer())
      .post('/api/v1/auth/audit-events')
      .set('authorization', 'Bearer valid-access-token')
      .send({
        eventType: 'government_invitation_created',
        outcome: 'success',
      })
      .expect(400);

    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
    assert.deepEqual(identityStore.auditEvents, []);
  });

  it('stamps client-reported audit events with a server-owned source', async () => {
    await request(application.getHttpServer())
      .post('/api/v1/auth/audit-events')
      .set('authorization', 'Bearer valid-access-token')
      .send({
        eventType: 'session_refreshed',
        metadata: {
          clientSurface: 'citizen_web',
          source: 'server_generated',
        },
      })
      .expect(201);

    assert.deepEqual(identityStore.auditEvents[0]?.metadata, {
      clientSurface: 'citizen_web',
      source: 'client_reported',
    });
  });

  it('allows only configured browser origins through CORS', async () => {
    const allowedResponse = await request(application.getHttpServer())
      .options('/api/v1/me')
      .set('origin', 'https://citizen.example.com')
      .set('access-control-request-method', 'GET')
      .expect(204);

    assert.equal(
      allowedResponse.headers['access-control-allow-origin'],
      'https://citizen.example.com',
    );

    const deniedResponse = await request(application.getHttpServer())
      .options('/api/v1/me')
      .set('origin', 'https://untrusted.example.com')
      .set('access-control-request-method', 'GET')
      .expect(204);

    assert.equal(deniedResponse.headers['access-control-allow-origin'], undefined);
  });
});
