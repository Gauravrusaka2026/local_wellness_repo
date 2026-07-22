import { randomUUID } from 'node:crypto';

import { nextAdaptivePollingDelay } from '@local-wellness/config';

import type { RealtimeLogger } from './logger.js';
import type { ClaimedRealtimeDelivery, RealtimeStore } from './realtime-store.js';

export type RealtimeDeliveryEmitter = (delivery: ClaimedRealtimeDelivery) => Promise<number>;

export type RealtimeDeliveryPumpConfiguration = Readonly<{
  batchSize: number;
  leaseSeconds: number;
  pollIntervalMilliseconds: number;
}>;

export class RealtimeDeliveryPump {
  private activePoll: Promise<number> | null = null;
  private isRunning = false;
  private pollDelayMilliseconds: number;
  private ready = false;
  private timer: NodeJS.Timeout | null = null;
  private readonly instanceId = randomUUID();

  public constructor(
    private readonly store: RealtimeStore,
    private readonly emitDelivery: RealtimeDeliveryEmitter,
    private readonly configuration: RealtimeDeliveryPumpConfiguration,
    private readonly logger: RealtimeLogger,
  ) {
    this.pollDelayMilliseconds = configuration.pollIntervalMilliseconds;
  }

  public isReady(): boolean {
    return this.ready;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.schedule(0);
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    this.ready = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.activePoll;
  }

  public async pollOnce(): Promise<number> {
    if (this.activePoll) return this.activePoll;
    this.activePoll = this.poll().finally(() => {
      this.activePoll = null;
    });
    return this.activePoll;
  }

  private schedule(delay: number): void {
    if (!this.isRunning) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.pollOnce().then(
        (claimed) => this.scheduleNext(claimed > 0),
        () => this.scheduleNext(false),
      );
    }, delay);
    this.timer.unref();
  }

  private async poll(): Promise<number> {
    let deliveries: ClaimedRealtimeDelivery[];
    try {
      deliveries = await this.store.claimRealtimeDeliveries({
        batchSize: this.configuration.batchSize,
        instanceId: this.instanceId,
        leaseSeconds: this.configuration.leaseSeconds,
      });
      this.ready = true;
    } catch {
      this.ready = false;
      this.logger.error('realtime_delivery_claim_failed');
      return 0;
    }

    await Promise.all(deliveries.map((delivery) => this.processDelivery(delivery)));
    return deliveries.length;
  }

  private scheduleNext(workClaimed: boolean): void {
    this.pollDelayMilliseconds = nextAdaptivePollingDelay({
      baseDelayMilliseconds: this.configuration.pollIntervalMilliseconds,
      currentDelayMilliseconds: this.pollDelayMilliseconds,
      maximumDelayMilliseconds: Math.max(this.configuration.pollIntervalMilliseconds, 15_000),
      workClaimed,
    });
    this.schedule(this.pollDelayMilliseconds);
  }

  private async processDelivery(delivery: ClaimedRealtimeDelivery): Promise<void> {
    let deliveredSocketCount: number;
    try {
      deliveredSocketCount = await this.emitDelivery(delivery);
    } catch {
      await this.recordFailure(delivery, 'DELIVERY_EMIT_FAILED');
      return;
    }

    try {
      await this.store.completeNotificationDelivery({
        claimToken: delivery.claimToken,
        deliveredSocketCount,
        deliveryId: delivery.deliveryId,
        instanceId: this.instanceId,
      });
      this.logger.info('realtime_delivery_completed', {
        attemptCount: delivery.attemptCount,
        deliveredSocketCount,
        deliveryId: delivery.deliveryId,
        eventId: delivery.eventId,
      });
    } catch {
      await this.recordFailure(delivery, 'DELIVERY_DEPENDENCY_UNAVAILABLE');
    }
  }

  private async recordFailure(
    delivery: ClaimedRealtimeDelivery,
    failureCode: 'DELIVERY_DEPENDENCY_UNAVAILABLE' | 'DELIVERY_EMIT_FAILED',
  ): Promise<void> {
    try {
      await this.store.failNotificationDelivery({
        claimToken: delivery.claimToken,
        deliveryId: delivery.deliveryId,
        failureCode,
        instanceId: this.instanceId,
      });
    } catch {
      this.logger.error('realtime_delivery_failure_record_failed', {
        deliveryId: delivery.deliveryId,
        eventId: delivery.eventId,
      });
      return;
    }
    this.logger.warn('realtime_delivery_failed', {
      attemptCount: delivery.attemptCount,
      deliveryId: delivery.deliveryId,
      eventId: delivery.eventId,
      failureCode,
    });
  }
}
