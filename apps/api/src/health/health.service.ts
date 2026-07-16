import { Inject, Injectable, Logger } from '@nestjs/common';

import { HealthStore } from '../data/health.store.js';
import { Clock } from '../common/clock.js';

const readinessCacheMilliseconds = 5_000;
const readinessTimeoutMilliseconds = 2_000;

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private cachedResult: Readonly<{ expiresAt: number; ready: boolean }> | null = null;
  private inFlightProbe: Promise<boolean> | null = null;

  public constructor(
    @Inject(HealthStore) private readonly store: HealthStore,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  public async isReady(): Promise<boolean> {
    const now = this.clock.now().getTime();
    if (this.cachedResult && this.cachedResult.expiresAt > now) {
      return this.cachedResult.ready;
    }

    if (this.inFlightProbe) {
      return this.inFlightProbe;
    }

    this.inFlightProbe = this.runProbe();

    try {
      const ready = await this.inFlightProbe;
      this.cachedResult = {
        expiresAt: this.clock.now().getTime() + readinessCacheMilliseconds,
        ready,
      };
      return ready;
    } finally {
      this.inFlightProbe = null;
    }
  }

  private async runProbe(): Promise<boolean> {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race([
        this.store.isReady(),
        new Promise<boolean>((resolve) => {
          timeout = setTimeout(() => resolve(false), readinessTimeoutMilliseconds);
        }),
      ]);
    } catch {
      this.logger.warn('The API readiness dependency probe failed.');
      return false;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
}
