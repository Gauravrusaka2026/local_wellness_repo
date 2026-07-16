import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { configureApiApplication } from '../application.js';
import { RequestIdMiddleware } from '../common/request-id.middleware.js';
import { Clock } from '../common/clock.js';
import { API_CONFIGURATION } from '../configuration.js';
import { HealthStore } from '../data/health.store.js';
import { HealthController } from '../health/health.controller.js';
import { HealthService } from '../health/health.service.js';
import { apiConfiguration } from './test-doubles.js';
import { FixedClock } from './test-doubles.js';

class FakeHealthStore extends HealthStore {
  public ready = true;
  public error: Error | null = null;

  public async isReady(): Promise<boolean> {
    if (this.error) throw this.error;
    return this.ready;
  }
}

describe('API health contract', () => {
  let application: INestApplication;
  let store: FakeHealthStore;

  beforeEach(async () => {
    store = new FakeHealthStore();
    const testingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        RequestIdMiddleware,
        { provide: Clock, useValue: new FixedClock() },
        { provide: API_CONFIGURATION, useValue: apiConfiguration },
        { provide: HealthStore, useValue: store },
      ],
    }).compile();

    application = testingModule.createNestApplication();
    configureApiApplication(application);
    await application.listen(0, '127.0.0.1');
  });

  afterEach(async () => {
    await application.close();
  });

  it('reports liveness without consulting dependencies and emits hardened headers', async () => {
    store.error = new Error('dependency unavailable');

    const response = await request(application.getHttpServer()).get('/health/live').expect(200);

    assert.equal(response.body.data.status, 'live');
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(response.headers['x-frame-options'], 'DENY');
    assert.equal(response.headers['referrer-policy'], 'no-referrer');
    assert.equal(response.headers['x-powered-by'], undefined);
  });

  it('reports readiness when the required database probe succeeds', async () => {
    const readyResponse = await request(application.getHttpServer())
      .get('/health/ready')
      .expect(200);

    assert.equal(readyResponse.body.data.status, 'ready');
    assert.equal(readyResponse.headers['cache-control'], 'no-store');
  });

  it('reports not ready when the required database evidence is incomplete', async () => {
    store.ready = false;
    const unavailableResponse = await request(application.getHttpServer())
      .get('/health/ready')
      .expect(503);

    assert.deepEqual(unavailableResponse.body.error, {
      code: 'DEPENDENCY_UNAVAILABLE',
      message: 'The API is not ready.',
    });
    assert.equal(typeof unavailableResponse.body.meta.requestId, 'string');
  });

  it('fails readiness closed without exposing dependency errors', async () => {
    store.error = new Error('sensitive provider details');

    const response = await request(application.getHttpServer()).get('/health/ready').expect(503);

    assert.equal(response.body.error.code, 'DEPENDENCY_UNAVAILABLE');
    assert.doesNotMatch(JSON.stringify(response.body), /sensitive provider details/u);
  });
});
