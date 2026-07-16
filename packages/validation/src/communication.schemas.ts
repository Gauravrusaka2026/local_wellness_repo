import {
  complaintMessageAuthorTypes,
  complaintMessageKinds,
  communicationRoomTypes,
  notificationChannels,
  notificationEventTypes,
  type AdvanceMessageReadReceiptInput,
  type ComplaintMessage,
  type ComplaintMessagePage,
  type ComplaintCommunicationPath,
  type CreatePrivateComplaintMessageInput,
  type CreatePublicComplaintCommentInput,
  type MessageKeysetQuery,
  type MessageReadReceipt,
  type InAppNotification,
  type NotificationListQuery,
  type NotificationPage,
  type NotificationReadInput,
  type NotificationReadReceipt,
  type SocketHandshakeAuth,
  type SocketMessageCreateInput,
  type SocketMessageReadInput,
  type SocketOperationAcknowledgement,
  type SocketOperationError,
  type SocketRoomJoinInput,
  type SocketRoomLeaveInput,
  type SocketTypingStartInput,
  type SocketTypingStopInput,
} from '@local-wellness/types';
import { z } from 'zod';

const offsetTimestampSchema = z.iso.datetime({ offset: true });
const messageBodySchema = z.string().trim().min(1).max(4_000);

const addPairedCursorIssues = (
  value: { beforeCreatedAt?: string | undefined; beforeId?: string | undefined },
  context: z.RefinementCtx,
): void => {
  if ((value.beforeCreatedAt === undefined) === (value.beforeId === undefined)) {
    return;
  }

  context.addIssue({
    code: 'custom',
    message: 'Both keyset cursor fields must be provided together.',
    path: [value.beforeCreatedAt === undefined ? 'beforeCreatedAt' : 'beforeId'],
  });
};

const keysetQueryShape = {
  limit: z.coerce.number().int().min(1).max(100).default(25),
  beforeCreatedAt: offsetTimestampSchema.optional(),
  beforeId: z.uuid().optional(),
} as const;

export const complaintCommunicationPathSchema: z.ZodType<ComplaintCommunicationPath> = z
  .object({ complaintId: z.uuid() })
  .strict();

export const createPrivateComplaintMessageSchema: z.ZodType<CreatePrivateComplaintMessageInput> = z
  .object({
    clientMessageId: z.uuid(),
    body: messageBodySchema,
  })
  .strict();

export const createPublicComplaintCommentSchema: z.ZodType<CreatePublicComplaintCommentInput> = z
  .object({
    clientMessageId: z.uuid(),
    body: messageBodySchema,
  })
  .strict();

export const messageKeysetQuerySchema: z.ZodType<MessageKeysetQuery> = z
  .object(keysetQueryShape)
  .strict()
  .superRefine(addPairedCursorIssues);

export const advanceMessageReadReceiptSchema: z.ZodType<AdvanceMessageReadReceiptInput> = z
  .object({
    readThroughCreatedAt: offsetTimestampSchema,
    readThroughMessageId: z.uuid(),
  })
  .strict();

export const complaintMessageSchema: z.ZodType<ComplaintMessage> = z
  .object({
    id: z.uuid(),
    complaintId: z.uuid(),
    kind: z.enum(complaintMessageKinds),
    authorType: z.enum(complaintMessageAuthorTypes),
    authoredByMe: z.boolean(),
    body: messageBodySchema,
    createdAt: offsetTimestampSchema,
  })
  .strict();

export const complaintMessagePageSchema: z.ZodType<ComplaintMessagePage> = z
  .object({
    items: z.array(complaintMessageSchema).max(100),
    nextCursor: z
      .object({
        beforeCreatedAt: offsetTimestampSchema,
        beforeId: z.uuid(),
      })
      .strict()
      .nullable(),
  })
  .strict();

export const messageReadReceiptSchema: z.ZodType<MessageReadReceipt> = z
  .object({
    complaintId: z.uuid(),
    readThroughCreatedAt: offsetTimestampSchema,
    readThroughMessageId: z.uuid(),
    updatedAt: offsetTimestampSchema,
  })
  .strict();

