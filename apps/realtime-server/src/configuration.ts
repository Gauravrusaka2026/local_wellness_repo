import {
  firstConfiguredValue,
  parseRealtimeConfiguration,
  type RealtimeConfiguration,
} from '@local-wellness/config';

export const loadRealtimeConfiguration = (
  environment: NodeJS.ProcessEnv = process.env,
): RealtimeConfiguration =>
  parseRealtimeConfiguration({
    allowedOrigins: environment['REALTIME_ALLOWED_ORIGINS'],
    deliveryBatchSize: environment['REALTIME_DELIVERY_BATCH_SIZE'],
    deliveryLeaseSeconds: environment['REALTIME_DELIVERY_LEASE_SECONDS'],
    deliveryPollIntervalMilliseconds: environment['REALTIME_DELIVERY_POLL_INTERVAL_MS'],
    eventRateLimitPerMinute: environment['REALTIME_EVENT_RATE_LIMIT_PER_MINUTE'],
    maxHttpBufferSizeBytes: environment['REALTIME_MAX_HTTP_BUFFER_SIZE_BYTES'],
    maxRoomsPerSocket: environment['REALTIME_MAX_ROOMS_PER_SOCKET'],
    port: environment['PORT'],
    supabaseAnonKey: firstConfiguredValue(
      environment['SUPABASE_PUBLISHABLE_KEY'],
      environment['SUPABASE_ANON_KEY'],
    ),
    supabaseServiceRoleKey: firstConfiguredValue(
      environment['SUPABASE_SECRET_KEY'],
      environment['SUPABASE_SERVICE_ROLE_KEY'],
    ),
    supabaseUrl: environment['SUPABASE_URL'],
  });
