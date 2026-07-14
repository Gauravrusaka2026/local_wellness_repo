import { createClient } from 'npm:@supabase/supabase-js@2.110.2';

import {
  fetchGovernanceSnapshot,
  GovernanceSyncFetchError,
  isAuthorizedGovernanceSyncRequest,
  parseGovernanceSyncClaim,
  parseGovernanceSyncDispatchOptions,
  safeGovernanceSyncFailure,
  sha256Hex,
} from '../_shared/governance-sync-fetch.mjs';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};

const SNAPSHOT_BUCKET = 'governance-raw-snapshots';
const MAXIMUM_DISPATCH_BODY_BYTES = 4_096;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

type SupabaseClient = ReturnType<typeof createClient>;
type ClaimIdentity = Readonly<{
  runId: string;
  sourceEndpointId: string;
  leaseToken: string;
}>;

type SnapshotResult = Readonly<{
  kind: 'snapshot';
  status: number;
  bytes: Uint8Array;
  byteSize: number;
  mediaType: string;
  sha256: string;
  objectPath: string;
  etag: string | null;
  lastModified: string | null;
}>;

type NotModifiedResult = Readonly<{
  kind: 'not_modified';
  status: 304;
  etag: string | null;
  lastModified: string | null;
}>;

type FetchResult = SnapshotResult | NotModifiedResult;

type DispatchCounts = {
  claimed: number;
  snapshotted: number;
  notModified: number;
  failed: number;
};

const jsonResponse = (status: number, body: unknown, extraHeaders: HeadersInit = {}): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });

const structuredLog = (
  status: string,
  identity?: Pick<ClaimIdentity, 'runId' | 'sourceEndpointId'>,
): void => {
  console.log(
    JSON.stringify({
      event: 'governance_sync_fetch',
      ...(identity === undefined
        ? {}
        : { runId: identity.runId, sourceEndpointId: identity.sourceEndpointId }),
      status,
    }),
  );
};

const readClaimIdentity = (value: unknown): ClaimIdentity | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row['run_id'] !== 'string' ||
    !uuidPattern.test(row['run_id']) ||
    typeof row['source_endpoint_id'] !== 'string' ||
    !uuidPattern.test(row['source_endpoint_id']) ||
    typeof row['lease_token'] !== 'string' ||
    !uuidPattern.test(row['lease_token'])
  ) {
    return null;
  }

  return {
    runId: row['run_id'],
    sourceEndpointId: row['source_endpoint_id'],
    leaseToken: row['lease_token'],
  };
};

const parseDispatchBody = async (request: Request): Promise<unknown> => {
  const declaredLength = request.headers.get('content-length');
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length < 0 || length > MAXIMUM_DISPATCH_BODY_BYTES) {
      throw new GovernanceSyncFetchError('SOURCE_CONTRACT_INVALID');
    }
  }

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAXIMUM_DISPATCH_BODY_BYTES) {
    throw new GovernanceSyncFetchError('SOURCE_CONTRACT_INVALID');
  }
  if (body.trim() === '') return undefined;

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new GovernanceSyncFetchError('SOURCE_CONTRACT_INVALID');
  }
};

const ensureStoredSnapshotBytes = async (
  supabase: SupabaseClient,
  result: SnapshotResult,
): Promise<void> => {
  const bucket = supabase.storage.from(SNAPSHOT_BUCKET);
  const uploaded = await bucket.upload(result.objectPath, result.bytes, {
    contentType: result.mediaType,
    upsert: false,
  });
  if (uploaded.error === null) return;

  const existing = await bucket.download(result.objectPath);
  if (existing.error !== null || existing.data === null) {
    throw new GovernanceSyncFetchError('SNAPSHOT_UPLOAD_FAILED');
  }

  const existingBytes = new Uint8Array(await existing.data.arrayBuffer());
  const existingDigest = await sha256Hex(existingBytes);
  if (existingBytes.byteLength !== result.byteSize || existingDigest !== result.sha256) {
    throw new GovernanceSyncFetchError('SNAPSHOT_UPLOAD_FAILED');
  }
};

const heartbeatLease = async (
  supabase: SupabaseClient,
  identity: ClaimIdentity,
  leaseSeconds: number,
): Promise<void> => {
  const heartbeat = await supabase.rpc('heartbeat_governance_sync_lease', {
    p_run_id: identity.runId,
    p_lease_token: identity.leaseToken,
    p_extend_seconds: leaseSeconds,
  });
  if (heartbeat.error !== null) {
    throw new GovernanceSyncFetchError('SNAPSHOT_RECORD_FAILED');
  }
};

const recordSnapshot = async (
  supabase: SupabaseClient,
  identity: ClaimIdentity,
  result: FetchResult,
  retrievedAt: string,
): Promise<void> => {
  const snapshot = result.kind === 'snapshot' ? result : null;
  const recorded = await supabase.rpc('record_governance_sync_snapshot', {
    p_run_id: identity.runId,
    p_source_endpoint_id: identity.sourceEndpointId,
    p_lease_token: identity.leaseToken,
    p_storage_bucket: snapshot === null ? null : SNAPSHOT_BUCKET,
    p_storage_object_path: snapshot?.objectPath ?? null,
    p_sha256: snapshot?.sha256 ?? null,
    p_byte_size: snapshot?.byteSize ?? null,
    p_media_type: snapshot?.mediaType ?? null,
    p_etag: result.etag,
    p_last_modified: result.lastModified,
    p_retrieved_at: retrievedAt,
    p_http_status: result.status,
  });
  if (recorded.error !== null) {
    throw new GovernanceSyncFetchError('SNAPSHOT_RECORD_FAILED');
  }
};

