import type { RealtimeConfiguration } from '@local-wellness/config';

import { RealtimeAuthenticationGateway, type AuthenticatedRealtimeUser } from './authentication.js';
import type { LogFields, RealtimeLogger } from './logger.js';
import {
  RealtimeStore,
  type ClaimedRealtimeDelivery,
  type PersistedComplaintMessage,
  type PersistedMessageReceipt,
  type RealtimeRoomAuthorization,
  type RealtimeRoomTarget,
} from './realtime-store.js';

export const testIds = {
  complaint: '10000000-0000-4000-8000-000000000001',
  delivery: '10000000-0000-4000-8000-000000000002',
  event: '10000000-0000-4000-8000-000000000003',
  message: '10000000-0000-4000-8000-000000000004',
  otherComplaint: '10000000-0000-4000-8000-000000000005',
  user: '10000000-0000-4000-8000-000000000006',
  otherUser: '10000000-0000-4000-8000-000000000007',
} as const;

export const testConfiguration: RealtimeConfiguration = {
  allowedOrigins: ['http://localhost:3003'],
  delivery: {
    batchSize: 10,
    leaseSeconds: 30,
    pollIntervalMilliseconds: 60_000,
  },
  eventRateLimitPerMinute: 120,
  maxHttpBufferSizeBytes: 64 * 1_024,
  maxRoomsPerSocket: 4,
  port: 3002,
  supabase: {
    anonKey: 'publishable-key',
    serviceRoleKey: 'service-role-key',
    url: 'http://127.0.0.1:54321',
  },
};

export class FakeRealtimeAuthenticationGateway extends RealtimeAuthenticationGateway {
  public readonly users = new Map<string, AuthenticatedRealtimeUser>();

  public async authenticate(accessToken: string): Promise<AuthenticatedRealtimeUser | null> {
    return this.users.get(accessToken) ?? null;
  }
}

export class FakeRealtimeStore extends RealtimeStore {
  public readonly activeUsers = new Set<string>();
  public readonly authorizedRooms = new Set<string>();
  public readonly completed: Array<{
    deliveredSocketCount: number;
    deliveryId: string;
  }> = [];
  public readonly failed: string[] = [];
  public readonly failureCodes: string[] = [];
  public readonly messages: PersistedComplaintMessage[] = [];
  public readonly receipts: PersistedMessageReceipt[] = [];
  public readonly pendingDeliveries: ClaimedRealtimeDelivery[] = [];
  public claimError = false;
  public completionError = false;

  public authorize(userId: string, target: RealtimeRoomTarget): void {
    this.authorizedRooms.add(`${userId}:${target.kind}:${target.resourceId}`);
  }

  public async authorizeRoom(
    userId: string,
    target: RealtimeRoomTarget,
  ): Promise<RealtimeRoomAuthorization> {
    const authorized = this.authorizedRooms.has(`${userId}:${target.kind}:${target.resourceId}`);
    return {
      authorType: authorized && target.kind === 'complaint' ? 'citizen' : null,
      authorized,
    };
  }

  public async claimRealtimeDeliveries(input: {
    batchSize: number;
  }): Promise<ClaimedRealtimeDelivery[]> {
    if (this.claimError) throw new Error('claim failed');
    return this.pendingDeliveries.splice(0, input.batchSize);
  }

  public async completeNotificationDelivery(input: {
    deliveredSocketCount: number;
    deliveryId: string;
  }): Promise<void> {
    if (this.completionError) throw new Error('completion failed');
    this.completed.push({
      deliveredSocketCount: input.deliveredSocketCount,
      deliveryId: input.deliveryId,
    });
  }

  public async createComplaintMessage(input: {
    body: string;
    clientMessageId: string;
    complaintId: string;
    userId: string;
  }): Promise<PersistedComplaintMessage> {
    const existing = this.messages.find((message) => message.message.id === input.clientMessageId);
    if (existing) return existing;
    const message: PersistedComplaintMessage = {
      eventId: testIds.event,
      message: {
        authoredByMe: true,
        authorType: 'citizen',
        body: input.body,
        complaintId: input.complaintId,
        createdAt: '2026-07-14T10:00:00.000Z',
        id: input.clientMessageId,
        kind: 'private_message',
      },
      senderUserId: input.userId,
    };
    this.messages.push(message);
    return message;
  }

  public async failNotificationDelivery(input: {
    deliveryId: string;
    failureCode: string;
  }): Promise<void> {
    this.failed.push(input.deliveryId);
    this.failureCodes.push(input.failureCode);
  }

  public async isActiveAccount(userId: string): Promise<boolean> {
    return this.activeUsers.has(userId);
  }

  public async markComplaintMessageRead(input: {
    complaintId: string;
    readThroughCreatedAt: string;
    readThroughMessageId: string;
    userId: string;
  }): Promise<PersistedMessageReceipt> {
    const receipt: PersistedMessageReceipt = {
      eventId: testIds.event,
      receipt: {
        complaintId: input.complaintId,
        readThroughCreatedAt: input.readThroughCreatedAt,
        readThroughMessageId: input.readThroughMessageId,
        updatedAt: '2026-07-14T10:05:00.000Z',
      },
    };
    this.receipts.push(receipt);
    return receipt;
  }
}

export class MemoryRealtimeLogger implements RealtimeLogger {
  public readonly entries: Array<{
    event: string;
    fields: LogFields;
    level: 'error' | 'info' | 'warn';
  }> = [];

  public error(event: string, fields: LogFields = {}): void {
    this.entries.push({ event, fields, level: 'error' });
  }

  public info(event: string, fields: LogFields = {}): void {
    this.entries.push({ event, fields, level: 'info' });
  }

  public warn(event: string, fields: LogFields = {}): void {
    this.entries.push({ event, fields, level: 'warn' });
  }
}
