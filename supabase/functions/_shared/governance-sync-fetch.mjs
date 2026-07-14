const DEFAULT_MAXIMUM_REDIRECTS = 5;
const MAXIMUM_ALLOWED_BYTES = 100 * 1024 * 1024;
const SAFE_HEADER_LENGTH = 1024;

const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const sourceKeyPattern = /^[a-z][a-z0-9:_-]{1,159}$/u;
const mediaTypePattern = /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/u;
const snapshotExtensions = new Map([
  ['application/geo+json', 'geojson'],
  ['application/json', 'json'],
  ['application/pdf', 'pdf'],
  ['application/vnd.ms-excel', 'xls'],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'],
  ['text/csv', 'csv'],
  ['text/html', 'html'],
  ['text/plain', 'txt'],
]);

const safeFailures = Object.freeze({
  FETCH_ABORTED: 'The source retrieval was cancelled.',
  FETCH_FAILED: 'The approved source could not be retrieved.',
  FETCH_TIMEOUT: 'The approved source retrieval timed out.',
  HTTP_STATUS_INVALID: 'The approved source returned an unsupported HTTP status.',
  MIME_TYPE_INVALID: 'The approved source returned an unexpected media type.',
  REDIRECT_INVALID: 'The approved source returned an unsafe redirect.',
  RESPONSE_EMPTY: 'The approved source returned no content.',
  RESPONSE_TOO_LARGE: 'The approved source response exceeded its byte limit.',
  SNAPSHOT_RECORD_FAILED: 'The source snapshot metadata could not be recorded.',
  SNAPSHOT_UPLOAD_FAILED: 'The source snapshot bytes could not be preserved.',
  SOURCE_CONTRACT_INVALID: 'The approved source retrieval contract is invalid.',
  SOURCE_URL_INVALID: 'The approved source URL is invalid.',
});

export class GovernanceSyncFetchError extends Error {
  constructor(code, options = {}) {
    const message = safeFailures[code] ?? safeFailures.FETCH_FAILED;
    super(message, options);
    this.name = 'GovernanceSyncFetchError';
    this.code = Object.hasOwn(safeFailures, code) ? code : 'FETCH_FAILED';
  }
}

const fail = (code, options) => {
  throw new GovernanceSyncFetchError(code, options);
};

const hasControlCharacters = (value) =>
  [...value].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
  });

const readSafeConditionalHeader = (value) => {
  if (value === null || value === undefined) return null;
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > SAFE_HEADER_LENGTH ||
    hasControlCharacters(value)
  ) {
    fail('SOURCE_CONTRACT_INVALID');
  }
  return value;
};

const normalizeHostname = (value) => {
  if (typeof value !== 'string' || value.length === 0 || value.length > 253) {
    fail('SOURCE_CONTRACT_INVALID');
  }

  let parsed;
  try {
    parsed = new URL(`https://${value}`);
  } catch {
    fail('SOURCE_CONTRACT_INVALID');
  }

  const normalized = parsed.hostname.toLowerCase().replace(/\.$/u, '');
  if (
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.port !== '' ||
    parsed.pathname !== '/' ||
    parsed.search !== '' ||
    parsed.hash !== '' ||
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local') ||
    normalized.endsWith('.internal') ||
    normalized.includes(':') ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/u.test(normalized)
  ) {
    fail('SOURCE_CONTRACT_INVALID');
  }

  return normalized;
};

const normalizeAllowedHosts = (values) => {
  if (!Array.isArray(values) || values.length === 0 || values.length > 20) {
    fail('SOURCE_CONTRACT_INVALID');
  }

  return new Set(values.map(normalizeHostname));
};

const normalizeExpectedMediaTypes = (values) => {
  if (!Array.isArray(values) || values.length === 0 || values.length > 20) {
    fail('SOURCE_CONTRACT_INVALID');
  }

  const normalized = values.map((value) => {
    if (typeof value !== 'string') fail('SOURCE_CONTRACT_INVALID');
    const mediaType = value.trim().toLowerCase();
    if (!mediaTypePattern.test(mediaType)) fail('SOURCE_CONTRACT_INVALID');
    return mediaType;
  });

  return new Set(normalized);
};

const readPositiveInteger = (value, maximum) => {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    fail('SOURCE_CONTRACT_INVALID');
  }
  return value;
};

const readIntegerInRange = (value, minimum, maximum) => {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    fail('SOURCE_CONTRACT_INVALID');
  }
  return value;
};

