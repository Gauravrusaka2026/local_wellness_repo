import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  advanceMessageReadReceiptSchema,
  createPrivateComplaintMessageSchema,
  createPublicComplaintCommentSchema,
  messageKeysetQuerySchema,
  notificationChannelSchema,
  notificationEventTypeSchema,
  notificationListQuerySchema,
  notificationReadSchema,
  socketHandshakeAuthSchema,
  socketMessageCreateSchema,
  socketMessageReadSchema,
  socketOperationAcknowledgementSchema,
  socketRoomJoinSchema,
  socketRoomLeaveSchema,
  socketTypingStartSchema,
  socketTypingStopSchema,
} from './communication.schemas.js';

const identifiers = {
  complaint: '10000000-0000-4000-8000-000000000001',
  message: '10000000-0000-4000-8000-000000000002',
  notification: '10000000-0000-4000-8000-000000000003',
  room: '10000000-0000-4000-8000-000000000004',
} as const;
const timestamp = '2026-07-14T10:00:00.000Z';

describe('communication validation', () => {
  it('trims bounded private messages and rejects unknown fields', () => {
    assert.deepEqual(
      createPrivateComplaintMessageSchema.parse({
        clientMessageId: identifiers.message,
        body: '  Please inspect this issue.  ',
      }),
      {
        clientMessageId: identifiers.message,
        body: 'Please inspect this issue.',
      },
    );
    assert.equal(
      createPrivateComplaintMessageSchema.safeParse({
        clientMessageId: identifiers.message,
        body: 'Message',
        exactLocation: { latitude: 18.52, longitude: 73.85 },
      }).success,
      false,
    );
    assert.equal(
      createPrivateComplaintMessageSchema.safeParse({
        clientMessageId: identifiers.message,
        body: ' '.repeat(10),
      }).success,
      false,
    );
    assert.equal(
      createPrivateComplaintMessageSchema.safeParse({
        clientMessageId: identifiers.message,
        body: 'a'.repeat(4_001),
      }).success,
      false,
    );
  });

  it('supports the bounded public-comment structure without accepting extra visibility data', () => {
    assert.equal(
      createPublicComplaintCommentSchema.safeParse({
        clientMessageId: identifiers.message,
        body: '  Public-safe comment  ',
      }).success,
      true,
    );
    assert.equal(
      createPublicComplaintCommentSchema.safeParse({
        clientMessageId: identifiers.message,
        body: 'Public-safe comment',
        isPublic: true,
      }).success,
      false,
    );
  });

  it('requires complete keyset cursors and enforces listing limits', () => {
    assert.deepEqual(messageKeysetQuerySchema.parse({}), { limit: 25 });
    assert.equal(
      messageKeysetQuerySchema.safeParse({
        limit: 100,
        beforeCreatedAt: timestamp,
        beforeId: identifiers.message,
      }).success,
      true,
    );
    assert.equal(messageKeysetQuerySchema.safeParse({ beforeCreatedAt: timestamp }).success, false);
    assert.equal(
      messageKeysetQuerySchema.safeParse({ beforeId: identifiers.message }).success,
      false,
    );
    assert.equal(messageKeysetQuerySchema.safeParse({ limit: 0 }).success, false);
    assert.equal(messageKeysetQuerySchema.safeParse({ limit: 101 }).success, false);

    assert.equal(
      notificationListQuerySchema.safeParse({
        beforeCreatedAt: timestamp,
        beforeId: identifiers.notification,
      }).success,
      true,
    );
    assert.equal(
      notificationListQuerySchema.safeParse({ beforeCreatedAt: timestamp }).success,
      false,
    );
  });

  it('accepts only a complete monotonic read-through position and strict notification identifier', () => {
    const readThrough = {
      readThroughCreatedAt: timestamp,
      readThroughMessageId: identifiers.message,
    };

    assert.equal(advanceMessageReadReceiptSchema.safeParse(readThrough).success, true);
    assert.equal(
      advanceMessageReadReceiptSchema.safeParse({
        readThroughMessageId: identifiers.message,
      }).success,
      false,
    );
    assert.equal(
      notificationReadSchema.safeParse({ notificationId: identifiers.notification }).success,
      true,
    );
    assert.equal(
      notificationReadSchema.safeParse({
        notificationId: identifiers.notification,
        readAt: timestamp,
      }).success,
      false,
    );
  });

  it('rejects unsupported notification event types and channels', () => {
    assert.equal(notificationEventTypeSchema.safeParse('status_update').success, true);
    assert.equal(notificationEventTypeSchema.safeParse('internal_note').success, false);
    assert.equal(notificationChannelSchema.safeParse('in_app').success, true);
    assert.equal(notificationChannelSchema.safeParse('sms').success, false);
  });

  it('bounds handshake tokens and validates join, leave, and typing targets', () => {
    assert.equal(
      socketHandshakeAuthSchema.safeParse({ accessToken: 'a'.repeat(16) }).success,
      true,
    );
    assert.equal(socketHandshakeAuthSchema.safeParse({ accessToken: 'short' }).success, false);
    assert.equal(
      socketHandshakeAuthSchema.safeParse({ accessToken: `token ${'a'.repeat(16)}` }).success,
      false,
    );
    assert.equal(
      socketHandshakeAuthSchema.safeParse({
        accessToken: 'a'.repeat(16),
        refreshToken: 'must-not-be-accepted',
      }).success,
      false,
    );

    for (const schema of [socketRoomJoinSchema, socketRoomLeaveSchema]) {
      assert.equal(
        schema.safeParse({ roomType: 'authority', roomId: identifiers.room }).success,
        true,
      );
      assert.equal(schema.safeParse({ roomType: 'user', roomId: identifiers.room }).success, false);
    }

    assert.equal(
      socketTypingStartSchema.safeParse({ complaintId: identifiers.complaint }).success,
      true,
    );
    assert.equal(
      socketTypingStopSchema.safeParse({ complaintId: identifiers.complaint }).success,
      true,
    );
    assert.equal(
      socketTypingStartSchema.safeParse({
        complaintId: identifiers.complaint,
        userId: identifiers.room,
      }).success,
      false,
    );
  });

  it('strictly validates socket message and read payloads', () => {
    assert.deepEqual(
      socketMessageCreateSchema.parse({
        complaintId: identifiers.complaint,
        clientMessageId: identifiers.message,
        body: '  A private complaint message.  ',
      }),
      {
        complaintId: identifiers.complaint,
        clientMessageId: identifiers.message,
        body: 'A private complaint message.',
      },
    );
    assert.equal(
      socketMessageCreateSchema.safeParse({
        complaintId: identifiers.complaint,
        clientMessageId: identifiers.message,
        body: 'Message',
        mediaPath: 'private/object',
      }).success,
      false,
    );
    assert.equal(
      socketMessageReadSchema.safeParse({
        complaintId: identifiers.complaint,
        readThroughCreatedAt: timestamp,
        readThroughMessageId: identifiers.message,
      }).success,
      true,
    );
  });

  it('bounds socket acknowledgements and error details', () => {
    assert.equal(
      socketOperationAcknowledgementSchema.safeParse({
        ok: true,
        occurredAt: timestamp,
        resourceId: identifiers.message,
      }).success,
      true,
    );
    assert.equal(
      socketOperationAcknowledgementSchema.safeParse({
        ok: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'The requested room is unavailable.',
          retryable: false,
        },
      }).success,
      true,
    );
    assert.equal(
      socketOperationAcknowledgementSchema.safeParse({
        ok: false,
        error: {
          code: 'not-valid',
          message: 'Invalid code.',
          retryable: false,
        },
      }).success,
      false,
    );
    assert.equal(
      socketOperationAcknowledgementSchema.safeParse({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'a'.repeat(513),
          retryable: true,
          details: { token: 'hidden' },
        },
      }).success,
      false,
    );
  });
});
