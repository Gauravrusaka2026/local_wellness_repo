export interface ClaimedNotificationOutboxEvent {
  leaseToken: string;
  outboxId: string;
}

export interface FailedNotificationOutboxEvent {
  nextAttemptAt: string | null;
  status: 'dead' | 'retry_scheduled';
}

export interface MaterializedNotificationOutboxEvent {
  notificationCount: number;
  replayed: boolean;
}

export interface NotificationOutboxStore {
  claim(input: {
    batchSize: number;
    leaseSeconds: number;
    workerId: string;
  }): Promise<readonly ClaimedNotificationOutboxEvent[]>;

  fail(input: {
    errorCode: string;
    leaseToken: string;
    outboxId: string;
  }): Promise<FailedNotificationOutboxEvent>;

  materialize(input: {
    leaseToken: string;
    outboxId: string;
  }): Promise<MaterializedNotificationOutboxEvent>;
}

export class NotificationOutboxDataError extends Error {
  public constructor(operation: string) {
    super(`Notification outbox ${operation} failed.`);
    this.name = 'NotificationOutboxDataError';
  }
}
