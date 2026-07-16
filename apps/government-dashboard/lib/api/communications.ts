import type {
  ComplaintMessage,
  ComplaintMessagePage,
  CreatePrivateComplaintMessageInput,
  MessageReadReceipt,
} from '@local-wellness/types';
import {
  complaintMessagePageSchema,
  complaintMessageSchema,
  createPrivateComplaintMessageSchema,
  advanceMessageReadReceiptSchema,
  messageReadReceiptSchema,
} from '@local-wellness/validation';

import { createGovernmentApiClient } from './client';

export const getComplaintMessages = (
  accessToken: string,
  complaintId: string,
): Promise<ComplaintMessagePage> =>
  createGovernmentApiClient(accessToken).get(
    `/api/v1/complaints/${complaintId}/messages?limit=100`,
    { decode: (value) => complaintMessagePageSchema.parse(value) },
  );

export const createComplaintMessage = (
  accessToken: string,
  complaintId: string,
  input: CreatePrivateComplaintMessageInput,
): Promise<ComplaintMessage> =>
  createGovernmentApiClient(accessToken).post(
    `/api/v1/complaints/${complaintId}/messages`,
    createPrivateComplaintMessageSchema.parse(input),
    { decode: (value) => complaintMessageSchema.parse(value) },
  );

export const markComplaintMessagesRead = (
  accessToken: string,
  complaintId: string,
  input: Readonly<{ readThroughCreatedAt: string; readThroughMessageId: string }>,
): Promise<MessageReadReceipt> =>
  createGovernmentApiClient(accessToken).post(
    `/api/v1/complaints/${complaintId}/messages/read`,
    advanceMessageReadReceiptSchema.parse(input),
    { decode: (value) => messageReadReceiptSchema.parse(value) },
  );
