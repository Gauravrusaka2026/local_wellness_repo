import { createClient } from '@supabase/supabase-js';

import { NotificationOutboxWorker } from './notification-outbox-worker.js';
import { SupabaseNotificationOutboxStore } from './supabase-notification-outbox.store.js';
import { loadWorkerConfiguration } from './worker-configuration.js';
import { JsonWorkerLogger } from './worker-logger.js';

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
  const store = new SupabaseNotificationOutboxStore(client);
  const worker = new NotificationOutboxWorker(store, logger, {
    batchSize: configuration.batchSize,
    leaseSeconds: configuration.leaseSeconds,
    pollIntervalMilliseconds: configuration.pollIntervalMilliseconds,
    workerId: configuration.workerId,
  });
  let stopping = false;

  const stop = async (signal: string): Promise<void> => {
    if (stopping) {
      return;
    }

    stopping = true;
    logger.info('notification_worker_stopping', { signal });
    await worker.stop();
    logger.info('notification_worker_stopped');
  };

  process.once('SIGINT', () => {
    void stop('SIGINT');
  });
  process.once('SIGTERM', () => {
    void stop('SIGTERM');
  });

  logger.info('notification_worker_starting', {
    batchSize: configuration.batchSize,
    leaseSeconds: configuration.leaseSeconds,
    pollIntervalMilliseconds: configuration.pollIntervalMilliseconds,
    workerId: configuration.workerId,
  });

  await worker.start();
};

await startWorkerProcess();