export const parseGovernanceSyncClaim = (value) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail('SOURCE_CONTRACT_INVALID');
  }

  const claim = value;
  if (
    typeof claim.run_id !== 'string' ||
    !uuidPattern.test(claim.run_id) ||
    typeof claim.source_endpoint_id !== 'string' ||
    !uuidPattern.test(claim.source_endpoint_id) ||
    typeof claim.lease_token !== 'string' ||
    !uuidPattern.test(claim.lease_token) ||
    typeof claim.source_key !== 'string' ||
    !sourceKeyPattern.test(claim.source_key) ||
    typeof claim.endpoint_url !== 'string'
  ) {
    fail('SOURCE_CONTRACT_INVALID');
  }

  const allowedHosts = normalizeAllowedHosts(claim.allowed_hosts);
  const expectedMediaTypes = normalizeExpectedMediaTypes(claim.expected_media_types);
  const maxResponseBytes = readPositiveInteger(claim.max_response_bytes, MAXIMUM_ALLOWED_BYTES);
  const fetchTimeoutSeconds = readPositiveInteger(claim.fetch_timeout_seconds, 120);
  const etag = readSafeConditionalHeader(claim.etag);
  const rawLastModified = readSafeConditionalHeader(claim.last_modified);
  let lastModified = null;
  if (rawLastModified !== null) {
    const timestamp = Date.parse(rawLastModified);
    if (!Number.isFinite(timestamp)) fail('SOURCE_CONTRACT_INVALID');
    lastModified = new Date(timestamp).toUTCString();
  }

  return Object.freeze({
    runId: claim.run_id,
    sourceEndpointId: claim.source_endpoint_id,
    sourceKey: claim.source_key,
    endpointUrl: claim.endpoint_url,
    allowedHosts,
    expectedMediaTypes,
    maxResponseBytes,
    fetchTimeoutSeconds,
    etag,
    lastModified,
  });
};

export const validateGovernanceSourceUrl = (value, allowedHosts) => {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail('SOURCE_URL_INVALID');
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/u, '');
  if (
    url.protocol !== 'https:' ||
    url.username !== '' ||
    url.password !== '' ||
    (url.port !== '' && url.port !== '443') ||
    url.hash !== '' ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.includes(':') ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/u.test(hostname) ||
    !allowedHosts.has(hostname)
  ) {
    fail('SOURCE_URL_INVALID');
  }

  return url;
};

const digestBytes = async (value, cryptoImplementation) =>
  new Uint8Array(await cryptoImplementation.subtle.digest('SHA-256', value));

const bytesToHex = (value) => [...value].map((byte) => byte.toString(16).padStart(2, '0')).join('');

export const sha256Hex = async (value, cryptoImplementation = globalThis.crypto) => {
  if (!(value instanceof Uint8Array) || !cryptoImplementation?.subtle) {
    fail('SOURCE_CONTRACT_INVALID');
  }
  return bytesToHex(await digestBytes(value, cryptoImplementation));
};

export const isAuthorizedGovernanceSyncRequest = async (
  headers,
  expectedSecret,
  cryptoImplementation = globalThis.crypto,
) => {
  if (
    typeof expectedSecret !== 'string' ||
    expectedSecret.length < 32 ||
    expectedSecret.length > 1024 ||
    hasControlCharacters(expectedSecret)
  ) {
    return false;
  }

  const candidate = headers.get('x-governance-sync-secret');
  if (
    candidate === null ||
    candidate.length < 32 ||
    candidate.length > 1024 ||
    hasControlCharacters(candidate) ||
    !cryptoImplementation?.subtle
  ) {
    return false;
  }

  const encoder = new TextEncoder();
  const [expectedDigest, candidateDigest] = await Promise.all([
    digestBytes(encoder.encode(expectedSecret), cryptoImplementation),
    digestBytes(encoder.encode(candidate), cryptoImplementation),
  ]);
  let difference = 0;
  for (let index = 0; index < expectedDigest.length; index += 1) {
    difference |= expectedDigest[index] ^ candidateDigest[index];
  }
  return difference === 0;
};

const normalizeResponseMediaType = (value) => {
  if (value === null) fail('MIME_TYPE_INVALID');
  const mediaType = value.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  if (!mediaTypePattern.test(mediaType)) fail('MIME_TYPE_INVALID');
  return mediaType;
};

const readResponseBytes = async (response, maximumBytes) => {
  const contentLength = response.headers.get('content-length');
  if (contentLength !== null) {
    const declaredBytes = Number(contentLength);
    if (!Number.isSafeInteger(declaredBytes) || declaredBytes < 0) {
      fail('FETCH_FAILED');
    }
    if (declaredBytes > maximumBytes) fail('RESPONSE_TOO_LARGE');
  }

  if (response.body === null) fail('RESPONSE_EMPTY');
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) fail('FETCH_FAILED');
      length += value.byteLength;
      if (length > maximumBytes) {
        await reader.cancel();
        fail('RESPONSE_TOO_LARGE');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  if (length === 0) fail('RESPONSE_EMPTY');
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

const safeResponseHeader = (headers, name) => {
  const value = headers.get(name);
  if (value === null) return null;
  if (value.length > SAFE_HEADER_LENGTH || hasControlCharacters(value)) return null;
  return value;
};

const responseLastModified = (headers) => {
  const value = safeResponseHeader(headers, 'last-modified');
  if (value === null) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
};

const classifyFetchFailure = (error, signal) => {
  if (error instanceof GovernanceSyncFetchError) return error;
  if (signal.aborted) return new GovernanceSyncFetchError('FETCH_TIMEOUT');
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new GovernanceSyncFetchError('FETCH_ABORTED');
  }
  return new GovernanceSyncFetchError('FETCH_FAILED');
};

