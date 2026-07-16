import type {
  AdvanceMessageReadReceiptInput,
  ComplaintMessage,
  ComplaintMessagePage,
  CreatePrivateComplaintMessageInput,
  MessageKeysetQuery,
  MessageReadReceipt,
  NotificationListQuery,
  NotificationPage,
  NotificationReadReceipt,
} from '@local-wellness/types';

export class CommunicationDataAccessError extends Error {
  public constructor(operation: string) {
    super(`Complaint communication operation failed: ${operation}.`);
    this.name = 'CommunicationDataAccessError';
  }
}

export class CommunicationAccessDeniedError extends CommunicationDataAccessError {
  public constructor() {
    super('authorize access');
    this.name = 'CommunicationAccessDeniedError';
  }
}

export class CommunicationNotFoundError extends CommunicationDataAccessError {
  public constructor(public readonly resource: 'complaint' | 'message' | 'notification') {
    super(`find ${resource}`);
    this.name = 'CommunicationNotFoundError';
  }
}

export class CommunicationConflictError extends CommunicationDataAccessError {
  public constructor(public readonly marker: string) {
    super('validate communication state');
    this.name = 'CommunicationConflictError';
  }
}

export abstract class CommunicationStore {
  public abstract createMessage(
    actorUserId: string,
    complaintId: string,
    input: CreatePrivateComplaintMessageInput,
  ): Promise<ComplaintMessage>;

  public abstract listMessages(
    actorUserId: string,
    complaintId: string,
    query: MessageKeysetQuery,
  ): Promise<ComplaintMessagePage>;

  public abstract markMessagesRead(
    actorUserId: string,
    complaintId: string,
    input: AdvanceMessageReadReceiptInput,
  ): Promise<MessageReadReceipt>;

  public abstract listNotifications(
    actorUserId: string,
    query: NotificationListQuery,
  ): Promise<NotificationPage>;

  public abstract markNotificationRead(
    actorUserId: string,
    notificationId: string,
  ): Promise<NotificationReadReceipt>;
}
