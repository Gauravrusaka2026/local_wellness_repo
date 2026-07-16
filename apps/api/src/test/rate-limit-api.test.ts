import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { configureApiApplication } from '../application.js';
import { AuthenticationGateway } from '../auth/authentication.gateway.js';
import { AuthAuditController } from '../auth/auth-audit.controller.js';
import { AuthAuditService } from '../auth/auth-audit.service.js';
import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { Clock } from '../common/clock.js';
import { RateLimitInterceptor } from '../common/rate-limit.js';
import { RequestIdMiddleware } from '../common/request-id.middleware.js';
import { API_CONFIGURATION } from '../configuration.js';
import { IdentityStore } from '../data/identity.store.js';
import {
  RateLimitDataAccessError,
  RateLimitStore,
  type ConsumeRateLimitInput,
  type RateLimitConsumption,
} from '../data/rate-limit.store.js';
import {
  apiConfiguration,
  FakeAuthenticationGateway,
  FakeIdentityStore,
  FixedClock,
} from './test-doubles.js';

class FakeRateLimitStore extends RateLimitStore {
  public consumption: RateLimitConsumption = {
    allowed: true,
    limit: 30,
    remaining: 29,
    resetAt: '2026-07-13T10:01:00.000Z',
  };
  public error: Error | null = null;
  public inputs: ConsumeRateLimitInput[] = [];

  public async consume(input: ConsumeRateLimitInput): Promise<RateLimitConsumption> {
    this.inputs.push(input);
    if (this.error) throw this.error;
    return this.consumption;
  }
}

describe('API PostgreSQL-backed rate-limit contract', () => {
  let application: INestApplication;
  let store: FakeRateLimitStore;

  beforeEach(async () => {
    store = new FakeRateLimitStore();
    const testingModule = await Test.createTestingModule({
      controllers: [AuthAuditController],
      providers: [
        AuthAuditService,
        BearerAuthGuard,
        RateLimitInterceptor,
        Reflector,
        RequestIdMiddleware,
        { provide: Clock, useValue: new FixedClock() },
        { provide: API_CONFIGURATION, useValue: apiConfiguration },
        { provide: IdentityStore, useValue: new FakeIdentityStore() },
        { provide: AuthenticationGateway, useValue: new FakeAuthenticationGateway() },
        { provide: RateLimitStore, useValue: store },
      ],
    }).compile();

    application = testingModule.createNestApplication();
    configureApiApplication(application, {
      rateLimitInterceptor: testingModule.get(RateLimitInterceptor),
    });
    await application.listen(0, '127.0.0.1');
  });

  afterEach(async () => {
    await application.close();
  });

  it('consumes the endpoint policy using only a one-way actor hash', async () => {
    const response = await request(application.getHttpServer())
      .post('/api/v1/auth/audit-events')
      .set('authorization', 'Bearer valid-access-token')
      .send({ eventType: 'session_refreshed' })
      .expect(201);

    assert.equal(response.headers['ratelimit-limit'], '30');
    assert.equal(response.headers['ratelimit-remaining'], '29');
    assert.equal(response.headers['ratelimit-reset'], '1783936860');
    assert.equal(store.inputs.length, 1);
    assert.equal(store.inputs[0]?.scope, 'auth_audit_append');
    assert.equal(store.inputs[0]?.windowSeconds, 60);
    assert.match(store.inputs[0]?.subjectSha256 ?? '', /^[0-9a-f]{64}$/u);
    assert.notEqual(store.inputs[0]?.subjectSha256, '7cd50865-9ebd-4a79-abaa-f059a1632985');
  });

  it('returns a stable 429 envelope and Retry-After without reaching the handler', async () => {
    store.consumption = {
      allowed: false,
      limit: 30,
      remaining: 0,
      resetAt: '2026-07-13T10:01:00.000Z',
    };

    const response = await request(application.getHttpServer())
      .post('/api/v1/auth/audit-events')
      .set('authorization', 'Bearer valid-access-token')
      .send({ eventType: 'session_refreshed' })
      .expect(429);

    assert.deepEqual(response.body.error, {
      code: 'RATE_LIMITED',
      message: 'Too many requests were received.',
    });
    assert.equal(response.headers['retry-after'], '60');
  });

  it('fails protected mutations closed when shared quota persistence is unavailable', async () => {
    store.error = new RateLimitDataAccessError();

    const response = await request(application.getHttpServer())
      .post('/api/v1/auth/audit-events')
      .set('authorization', 'Bearer valid-access-token')
      .send({ eventType: 'session_refreshed' })
      .expect(503);

    assert.deepEqual(response.body.error, {
      code: 'DEPENDENCY_UNAVAILABLE',
      message: 'Request quota enforcement is temporarily unavailable.',
    });
  });
});
