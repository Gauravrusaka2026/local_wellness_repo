import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  AdvanceMessageReadReceiptInput,
  AuthenticatedUser,
  CreatePrivateComplaintMessageInput,
  MessageKeysetQuery,
  NotificationListQuery,
} from '@local-wellness/types';

import { CommunicationStore } from '../data/communication.store.js';

@Injectable()
export class CommunicationsService {
  private readonly logger = new Logger(CommunicationsService.name);

  public constructor(
    @Inject(CommunicationStore)
    private readonly store: CommunicationStore,
  ) {}

  public async createMessage(
    actor: AuthenticatedUser,
    complaintId: string,
    input: CreatePrivateComplaintMessageInput,
  ) {
    const message = await this.store.createMessage(actor.id, complaintId, input);
    this.logger.log({
      event: 'complaint_message_created',
      complaintId,
      messageId: message.id,
    });
    return message;
  }

  public listMessages(actor: AuthenticatedUser, complaintId: string, query: MessageKeysetQuery) {
    return this.store.listMessages(actor.id, complaintId, query);
  }

  public async markMessagesRead(
    actor: AuthenticatedUser,
    complaintId: string,
    input: AdvanceMessageReadReceiptInput,
  ) {
    const receipt = await this.store.markMessagesRead(actor.id, complaintId, input);
    this.logger.log({
      event: 'complaint_messages_read',
      complaintId,
      readThroughMessageId: receipt.readThroughMessageId,
    });
    return receipt;
  }

  public listNotifications(actor: AuthenticatedUser, query: NotificationListQuery) {
    return this.store.listNotifications(actor.id, query);
  }

  public async markNotificationRead(actor: AuthenticatedUser, notificationId: string) {
    const receipt = await this.store.markNotificationRead(actor.id, notificationId);
    this.logger.log({
      event: 'notification_read',
      notificationId,
    });
    return receipt;
  }
}
