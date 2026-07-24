import type { WardEmailSender } from './ward-email-sender.js';
import type { WorkerLogger } from './worker-logger.js';

export interface WardEmailWorkerOptions {
  batchSize: number;
  pollIntervalMilliseconds: number;
}

type WardEmailBatchSender = Pick<WardEmailSender, 'runBatch'>;

export class WardEmailWorker {
  private activeBatch: Promise<number> | null = null;
  private running = false;
  private timer: NodeJS.Timeout | null = null;

  public constructor(
    private readonly sender: WardEmailBatchSender,
    private readonly logger: WorkerLogger,
    private readonly options: WardEmailWorkerOptions,
  ) {}

  public async runBatch(): Promise<number> {
    return this.sender.runBatch(this.options.batchSize);
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
      await this.activeBatch;
    } catch {
      this.logger.error('ward_email_claim_failed');
    } finally {
      this.activeBatch = null;
      this.schedule();
    }
  }
}
