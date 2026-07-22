import { nextAdaptivePollingDelay } from '@local-wellness/config';

import type { KpiCalculationStore } from './kpi-calculation.store.js';
import type { WorkerLogger } from './worker-logger.js';

export interface KpiCalculationWorkerOptions {
  batchSize: number;
  leaseSeconds: number;
  pollIntervalMilliseconds: number;
  workerId: string;
}

export interface KpiCalculationBatchResult {
  claimed: number;
  dead: number;
  materialized: number;
  retriesScheduled: number;
  snapshots: number;
}

const errorCode = 'KPI_CALCULATION_FAILED';

export class KpiCalculationWorker {
  private running = false;
  private pollDelayMilliseconds: number;
  private timer: NodeJS.Timeout | null = null;
  private activeBatch: Promise<KpiCalculationBatchResult> | null = null;

  public constructor(
    private readonly store: KpiCalculationStore,
    private readonly logger: WorkerLogger,
    private readonly options: KpiCalculationWorkerOptions,
  ) {
    this.pollDelayMilliseconds = options.pollIntervalMilliseconds;
  }

  public async runBatch(): Promise<KpiCalculationBatchResult> {
    const claimed = await this.store.claim({
      batchSize: this.options.batchSize,
      leaseSeconds: this.options.leaseSeconds,
      workerId: this.options.workerId,
    });
    const result: KpiCalculationBatchResult = {
      claimed: claimed.length,
      dead: 0,
      materialized: 0,
      retriesScheduled: 0,
      snapshots: 0,
    };

    for (const run of claimed) {
      try {
        const materialized = await this.store.materialize(run);
        result.materialized += 1;
        result.snapshots += materialized.snapshotCount;
        this.logger.info('kpi_calculation_run_materialized', {
          replayed: materialized.replayed,
          runId: run.runId,
          snapshotCount: materialized.snapshotCount,
        });
      } catch {
        try {
          const failed = await this.store.fail({ ...run, errorCode });
          if (failed.status === 'dead') {
            result.dead += 1;
          } else {
            result.retriesScheduled += 1;
          }
          this.logger.warn('kpi_calculation_run_failed', {
            nextAttemptAt: failed.nextAttemptAt,
            runId: run.runId,
            status: failed.status,
          });
        } catch {
          this.logger.error('kpi_calculation_failure_recording_failed', { runId: run.runId });
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
        this.logger.info('kpi_calculation_batch_completed', {
          claimed: result.claimed,
          dead: result.dead,
          materialized: result.materialized,
          retriesScheduled: result.retriesScheduled,
          snapshots: result.snapshots,
        });
      }
    } catch {
      this.logger.error('kpi_calculation_claim_failed');
    } finally {
      this.activeBatch = null;
      this.schedule(workClaimed);
    }
  }
}
