import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  AdvanceMessageReadReceiptInput,
  ComplaintMessage,
  CreatePrivateComplaintMessageInput,
  MessageKeysetQuery,
  NotificationListQuery,
} from '@local-wellness/types';
import request from 'supertest';

import { configureApiApplication } from '../application.js';
import { AuthenticationGateway } from '../auth/authentication.gateway.js';
import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { Clock } from '../common/clock.js';
import { RequestIdMiddleware } from '../common/request-id.middleware.js';
import { CommunicationsController } from '../communications/communications.controller.js';
import { CommunicationsService } from '../communications/communications.service.js';
import { API_CONFIGURATION } from '../configuration.js';
import { CommunicationStore } from '../data/communication.store.js';
import { IdentityStore } from '../data/identity.store.js';
import {
  apiConfiguration,
  FakeAuthenticationGateway,
  FakeIdentityStore,
  FixedClock,
} from './test-doubles.js';

const identifiers = {
  complaint: '10000000-0000-4000-8000-000000000001',
  event: '10000000-0000-4000-8000-000000000002',
  message: '10000000-0000-4000-8000-000000000003',
  notification: '10000000-0000-4000-8000-000000000004',
} as const;
const occurredAt = '2026-07-14T12:00:00.000Z';

const message: ComplaintMessage = {
  id: identifiers.message,
  complaintId: identifiers.complaint,
  kind: 'private_message',
  authorType: 'citizen',
  authoredByMe: true,
  body: 'Please share an update.',
  createdAt: occurredAt,
};

class FakeCommunicationStore extends CommunicationStore {
  public createdInput: CreatePrivateComplaintMessageInput | null = null;
  public messageQuery: MessageKeysetQuery | null = null;
  public notificationQuery: NotificationListQuery | null = null;

  public override async createMessage(
    _actorUserId: string,
    _complaintId: string,
    input: CreatePrivateComplaintMessageInput,
  ) {
    this.createdInput = input;
    return { ...message, body: input.body };
  }

  public override async listMessages(
    _actorUserId: string,
    _complaintId: string,
    query: MessageKeysetQuery,
  ) {
    this.messageQuery = query;
    return { items: [message], nextCursor: null };
  }

  public override async markMessagesRead(
    _actorUserId: string,
    complaintId: string,
    input: AdvanceMessageReadReceiptInput,
  ) {
    return { complaintId, ...input, updatedAt: occurredAt };
  }

  public override async listNotifications(_actorUserId: string, query: NotificationListQuery) {
    this.notificationQuery = query;
    return {
      items: [
        {
          id: identifiers.notification,
          eventId: identifiers.event,
          eventType: 'message' as const,
          payload: { complaintId: identifiers.complaint, messageId: identifiers.message },
          occurredAt,
          createdAt: occurredAt,
          readAt: null,
        },
      ],
      nextCursor: null,
    };
  }

  public override async markNotificationRead(_actorUserId: string, notificationId: string) {
    return { notificationId, readAt: occurredAt };
  }
}

describe('communications API', () => {
  let application: INestApplication;
  let store: FakeCommunicationStore;

  beforeEach(async () => {
    store = new FakeCommunicationStore();
    const testingModule = await Test.createTestingModule({
      controllers: [CommunicationsController],
      providers: [
        CommunicationsService,
        BearerAuthGuard,
        RequestIdMiddleware,
        { provide: Clock, useValue: new FixedClock() },
        { provide: API_CONFIGURATION, useValue: apiConfiguration },
        { provide: CommunicationStore, useValue: store },
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

  it('persists a strict trimmed private message and returns a no-store envelope', async () => {
    const response = await request(application.getHttpServer())
      .post(`/api/v1/complaints/${identifiers.complaint}/messages`)
      .set('authorization', 'Bearer valid-access-token')
      .send({ clientMessageId: identifiers.event, body: '  Please share an update.  ' })
      .expect(201);

    assert.deepEqual(store.createdInput, {
      clientMessageId: identifiers.event,
      body: 'Please share an update.',
    });
    assert.equal(response.body.data.id, identifiers.message);
    assert.equal(response.headers['cache-control'], 'private, no-store');
  });

  it('rejects unknown official or privacy-sensitive message fields', async () => {
    await request(application.getHttpServer())
      .post(`/api/v1/complaints/${identifiers.complaint}/messages`)
      .set('authorization', 'Bearer valid-access-token')
      .send({
        clientMessageId: identifiers.event,
        body: 'Hello',
        authorityId: identifiers.notification,
      })
      .expect(400);

    assert.equal(store.createdInput, null);
  });

  it('uses bounded pagination defaults and rejects an incomplete keyset cursor', async () => {
    await request(application.getHttpServer())
      .get(`/api/v1/complaints/${identifiers.complaint}/messages`)
      .set('authorization', 'Bearer valid-access-token')
      .expect(200);
    assert.deepEqual(store.messageQuery, { limit: 25 });

    await request(application.getHttpServer())
      .get(`/api/v1/complaints/${identifiers.complaint}/messages`)
      .query({ beforeId: identifiers.message })
      .set('authorization', 'Bearer valid-access-token')
      .expect(400);
  });

  it('records a monotonic read-through position and notification read state', async () => {
    const messageResponse = await request(application.getHttpServer())
      .post(`/api/v1/complaints/${identifiers.complaint}/messages/read`)
      .set('authorization', 'Bearer valid-access-token')
      .send({ readThroughCreatedAt: occurredAt, readThroughMessageId: identifiers.message })
      .expect(201);
    assert.equal(messageResponse.body.data.readThroughMessageId, identifiers.message);

    const notificationResponse = await request(application.getHttpServer())
      .post(`/api/v1/notifications/${identifiers.notification}/read`)
      .set('authorization', 'Bearer valid-access-token')
      .expect(201);
    assert.equal(notificationResponse.body.data.notificationId, identifiers.notification);
  });

  it('lists persistent notifications for offline catch-up and requires authentication', async () => {
    const response = await request(application.getHttpServer())
      .get('/api/v1/notifications?limit=10')
      .set('authorization', 'Bearer valid-access-token')
      .expect(200);
    assert.equal(response.body.data.items[0].eventType, 'message');
    assert.deepEqual(store.notificationQuery, { limit: 10 });

    await request(application.getHttpServer()).get('/api/v1/notifications').expect(401);
  });
});
