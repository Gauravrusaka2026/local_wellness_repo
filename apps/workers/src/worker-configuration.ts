import { ConfigurationError, firstConfiguredValue } from '@local-wellness/config';

export interface WorkerConfiguration {
  batchSize: number;
  leaseSeconds: number;
  pollIntervalMilliseconds: number;
  supabaseServiceRoleKey: string;
  supabaseUrl: string;
  workerId: string;
}

const requireValue = (value: string | undefined, name: string): string => {
  const normalized = value?.trim();
  if (!normalized) {
    throw new ConfigurationError(`${name} is required.`);
  }
  return normalized;
};

const parseInteger = (
  value: string | undefined,
  fallback: number,
  name: string,
  minimum: number,
  maximum: number,
): number => {
  const parsed = Number(value?.trim() || fallback);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new ConfigurationError(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return parsed;
};

const parseHttpUrl = (value: string | undefined): string => {
  const normalized = requireValue(value, 'Supabase URL');
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new ConfigurationError('Supabase URL must be a valid HTTP(S) URL.');
  }

  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.search !== '' ||
    parsed.hash !== ''
  ) {
    throw new ConfigurationError('Supabase URL must be a valid HTTP(S) URL.');
  }
  return parsed.toString().replace(/\/$/u, '');
};

const workerIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;

export const loadWorkerConfiguration = (
  environment: NodeJS.ProcessEnv = process.env,
): WorkerConfiguration => {
  const workerId = requireValue(
    environment['NOTIFICATION_WORKER_ID'] ?? `worker-${process.pid}`,
    'Notification worker ID',
  );
  if (!workerIdPattern.test(workerId)) {
    throw new ConfigurationError('Notification worker ID has an invalid format.');
  }

  return {
    batchSize: parseInteger(environment['NOTIFICATION_BATCH_SIZE'], 25, 'Batch size', 1, 100),
    leaseSeconds: parseInteger(
      environment['NOTIFICATION_LEASE_SECONDS'],
      60,
      'Lease seconds',
      15,
      300,
    ),
    pollIntervalMilliseconds: parseInteger(
      environment['NOTIFICATION_POLL_INTERVAL_MS'],
      1_000,
      'Poll interval',
      250,
      60_000,
    ),
    supabaseServiceRoleKey: requireValue(
      firstConfiguredValue(
        environment['SUPABASE_SECRET_KEY'],
        environment['SUPABASE_SERVICE_ROLE_KEY'],
      ),
      'Supabase service role key',
    ),
    supabaseUrl: parseHttpUrl(environment['SUPABASE_URL']),
    workerId,
  };
};
