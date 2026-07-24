import { createClient } from '@supabase/supabase-js';

import { loadWorkerConfiguration } from './worker-configuration.js';
import { WardEmailSender } from './ward-email-sender.js';
import { WardEmailWorker } from './ward-email-worker.js';
import { JsonWorkerLogger } from './worker-logger.js';

const configuration = loadWorkerConfiguration();
const logger = new JsonWorkerLogger();
const client = createClient(configuration.supabaseUrl, configuration.supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});
const runOnce = process.argv.includes('--once');
const batchSize = runOnce ? 1 : 10;
const worker = new WardEmailWorker(
  new WardEmailSender(client, `${configuration.workerId}:ward-email`, logger),
  logger,
  {
    batchSize,
    pollIntervalMilliseconds: 60_000,
  },
);

process.title = 'local-wellness-ward-email-worker';

logger.info('ward_email_worker_starting', {
  batchSize,
  mode: runOnce ? 'once' : 'continuous',
  pollIntervalMilliseconds: 60_000,
  workerId: `${configuration.workerId}:ward-email`,
});

if (runOnce) {
  try {
    const sent = await worker.runBatch();
    logger.info('ward_email_one_shot_completed', { sent });
  } catch {
    logger.error('ward_email_one_shot_failed');
    process.exitCode = 1;
  }
} else {
  await worker.start();
}

let stopping = false;
const stop = async (signal: NodeJS.Signals): Promise<void> => {
  if (stopping) {
    return;
  }
  stopping = true;
  logger.info('ward_email_worker_stopping', { signal });
  await worker.stop();
  logger.info('ward_email_worker_stopped');
};

if (!runOnce) {
  process.once('SIGINT', () => {
    void stop('SIGINT');
  });
  process.once('SIGTERM', () => {
    void stop('SIGTERM');
  });
}