const failRun = async (
  supabase: SupabaseClient,
  identity: ClaimIdentity,
  failure: Readonly<{ code: string; message: string }>,
): Promise<void> => {
  const failed = await supabase.rpc('fail_governance_sync_run', {
    p_run_id: identity.runId,
    p_source_endpoint_id: identity.sourceEndpointId,
    p_lease_token: identity.leaseToken,
    p_error_code: failure.code,
    p_error_detail: failure.message,
  });
  if (failed.error !== null) {
    throw new Error('Governance synchronization failure could not be persisted.');
  }
};

const processClaim = async (
  supabase: SupabaseClient,
  rawClaim: unknown,
  counts: DispatchCounts,
  leaseSeconds: number,
): Promise<void> => {
  const identity = readClaimIdentity(rawClaim);
  if (identity === null) {
    counts.failed += 1;
    structuredLog('invalid_claim');
    return;
  }

  try {
    // `claim_due_governance_sync_sources` must return:
    // run_id, source_endpoint_id, source_key, endpoint_url, allowed_hosts,
    // expected_media_types, max_response_bytes, fetch_timeout_seconds, etag,
    // last_modified, and lease_token. The lease token is passed only to the
    // record/fail RPCs and must never be logged or returned.
    const claim = parseGovernanceSyncClaim(rawClaim);
    const result = (await fetchGovernanceSnapshot(claim)) as FetchResult;
    const retrievedAt = new Date().toISOString();
    await heartbeatLease(supabase, identity, leaseSeconds);

    if (result.kind === 'snapshot') {
      await ensureStoredSnapshotBytes(supabase, result);
      await heartbeatLease(supabase, identity, leaseSeconds);
    }
    await recordSnapshot(supabase, identity, result, retrievedAt);

    if (result.kind === 'snapshot') {
      counts.snapshotted += 1;
      structuredLog('snapshot_preserved', identity);
    } else {
      counts.notModified += 1;
      structuredLog('not_modified', identity);
    }
  } catch (error) {
    const failure = safeGovernanceSyncFailure(error);
    try {
      await failRun(supabase, identity, failure);
    } catch {
      structuredLog('failure_record_failed', identity);
    }
    counts.failed += 1;
    structuredLog('failed', identity);
  }
};

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse(
      405,
      { error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST is supported.' } },
      { allow: 'POST' },
    );
  }

  const dispatchSecret = Deno.env.get('GOVERNANCE_SYNC_DISPATCH_SECRET');
  if (dispatchSecret === undefined || dispatchSecret.length < 32) {
    structuredLog('configuration_error');
    return jsonResponse(500, {
      error: { code: 'CONFIGURATION_ERROR', message: 'The sync dispatcher is unavailable.' },
    });
  }

  let isAuthorized: boolean;
  try {
    isAuthorized = await isAuthorizedGovernanceSyncRequest(request.headers, dispatchSecret);
  } catch {
    structuredLog('configuration_error');
    return jsonResponse(500, {
      error: { code: 'CONFIGURATION_ERROR', message: 'The sync dispatcher is unavailable.' },
    });
  }
  if (!isAuthorized) {
    structuredLog('unauthorized');
    return jsonResponse(401, {
      error: { code: 'AUTH_REQUIRED', message: 'A valid dispatch credential is required.' },
    });
  }

  let dispatchOptions;
  try {
    dispatchOptions = parseGovernanceSyncDispatchOptions(await parseDispatchBody(request));
  } catch {
    structuredLog('invalid_request');
    return jsonResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: 'The dispatch request is invalid.' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serverKey =
    Deno.env.get('SUPABASE_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serverKey) {
    structuredLog('configuration_error');
    return jsonResponse(500, {
      error: { code: 'CONFIGURATION_ERROR', message: 'The sync dispatcher is unavailable.' },
    });
  }

  let supabase: SupabaseClient;
  try {
    supabase = createClient(supabaseUrl, serverKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } catch {
    structuredLog('configuration_error');
    return jsonResponse(500, {
      error: { code: 'CONFIGURATION_ERROR', message: 'The sync dispatcher is unavailable.' },
    });
  }
  const workerId = `governance-sync-edge:${crypto.randomUUID()}`;
  let claimed;
  try {
    claimed = await supabase.rpc('claim_due_governance_sync_sources', {
      p_worker_id: workerId,
      p_limit: dispatchOptions.limit,
      p_lease_seconds: dispatchOptions.leaseSeconds,
    });
  } catch {
    structuredLog('claim_failed');
    return jsonResponse(503, {
      error: { code: 'DEPENDENCY_UNAVAILABLE', message: 'Sync work could not be claimed.' },
    });
  }

  if (claimed.error !== null || !Array.isArray(claimed.data)) {
    structuredLog('claim_failed');
    return jsonResponse(503, {
      error: { code: 'DEPENDENCY_UNAVAILABLE', message: 'Sync work could not be claimed.' },
    });
  }

  const counts: DispatchCounts = {
    claimed: claimed.data.length,
    snapshotted: 0,
    notModified: 0,
    failed: 0,
  };
  for (const rawClaim of claimed.data) {
    await processClaim(supabase, rawClaim, counts, dispatchOptions.leaseSeconds);
  }

  return jsonResponse(200, { data: counts });
});