export const fetchGovernanceSnapshot = async (
  claim,
  {
    cryptoImplementation = globalThis.crypto,
    fetchImplementation = globalThis.fetch,
    maximumRedirects = DEFAULT_MAXIMUM_REDIRECTS,
  } = {},
) => {
  if (
    typeof fetchImplementation !== 'function' ||
    !Number.isSafeInteger(maximumRedirects) ||
    maximumRedirects < 0 ||
    maximumRedirects > 10
  ) {
    fail('SOURCE_CONTRACT_INVALID');
  }

  let url = validateGovernanceSourceUrl(claim.endpointUrl, claim.allowedHosts);
  const headers = new Headers({
    Accept: [...claim.expectedMediaTypes].join(', '),
    'Accept-Encoding': 'identity',
  });
  if (claim.etag !== null) headers.set('If-None-Match', claim.etag);
  if (claim.lastModified !== null) headers.set('If-Modified-Since', claim.lastModified);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), claim.fetchTimeoutSeconds * 1000);

  try {
    for (let redirectCount = 0; redirectCount <= maximumRedirects; redirectCount += 1) {
      const response = await fetchImplementation(url, {
        headers,
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
      });

      if (redirectStatuses.has(response.status)) {
        if (redirectCount === maximumRedirects) fail('REDIRECT_INVALID');
        const location = response.headers.get('location');
        if (location === null) fail('REDIRECT_INVALID');
        let redirected;
        try {
          redirected = new URL(location, url);
        } catch {
          fail('REDIRECT_INVALID');
        }
        try {
          url = validateGovernanceSourceUrl(redirected.toString(), claim.allowedHosts);
        } catch (error) {
          throw new GovernanceSyncFetchError('REDIRECT_INVALID', { cause: error });
        }
        continue;
      }

      if (response.status === 304) {
        return Object.freeze({
          kind: 'not_modified',
          status: 304,
          etag: safeResponseHeader(response.headers, 'etag') ?? claim.etag,
          lastModified: responseLastModified(response.headers) ?? claim.lastModified,
        });
      }

      if (response.status !== 200) fail('HTTP_STATUS_INVALID');
      const mediaType = normalizeResponseMediaType(response.headers.get('content-type'));
      if (!claim.expectedMediaTypes.has(mediaType)) fail('MIME_TYPE_INVALID');
      const bytes = await readResponseBytes(response, claim.maxResponseBytes);
      const sha256 = await sha256Hex(bytes, cryptoImplementation);
      const extension = snapshotExtensions.get(mediaType);
      if (extension === undefined) fail('MIME_TYPE_INVALID');

      return Object.freeze({
        kind: 'snapshot',
        status: response.status,
        bytes,
        byteSize: bytes.byteLength,
        mediaType,
        sha256,
        objectPath: `${claim.sourceEndpointId}/${sha256}.${extension}`,
        etag: safeResponseHeader(response.headers, 'etag'),
        lastModified: responseLastModified(response.headers),
      });
    }

    fail('REDIRECT_INVALID');
  } catch (error) {
    throw classifyFetchFailure(error, controller.signal);
  } finally {
    clearTimeout(timeout);
  }
};

export const safeGovernanceSyncFailure = (error) => {
  const failure =
    error instanceof GovernanceSyncFetchError
      ? error
      : new GovernanceSyncFetchError('FETCH_FAILED');
  return Object.freeze({ code: failure.code, message: failure.message });
};

export const parseGovernanceSyncDispatchOptions = (value) => {
  if (value === undefined || value === null) {
    return Object.freeze({ limit: 1, leaseSeconds: 300 });
  }
  if (typeof value !== 'object' || Array.isArray(value)) fail('SOURCE_CONTRACT_INVALID');
  const keys = Object.keys(value);
  if (keys.some((key) => key !== 'limit' && key !== 'leaseSeconds')) {
    fail('SOURCE_CONTRACT_INVALID');
  }
  return Object.freeze({
    limit: value.limit === undefined ? 1 : readIntegerInRange(value.limit, 1, 1),
    leaseSeconds:
      value.leaseSeconds === undefined ? 300 : readIntegerInRange(value.leaseSeconds, 300, 900),
  });
};
