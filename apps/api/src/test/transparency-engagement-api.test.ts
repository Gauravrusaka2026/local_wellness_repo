import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  PublicComplaintDetail,
  PublicComplaintEngagementState,
  PublicComplaintHotspotQuery,
  PublicComplaintHotspotResult,
  PublicComplaintMapQuery,
  PublicComplaintMapResult,
  PublicWardBoundaryQuery,
  PublicWardBoundaryResult,
} from '@local-wellness/types';
import request from 'supertest';

import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { configureApiApplication } from '../application.js';
import { RequestIdMiddleware } from '../common/request-id.middleware.js';
import type { RequestContext } from '../common/request-context.js';
import { API_CONFIGURATION } from '../configuration.js';
import { TransparencyStore } from '../data/transparency.store.js';
import { TransparencyEngagementController } from '../transparency/transparency-engagement.controller.js';
import { TransparencyService } from '../transparency/transparency.service.js';
import { apiConfiguration } from './test-doubles.js';

const actorUserId = '7cd50865-9ebd-4a79-abaa-f059a1632985';
const publicId = '30000000-0000-4000-8000-000000000003';

class AuthenticatedTestGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const currentRequest = context.switchToHttp().getRequest<RequestContext>();
    currentRequest.authenticatedUser = {
      assuranceLevel: 'aal1',
      email: 'citizen@example.com',
      id: actorUserId,
      phone: null,
    };
    return true;
  }
}

class EngagementStore extends TransparencyStore {
  public state: PublicComplaintEngagementState = {
    publicId,
    starred: false,
    supportCount: 4,
    supported: false,
  };
  public actorUserId: string | null = null;

  public async listComplaints(_query: PublicComplaintMapQuery): Promise<PublicComplaintMapResult> {
    void _query;
    return { hasMore: false, items: [], nextCursor: null };
  }

  public async listHotspots(
    _query: PublicComplaintHotspotQuery,
  ): Promise<PublicComplaintHotspotResult> {
    void _query;
    return { items: [] };
  }

  public async listWards(_query: PublicWardBoundaryQuery): Promise<PublicWardBoundaryResult> {
    void _query;
    return { items: [] };
  }

  public async getComplaint(_publicId: string): Promise<PublicComplaintDetail | null> {
    void _publicId;
    return null;
  }

  public async listEngagements(
    requestedActorUserId: string,
    publicIds: readonly string[],
  ): Promise<PublicComplaintEngagementState[]> {
    this.actorUserId = requestedActorUserId;
    return publicIds.includes(publicId) ? [this.state] : [];
  }

  public async setEngagement(
    requestedActorUserId: string,
    requestedPublicId: string,
    input: Readonly<{ supported: boolean; starred: boolean }>,
  ): Promise<PublicComplaintEngagementState | null> {
    this.actorUserId = requestedActorUserId;
    if (requestedPublicId !== publicId) return null;
    this.state = {
      publicId,
      starred: input.starred,
      supportCount: input.supported ? 5 : 4,
      supported: input.supported,
    };
    return this.state;
  }
}

describe('authenticated public complaint engagement API', () => {
  let application: INestApplication;
  let store: EngagementStore;

  beforeEach(async () => {
    store = new EngagementStore();
    const testingModule = await Test.createTestingModule({
      controllers: [TransparencyEngagementController],
      providers: [
        TransparencyService,
        RequestIdMiddleware,
        { provide: API_CONFIGURATION, useValue: apiConfiguration },
        { provide: TransparencyStore, useValue: store },
      ],
    })
      .overrideGuard(BearerAuthGuard)
      .useClass(AuthenticatedTestGuard)
      .compile();

    application = testingModule.createNestApplication();
    configureApiApplication(application);
    await application.listen(0, '127.0.0.1');
  });

  afterEach(async () => {
    await application.close();
  });

  it('returns private viewer state without exposing an actor identifier', async () => {
    const response = await request(application.getHttpServer())
      .post('/api/v1/transparency/engagements/lookup')
      .set('Authorization', 'Bearer test')
      .send({ publicIds: [publicId] })
      .expect(201);

    assert.equal(response.headers['cache-control'], 'no-store');
    assert.deepEqual(response.body.data, [store.state]);
    assert.equal(response.body.data[0].userId, undefined);
    assert.equal(store.actorUserId, actorUserId);
  });

  it('idempotently sets support and star state for a reviewed public identifier', async () => {
    const response = await request(application.getHttpServer())
      .put(`/api/v1/transparency/complaints/${publicId}/engagement`)
      .set('Authorization', 'Bearer test')
      .send({ starred: true, supported: true })
      .expect(200);

    assert.deepEqual(response.body.data, {
      publicId,
      starred: true,
      supportCount: 5,
      supported: true,
    });
    assert.equal(store.actorUserId, actorUserId);
  });

  it('rejects duplicate lookups and malformed set-state payloads before persistence', async () => {
    await request(application.getHttpServer())
      .post('/api/v1/transparency/engagements/lookup')
      .set('Authorization', 'Bearer test')
      .send({ publicIds: [publicId, publicId] })
      .expect(400);
    await request(application.getHttpServer())
      .put(`/api/v1/transparency/complaints/${publicId}/engagement`)
      .set('Authorization', 'Bearer test')
      .send({ starred: true })
      .expect(400);

    assert.equal(store.actorUserId, null);
  });
});
