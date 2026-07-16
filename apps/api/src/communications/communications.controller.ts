import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  AdvanceMessageReadReceiptInput,
  AuthenticatedUser,
  ComplaintMessage,
  ComplaintMessagePage,
  CreatePrivateComplaintMessageInput,
  MessageKeysetQuery,
  MessageReadReceipt,
  NotificationListQuery,
  NotificationPage,
  NotificationReadReceipt,
} from '@local-wellness/types';
import {
  advanceMessageReadReceiptSchema,
  complaintCommunicationPathSchema,
  createPrivateComplaintMessageSchema,
  messageKeysetQuerySchema,
  notificationListQuerySchema,
  notificationReadSchema,
  type ComplaintCommunicationPathParameters,
} from '@local-wellness/validation';

import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { Authenticated } from '../common/authenticated-user.decorator.js';
import { RateLimit, rateLimitPolicies } from '../common/rate-limit.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CommunicationsService } from './communications.service.js';

@Controller()
@UseGuards(BearerAuthGuard)
export class CommunicationsController {
  public constructor(
    @Inject(CommunicationsService)
    private readonly service: CommunicationsService,
  ) {}

  @Get('complaints/:complaintId/messages')
  @Header('Cache-Control', 'private, no-store')
  public listMessages(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(complaintCommunicationPathSchema))
    parameters: ComplaintCommunicationPathParameters,
    @Query(new ZodValidationPipe(messageKeysetQuerySchema)) query: MessageKeysetQuery,
  ): Promise<ComplaintMessagePage> {
    return this.service.listMessages(actor, parameters.complaintId, query);
  }

  @Post('complaints/:complaintId/messages')
  @Header('Cache-Control', 'private, no-store')
  @RateLimit(rateLimitPolicies.privateMessage)
  public createMessage(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(complaintCommunicationPathSchema))
    parameters: ComplaintCommunicationPathParameters,
    @Body(new ZodValidationPipe(createPrivateComplaintMessageSchema))
    input: CreatePrivateComplaintMessageInput,
  ): Promise<ComplaintMessage> {
    return this.service.createMessage(actor, parameters.complaintId, input);
  }

  @Post('complaints/:complaintId/messages/read')
  @Header('Cache-Control', 'private, no-store')
  public markMessagesRead(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(complaintCommunicationPathSchema))
    parameters: ComplaintCommunicationPathParameters,
    @Body(new ZodValidationPipe(advanceMessageReadReceiptSchema))
    input: AdvanceMessageReadReceiptInput,
  ): Promise<MessageReadReceipt> {
    return this.service.markMessagesRead(actor, parameters.complaintId, input);
  }

  @Get('notifications')
  @Header('Cache-Control', 'private, no-store')
  public listNotifications(
    @Authenticated() actor: AuthenticatedUser,
    @Query(new ZodValidationPipe(notificationListQuerySchema)) query: NotificationListQuery,
  ): Promise<NotificationPage> {
    return this.service.listNotifications(actor, query);
  }

  @Post('notifications/:notificationId/read')
  @Header('Cache-Control', 'private, no-store')
  public markNotificationRead(
    @Authenticated() actor: AuthenticatedUser,
    @Param(new ZodValidationPipe(notificationReadSchema))
    parameters: { notificationId: string },
  ): Promise<NotificationReadReceipt> {
    return this.service.markNotificationRead(actor, parameters.notificationId);
  }
}
