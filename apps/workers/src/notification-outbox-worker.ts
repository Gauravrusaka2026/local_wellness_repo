import { nextAdaptivePollingDelay } from '@local-wellness/config';

import type {
  NotificationOutboxStore,
  MaterializedNotificationOutboxEvent,
} from './notification-outbox.store.js';
import type { WorkerLogger } from './worker-logger.js';

export interface NotificationOutboxWorkerOptions {
  batchSize: number;
  leaseSeconds: number;
  pollIntervalMilliseconds: number;
  workerId: string;
}

export interface NotificationOutboxBatchResult {
  claimed: number;
  dead: number;
  materialized: number;
  notifications: number;
  retriesScheduled: number;
}

const errorCode = 'MATERIALIZATION_FAILED';

export class NotificationOutboxWorker {
  private running = false;
  private pollDelayMilliseconds: number;
  private timer: NodeJS.Timeout | null = null;
  private activeBatch: Promise<NotificationOutboxBatchResult> | null = null;

  public constructor(
    private readonly store: NotificationOutboxStore,
    private readonly logger: WorkerLogger,
    private readonly options: NotificationOutboxWorkerOptions,
  ) {
    this.pollDelayMilliseconds = options.pollIntervalMilliseconds;
  }

  public async runBatch(): Promise<NotificationOutboxBatchResult> {
    const claimed = await this.store.claim({
      batchSize: this.options.batchSize,
      leaseSeconds: this.options.leaseSeconds,
      workerId: this.options.workerId,
    });
    const result: NotificationOutboxBatchResult = {
      claimed: claimed.length,
      dead: 0,
      materialized: 0,
      notifications: 0,
      retriesScheduled: 0,
    };

    for (const event of claimed) {
      try {
        const materialized: MaterializedNotificationOutboxEvent =
          await this.store.materialize(event);
        result.materialized += 1;
        result.notifications += materialized.notificationCount;
        this.logger.info('notification_outbox_materialized', {
          notificationCount: materialized.notificationCount,
          outboxId: event.outboxId,
          replayed: materialized.replayed,
        });
      } catch {
        try {
          const failed = await this.store.fail({ ...event, errorCode });
          if (failed.status === 'dead') {
            result.dead += 1;
          } else {
            result.retriesScheduled += 1;
          }
          this.logger.warn('notification_outbox_materialization_failed', {
            nextAttemptAt: failed.nextAttemptAt,
            outboxId: event.outboxId,
            status: failed.status,
          });
        } catch {
          this.logger.error('notification_outbox_failure_recording_failed', {
            outboxId: event.outboxId,
          });
        }
      }
    }

    return result;
  }

  public async start(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    await this.tick();
  }

  public async stop(): Promise<void> {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.activeBatch?.catch(() => undefined);
  }

  private schedule(workClaimed: boolean): void {
    if (!this.running) {
      return;
    }
    this.pollDelayMilliseconds = nextAdaptivePollingDelay({
      baseDelayMilliseconds: this.options.pollIntervalMilliseconds,
      currentDelayMilliseconds: this.pollDelayMilliseconds,
      maximumDelayMilliseconds: Math.max(this.options.pollIntervalMilliseconds, 60_000),
      workClaimed,
    });
    this.timer = setTimeout(() => {
      void this.tick();
    }, this.pollDelayMilliseconds);
  }

  private async tick(): Promise<void> {
    if (!this.running) {
      return;
    }
    this.activeBatch = this.runBatch();
    let workClaimed = false;
    try {
      const result = await this.activeBatch;
      workClaimed = result.claimed > 0;
      if (result.claimed > 0) {
        this.logger.info('notification_outbox_batch_completed', {
          claimed: result.claimed,
          dead: result.dead,
          materialized: result.materialized,
          notifications: result.notifications,
          retriesScheduled: result.retriesScheduled,
        });
      }
    } catch {
      this.logger.error('notification_outbox_claim_failed');
    } finally {
      this.activeBatch = null;
      this.schedule(workClaimed);
    }
  }
}
