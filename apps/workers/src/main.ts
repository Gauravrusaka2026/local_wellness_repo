import { createClient } from '@supabase/supabase-js';

import { KpiCalculationWorker } from './kpi-calculation-worker.js';
import { NotificationOutboxWorker } from './notification-outbox-worker.js';
import { SlaEscalationWorker } from './sla-escalation-worker.js';
import { SupabaseKpiCalculationStore } from './supabase-kpi-calculation.store.js';
import { SupabaseNotificationOutboxStore } from './supabase-notification-outbox.store.js';
import { SupabaseSlaEscalationStore } from './supabase-sla-escalation.store.js';
import { loadWorkerConfiguration } from './worker-configuration.js';
import { JsonWorkerLogger } from './worker-logger.js';
import { WardEmailSender } from './ward-email-sender.js';

export const startWorkerProcess = async (): Promise<void> => {
  process.title = 'local-wellness-workers';

  const configuration = loadWorkerConfiguration();
  const logger = new JsonWorkerLogger();
  const client = createClient(configuration.supabaseUrl, configuration.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  const notificationWorker = new NotificationOutboxWorker(
    new SupabaseNotificationOutboxStore(client),
    logger,
    {
      batchSize: configuration.batchSize,
      leaseSeconds: configuration.leaseSeconds,
      pollIntervalMilliseconds: configuration.pollIntervalMilliseconds,
      workerId: configuration.workerId,
    },
  );
  const slaEscalationWorker = new SlaEscalationWorker(
    new SupabaseSlaEscalationStore(client),
    logger,
    configuration.slaEscalation,
  );
  const kpiCalculationWorker = new KpiCalculationWorker(
    new SupabaseKpiCalculationStore(client),
    logger,
    configuration.kpiCalculation,
  );
  const workers = [notificationWorker, slaEscalationWorker, kpiCalculationWorker] as const;
  const emailSender =
    process.env['EMAIL_SMTP_HOST'] &&
    process.env['EMAIL_SMTP_USER'] &&
    process.env['EMAIL_SMTP_PASSWORD']
      ? new WardEmailSender(client, `${configuration.workerId}:ward-email`, logger)
      : null;
  let emailTimer: NodeJS.Timeout | null = null;
  let stopping = false;

  const stop = async (signal: string): Promise<void> => {
    if (stopping) {
      return;
    }

    stopping = true;
    logger.info('worker_process_stopping', { signal });
    await Promise.all(workers.map(async (worker) => worker.stop()));
    if (emailTimer) clearTimeout(emailTimer);
    logger.info('worker_process_stopped');
  };

  process.once('SIGINT', () => {
    void stop('SIGINT');
  });
  process.once('SIGTERM', () => {
    void stop('SIGTERM');
  });

  logger.info('worker_process_starting', {
    batchSize: configuration.batchSize,
    kpiBatchSize: configuration.kpiCalculation.batchSize,
    kpiLeaseSeconds: configuration.kpiCalculation.leaseSeconds,
    kpiPollIntervalMilliseconds: configuration.kpiCalculation.pollIntervalMilliseconds,
    leaseSeconds: configuration.leaseSeconds,
    pollIntervalMilliseconds: configuration.pollIntervalMilliseconds,
    slaBatchSize: configuration.slaEscalation.batchSize,
    slaLeaseSeconds: configuration.slaEscalation.leaseSeconds,
    slaPollIntervalMilliseconds: configuration.slaEscalation.pollIntervalMilliseconds,
    workerId: configuration.workerId,
  });

  const pollEmail = async (): Promise<void> => {
    if (!emailSender || stopping) return;
    try {
      await emailSender.runBatch();
    } catch {
      logger.error('ward_email_claim_failed');
    }
    if (!stopping) emailTimer = setTimeout(() => void pollEmail(), 60_000);
  };
  if (emailSender) void pollEmail();

  await Promise.all(workers.map(async (worker) => worker.start()));
};

await startWorkerProcess();
