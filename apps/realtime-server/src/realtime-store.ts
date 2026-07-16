import type {
  CommunicationRoomType,
  ComplaintMessageAuthorType,
  ComplaintMessage,
  InAppNotification,
  MessageReadReceipt,
} from '@local-wellness/types';

export type RealtimeRoomTarget = Readonly<{
  kind: CommunicationRoomType;
  resourceId: string;
}>;

export type RealtimeRoomAuthorization = Readonly<{
  authorType: ComplaintMessageAuthorType | null;
  authorized: boolean;
}>;

export type PersistedComplaintMessage = Readonly<{
  eventId: string;
  message: ComplaintMessage;
  senderUserId: string;
}>;

export type PersistedMessageReceipt = Readonly<{
  eventId: string;
  receipt: MessageReadReceipt;
}>;

export const realtimeDeliveryEventNames = [
  'complaint:status_changed',
  'message:created',
  'notification:created',
] as const;
export type RealtimeDeliveryEventName = (typeof realtimeDeliveryEventNames)[number];

type ClaimedRealtimeDeliveryBase = Readonly<{
  attemptCount: number;
  claimToken: string;
  complaintId: string | null;
  deliveryId: string;
  eventId: string;
  occurredAt: string;
  recipientUserId: string;
}>;

export type ClaimedRealtimeDelivery = ClaimedRealtimeDeliveryBase &
  (
    | Readonly<{
        eventName: 'message:created';
        payload: ComplaintMessage;
      }>
    | Readonly<{
        eventName: 'complaint:status_changed' | 'notification:created';
        payload: InAppNotification;
      }>
  );

export abstract class RealtimeStore {
  public abstract authorizeRoom(
    userId: string,
    target: RealtimeRoomTarget,
  ): Promise<RealtimeRoomAuthorization>;

  public abstract claimRealtimeDeliveries(input: {
    batchSize: number;
    instanceId: string;
    leaseSeconds: number;
  }): Promise<ClaimedRealtimeDelivery[]>;

  public abstract completeNotificationDelivery(input: {
    claimToken: string;
    deliveredSocketCount: number;
    deliveryId: string;
    instanceId: string;
  }): Promise<void>;

  public abstract createComplaintMessage(input: {
    body: string;
    clientMessageId: string;
    complaintId: string;
    requestId: string;
    userId: string;
  }): Promise<PersistedComplaintMessage>;

  public abstract failNotificationDelivery(input: {
    claimToken: string;
    deliveryId: string;
    failureCode: 'DELIVERY_DEPENDENCY_UNAVAILABLE' | 'DELIVERY_EMIT_FAILED';
    instanceId: string;
  }): Promise<void>;

  public abstract isActiveAccount(userId: string): Promise<boolean>;

  public abstract markComplaintMessageRead(input: {
    complaintId: string;
    readThroughCreatedAt: string;
    readThroughMessageId: string;
    requestId: string;
    userId: string;
  }): Promise<PersistedMessageReceipt>;
}
