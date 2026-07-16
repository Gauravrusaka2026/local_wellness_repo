import type { SlaEscalationStore } from './sla-escalation.store.js';
import type { WorkerLogger } from './worker-logger.js';

export interface SlaEscalationWorkerOptions {
  batchSize: number;
  leaseSeconds: number;
  pollIntervalMilliseconds: number;
  workerId: string;
}

export interface SlaEscalationBatchResult {
  cancelled: number;
  claimed: number;
  completed: number;
  dead: number;
  escalated: number;
  recorded: number;
  retriesScheduled: number;
}

const errorCode = 'SLA_ESCALATION_EXECUTION_FAILED';

export class SlaEscalationWorker {
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  private activeBatch: Promise<SlaEscalationBatchResult> | null = null;

  public constructor(
    private readonly store: SlaEscalationStore,
    private readonly logger: WorkerLogger,
    private readonly options: SlaEscalationWorkerOptions,
  ) {}

  public async runBatch(): Promise<SlaEscalationBatchResult> {
    const claimed = await this.store.claim({
      batchSize: this.options.batchSize,
      leaseSeconds: this.options.leaseSeconds,
      workerId: this.options.workerId,
    });
    const result: SlaEscalationBatchResult = {
      cancelled: 0,
      claimed: claimed.length,
      completed: 0,
      dead: 0,
      escalated: 0,
      recorded: 0,
      retriesScheduled: 0,
    };

    for (const job of claimed) {
      try {
        const executed = await this.store.execute(job);
        result[executed.outcome] += 1;
        this.logger.info('sla_escalation_job_executed', {
          escalationEventId: executed.escalationEventId,
          jobId: job.jobId,
          outcome: executed.outcome,
          replayed: executed.replayed,
        });
      } catch {
        try {
          const failed = await this.store.fail({ ...job, errorCode });
          if (failed.status === 'dead') {
            result.dead += 1;
          } else {
            result.retriesScheduled += 1;
          }
          this.logger.warn('sla_escalation_job_failed', {
            jobId: job.jobId,
            nextAttemptAt: failed.nextAttemptAt,
            status: failed.status,
          });
        } catch {
          this.logger.error('sla_escalation_failure_recording_failed', { jobId: job.jobId });
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

  private schedule(): void {
    if (!this.running) {
      return;
    }
    this.timer = setTimeout(() => {
      void this.tick();
    }, this.options.pollIntervalMilliseconds);
  }

  private async tick(): Promise<void> {
    if (!this.running) {
      return;
    }
    this.activeBatch = this.runBatch();
    try {
      const result = await this.activeBatch;
      if (result.claimed > 0) {
        this.logger.info('sla_escalation_batch_completed', {
          cancelled: result.cancelled,
          claimed: result.claimed,
          completed: result.completed,
          dead: result.dead,
          escalated: result.escalated,
          recorded: result.recorded,
          retriesScheduled: result.retriesScheduled,
        });
      }
    } catch {
      this.logger.error('sla_escalation_claim_failed');
    } finally {
      this.activeBatch = null;
      this.schedule();
    }
  }
}