export const notificationEventTypeSchema = z.enum(notificationEventTypes);
export const notificationChannelSchema = z.enum(notificationChannels);

export const notificationListQuerySchema: z.ZodType<NotificationListQuery> = z
  .object(keysetQueryShape)
  .strict()
  .superRefine(addPairedCursorIssues);

export const notificationReadSchema: z.ZodType<NotificationReadInput> = z
  .object({ notificationId: z.uuid() })
  .strict();

const notificationSafePayloadSchema = z
  .object({
    complaintId: z.uuid(),
    complaintNumber: z.string().trim().min(1).max(64).optional(),
    messageId: z.uuid().optional(),
    status: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

export const inAppNotificationSchema: z.ZodType<InAppNotification> = z
  .object({
    id: z.uuid(),
    eventId: z.uuid(),
    eventType: z.enum(notificationEventTypes),
    payload: notificationSafePayloadSchema,
    occurredAt: offsetTimestampSchema,
    createdAt: offsetTimestampSchema,
    readAt: offsetTimestampSchema.nullable(),
  })
  .strict();

export const notificationPageSchema: z.ZodType<NotificationPage> = z
  .object({
    items: z.array(inAppNotificationSchema).max(100),
    nextCursor: z
      .object({
        beforeCreatedAt: offsetTimestampSchema,
        beforeId: z.uuid(),
      })
      .strict()
      .nullable(),
  })
  .strict();

export const notificationReadReceiptSchema: z.ZodType<NotificationReadReceipt> = z
  .object({
    notificationId: z.uuid(),
    readAt: offsetTimestampSchema,
  })
  .strict();

export const socketHandshakeAuthSchema: z.ZodType<SocketHandshakeAuth> = z
  .object({
    accessToken: z.string().min(16).max(8_192).regex(/^\S+$/u),
  })
  .strict();

const socketRoomTargetSchema = z
  .object({
    roomType: z.enum(communicationRoomTypes),
    roomId: z.uuid(),
  })
  .strict();

export const socketRoomJoinSchema: z.ZodType<SocketRoomJoinInput> = socketRoomTargetSchema;
export const socketRoomLeaveSchema: z.ZodType<SocketRoomLeaveInput> = socketRoomTargetSchema;

const socketComplaintTypingSchema = z.object({ complaintId: z.uuid() }).strict();

export const socketTypingStartSchema: z.ZodType<SocketTypingStartInput> =
  socketComplaintTypingSchema;
export const socketTypingStopSchema: z.ZodType<SocketTypingStopInput> = socketComplaintTypingSchema;

export const socketMessageCreateSchema: z.ZodType<SocketMessageCreateInput> = z
  .object({
    complaintId: z.uuid(),
    clientMessageId: z.uuid(),
    body: messageBodySchema,
  })
  .strict();

export const socketMessageReadSchema: z.ZodType<SocketMessageReadInput> = z
  .object({
    complaintId: z.uuid(),
    readThroughCreatedAt: offsetTimestampSchema,
    readThroughMessageId: z.uuid(),
  })
  .strict();

export const socketOperationErrorSchema: z.ZodType<SocketOperationError> = z
  .object({
    code: z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/u),
    message: z.string().trim().min(1).max(512),
    retryable: z.boolean(),
  })
  .strict();

export const socketOperationAcknowledgementSchema: z.ZodType<SocketOperationAcknowledgement> =
  z.discriminatedUnion('ok', [
    z
      .object({
        ok: z.literal(true),
        occurredAt: offsetTimestampSchema,
        resourceId: z.uuid().optional(),
      })
      .strict(),
    z
      .object({
        ok: z.literal(false),
        error: socketOperationErrorSchema,
      })
      .strict(),
  ]);

export type ComplaintCommunicationPathParameters = z.infer<typeof complaintCommunicationPathSchema>;
export type MessageKeysetQueryInput = z.input<typeof messageKeysetQuerySchema>;
export type NotificationListQueryInput = z.input<typeof notificationListQuerySchema>;
