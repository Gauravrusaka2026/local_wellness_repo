import { randomUUID } from 'node:crypto';

import type { RealtimeLogger } from './logger.js';
import type { ClaimedRealtimeDelivery, RealtimeStore } from './realtime-store.js';

export type RealtimeDeliveryEmitter = (delivery: ClaimedRealtimeDelivery) => Promise<number>;

export type RealtimeDeliveryPumpConfiguration = Readonly<{
  batchSize: number;
  leaseSeconds: number;
  pollIntervalMilliseconds: number;
}>;

export class RealtimeDeliveryPump {
  private activePoll: Promise<void> | null = null;
  private isRunning = false;
  private ready = false;
  private timer: NodeJS.Timeout | null = null;
  private readonly instanceId = randomUUID();

  public constructor(
    private readonly store: RealtimeStore,
    private readonly emitDelivery: RealtimeDeliveryEmitter,
    private readonly configuration: RealtimeDeliveryPumpConfiguration,
    private readonly logger: RealtimeLogger,
  ) {}

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

  public async pollOnce(): Promise<void> {
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
      void this.pollOnce().finally(() => {
        this.schedule(this.configuration.pollIntervalMilliseconds);
      });
    }, delay);
    this.timer.unref();
  }

  private async poll(): Promise<void> {
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
      return;
    }

    await Promise.all(deliveries.map((delivery) => this.processDelivery(delivery)));
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
