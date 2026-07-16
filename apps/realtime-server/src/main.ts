import { createRealtimeApplication } from './application.js';
import { loadRealtimeConfiguration } from './configuration.js';
import { ConsoleRealtimeLogger } from './logger.js';

const logger = new ConsoleRealtimeLogger();
const application = createRealtimeApplication({
  configuration: loadRealtimeConfiguration(),
  logger,
});

try {
  const address = await application.listen();
  logger.info('realtime_server_started', { port: address.port });
} catch {
  logger.error('realtime_server_start_failed');
  process.exitCode = 1;
}

let shutdownStarted = false;
const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  if (shutdownStarted) return;
  shutdownStarted = true;
  logger.info('realtime_server_stopping', { signal });
  try {
    await application.close();
    logger.info('realtime_server_stopped');
  } catch {
    logger.error('realtime_server_stop_failed');
    process.exitCode = 1;
  }
};

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
