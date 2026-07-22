import { ConfigurationError, firstConfiguredValue } from '@local-wellness/config';

export interface WorkerConfiguration {
  batchSize: number;
  kpiCalculation: WorkerLoopConfiguration;
  leaseSeconds: number;
  pollIntervalMilliseconds: number;
  slaEscalation: WorkerLoopConfiguration;
  supabaseServiceRoleKey: string;
  supabaseUrl: string;
  workerId: string;
}

export interface WorkerLoopConfiguration {
  batchSize: number;
  leaseSeconds: number;
  pollIntervalMilliseconds: number;
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

const loopConfigurationPolicies = {
  KPI_CALCULATION: {
    batchSize: { fallback: 10, maximum: 50 },
    leaseSeconds: { fallback: 120, maximum: 600 },
  },
  SLA_ESCALATION: {
    batchSize: { fallback: 25, maximum: 100 },
    leaseSeconds: { fallback: 60, maximum: 300 },
  },
} as const;

const parseWorkerId = (value: string | undefined, fallback: string, name: string): string => {
  const workerId = requireValue(value ?? fallback, name);
  if (!workerIdPattern.test(workerId)) {
    throw new ConfigurationError(`${name} has an invalid format.`);
  }
  return workerId;
};

const loadLoopConfiguration = (
  environment: NodeJS.ProcessEnv,
  prefix: 'KPI_CALCULATION' | 'SLA_ESCALATION',
  fallbackWorkerId: string,
): WorkerLoopConfiguration => {
  const policy = loopConfigurationPolicies[prefix];
  return {
    batchSize: parseInteger(
      environment[`${prefix}_BATCH_SIZE`],
      policy.batchSize.fallback,
      `${prefix} batch size`,
      1,
      policy.batchSize.maximum,
    ),
    leaseSeconds: parseInteger(
      environment[`${prefix}_LEASE_SECONDS`],
      policy.leaseSeconds.fallback,
      `${prefix} lease seconds`,
      15,
      policy.leaseSeconds.maximum,
    ),
    pollIntervalMilliseconds: parseInteger(
      environment[`${prefix}_POLL_INTERVAL_MS`],
      10_000,
      `${prefix} poll interval`,
      250,
      60_000,
    ),
    workerId: parseWorkerId(
      environment[`${prefix}_WORKER_ID`],
      fallbackWorkerId,
      `${prefix} worker ID`,
    ),
  };
};

export const loadWorkerConfiguration = (
  environment: NodeJS.ProcessEnv = process.env,
): WorkerConfiguration => {
  const workerId = parseWorkerId(
    environment['NOTIFICATION_WORKER_ID'],
    `worker-${process.pid}`,
    'Notification worker ID',
  );

  return {
    batchSize: parseInteger(environment['NOTIFICATION_BATCH_SIZE'], 25, 'Batch size', 1, 100),
    kpiCalculation: loadLoopConfiguration(environment, 'KPI_CALCULATION', workerId),
    leaseSeconds: parseInteger(
      environment['NOTIFICATION_LEASE_SECONDS'],
      60,
      'Lease seconds',
      15,
      300,
    ),
    pollIntervalMilliseconds: parseInteger(
      environment['NOTIFICATION_POLL_INTERVAL_MS'],
      10_000,
      'Poll interval',
      250,
      60_000,
    ),
    slaEscalation: loadLoopConfiguration(environment, 'SLA_ESCALATION', workerId),
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
