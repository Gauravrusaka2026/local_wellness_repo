export const communicationRoomTypes = ['complaint', 'authority', 'ward', 'department'] as const;
export type CommunicationRoomType = (typeof communicationRoomTypes)[number];

export const notificationEventTypes = [
  'submission',
  'assignment',
  'acknowledgement',
  'transfer',
  'message',
  'status_update',
  'resolution',
  'reopen',
  'escalation',
] as const;
export type NotificationEventType = (typeof notificationEventTypes)[number];

export const notificationChannels = ['in_app', 'realtime', 'push', 'email'] as const;
export type NotificationChannel = (typeof notificationChannels)[number];

export const complaintMessageKinds = ['private_message', 'public_comment'] as const;
export type ComplaintMessageKind = (typeof complaintMessageKinds)[number];

export const complaintMessageAuthorTypes = ['citizen', 'government'] as const;
export type ComplaintMessageAuthorType = (typeof complaintMessageAuthorTypes)[number];

export interface ComplaintCommunicationPath {
  complaintId: string;
}

export interface CreatePrivateComplaintMessageInput {
  clientMessageId: string;
  body: string;
}

export interface CreatePublicComplaintCommentInput {
  clientMessageId: string;
  body: string;
}

export interface MessageKeysetQuery {
  limit: number;
  beforeCreatedAt?: string | undefined;
  beforeId?: string | undefined;
}

export interface AdvanceMessageReadReceiptInput {
  readThroughCreatedAt: string;
  readThroughMessageId: string;
}

export interface ComplaintMessage {
  id: string;
  complaintId: string;
  kind: ComplaintMessageKind;
  authorType: ComplaintMessageAuthorType;
  authoredByMe: boolean;
  body: string;
  createdAt: string;
}

export interface ComplaintMessagePage {
  items: ComplaintMessage[];
  nextCursor: {
    beforeCreatedAt: string;
    beforeId: string;
  } | null;
}

export interface MessageReadReceipt {
  complaintId: string;
  readThroughCreatedAt: string;
  readThroughMessageId: string;
  updatedAt: string;
}

export interface NotificationSafePayload {
  complaintId: string;
  complaintNumber?: string | undefined;
  messageId?: string | undefined;
  status?: string | undefined;
}

export interface InAppNotification {
  id: string;
  eventId: string;
  eventType: NotificationEventType;
  payload: NotificationSafePayload;
  occurredAt: string;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationPage {
  items: InAppNotification[];
  nextCursor: {
    beforeCreatedAt: string;
    beforeId: string;
  } | null;
}

export interface NotificationReadReceipt {
  notificationId: string;
  readAt: string;
}

export interface NotificationListQuery {
  limit: number;
  beforeCreatedAt?: string | undefined;
  beforeId?: string | undefined;
}

export interface NotificationReadInput {
  notificationId: string;
}

export interface SocketHandshakeAuth {
  accessToken: string;
}

export interface SocketRoomTarget {
  roomType: CommunicationRoomType;
  roomId: string;
}

export type SocketRoomJoinInput = SocketRoomTarget;
export type SocketRoomLeaveInput = SocketRoomTarget;

export interface SocketComplaintTypingInput {
  complaintId: string;
}

export type SocketTypingStartInput = SocketComplaintTypingInput;
export type SocketTypingStopInput = SocketComplaintTypingInput;

export interface SocketMessageCreateInput extends CreatePrivateComplaintMessageInput {
  complaintId: string;
}

export interface SocketMessageReadInput extends AdvanceMessageReadReceiptInput {
  complaintId: string;
}

export interface SocketOperationSuccess {
  ok: true;
  occurredAt: string;
  resourceId?: string | undefined;
}

export interface SocketOperationError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface SocketOperationFailure {
  ok: false;
  error: SocketOperationError;
}

export type SocketOperationAcknowledgement = SocketOperationSuccess | SocketOperationFailure;

export interface RealtimeEventEnvelope<Payload> {
  schemaVersion: 1;
  eventId: string;
  occurredAt: string;
  payload: Payload;
}

export type RealtimeMessageCreatedEvent = RealtimeEventEnvelope<ComplaintMessage>;
export type RealtimeNotificationCreatedEvent = RealtimeEventEnvelope<InAppNotification>;

export type RealtimeTypingChangedEvent = RealtimeEventEnvelope<{
  active: boolean;
  authorType: ComplaintMessageAuthorType;
  complaintId: string;
}>;
