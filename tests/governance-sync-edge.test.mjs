import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import {
  GovernanceSyncFetchError,
  fetchGovernanceSnapshot,
  isAuthorizedGovernanceSyncRequest,
  parseGovernanceSyncClaim,
  parseGovernanceSyncDispatchOptions,
  safeGovernanceSyncFailure,
} from '../supabase/functions/_shared/governance-sync-fetch.mjs';

const identifiers = {
  run: '11111111-1111-4111-8111-111111111111',
  source: '22222222-2222-4222-8222-222222222222',
  lease: '33333333-3333-4333-8333-333333333333',
};

const claimRow = (overrides = {}) => ({
  run_id: identifiers.run,
  source_endpoint_id: identifiers.source,
  lease_token: identifiers.lease,
  source_key: 'official:wards',
  endpoint_url: 'https://data.maharashtra.gov.in/wards.csv',
  allowed_hosts: ['data.maharashtra.gov.in'],
  expected_media_types: ['text/csv'],
  max_response_bytes: 1024,
  fetch_timeout_seconds: 5,
  etag: '"prior-digest"',
  last_modified: 'Tue, 14 Jul 2026 01:02:03 GMT',
  ...overrides,
});

const parsedClaim = (overrides) => parseGovernanceSyncClaim(claimRow(overrides));

const expectFetchError = async (operation, code) => {
  await assert.rejects(operation, (error) => {
    assert.ok(error instanceof GovernanceSyncFetchError);
    assert.equal(error.code, code);
    return true;
  });
};

describe('governance synchronization Edge fetch boundary', () => {
  it('dispatches one source at a time with a lease long enough for fetch and persistence', () => {
    assert.deepEqual(parseGovernanceSyncDispatchOptions(undefined), {
      limit: 1,
      leaseSeconds: 300,
    });
    assert.throws(
      () => parseGovernanceSyncDispatchOptions({ limit: 2, leaseSeconds: 300 }),
      (error) =>
        error instanceof GovernanceSyncFetchError && error.code === 'SOURCE_CONTRACT_INVALID',
    );
    assert.throws(
      () => parseGovernanceSyncDispatchOptions({ limit: 1, leaseSeconds: 60 }),
      (error) =>
        error instanceof GovernanceSyncFetchError && error.code === 'SOURCE_CONTRACT_INVALID',
    );
  });

  it('compares the dispatch header without returning or logging the configured secret', async () => {
    const secret = 'a-secure-dispatch-secret-with-32-characters';

    assert.equal(
      await isAuthorizedGovernanceSyncRequest(
        new Headers({ 'x-governance-sync-secret': secret }),
        secret,
      ),
      true,
    );
    assert.equal(
      await isAuthorizedGovernanceSyncRequest(
        new Headers({ 'x-governance-sync-secret': `${secret}-wrong` }),
        secret,
      ),
      false,
    );
    assert.equal(await isAuthorizedGovernanceSyncRequest(new Headers(), secret), false);
    assert.equal(
      await isAuthorizedGovernanceSyncRequest(
        new Headers({ 'x-governance-sync-secret': secret }),
        'too-short',
      ),
      false,
    );
  });

  it('rejects redirects to IP literals or hosts outside the reviewed allow-list', async () => {
    const claim = parsedClaim();
    let calls = 0;
    const fetchImplementation = async () => {
      calls += 1;
      return new Response(null, {
        headers: { location: 'https://127.0.0.1/private-data' },
        status: 302,
      });
    };

    await expectFetchError(
      () => fetchGovernanceSnapshot(claim, { fetchImplementation }),
      'REDIRECT_INVALID',
    );
    assert.equal(calls, 1);

    await expectFetchError(
      () =>
        fetchGovernanceSnapshot(claim, {
          fetchImplementation: async () =>
            new Response(null, {
              headers: { location: 'https://unreviewed.example/wards.csv' },
              status: 307,
            }),
        }),
      'REDIRECT_INVALID',
    );
  });

  it('follows only manually validated redirects to an explicitly allowed HTTPS host', async () => {
    const claim = parsedClaim({
      allowed_hosts: ['data.maharashtra.gov.in', 'cdn.maharashtra.gov.in'],
    });
    const visited = [];
    const fetchImplementation = async (url, init) => {
      visited.push(url.toString());
      assert.equal(init.redirect, 'manual');
      if (visited.length === 1) {
        return new Response(null, {
          headers: { location: 'https://cdn.maharashtra.gov.in/releases/wards.csv' },
          status: 302,
        });
      }
      return new Response('ward,name\n1,Central\n', {
        headers: { 'content-type': 'text/csv; charset=utf-8' },
        status: 200,
      });
    };

    const result = await fetchGovernanceSnapshot(claim, { fetchImplementation });
    assert.equal(result.kind, 'snapshot');
    assert.deepEqual(visited, [
      'https://data.maharashtra.gov.in/wards.csv',
      'https://cdn.maharashtra.gov.in/releases/wards.csv',
    ]);
  });

  it('rejects oversized responses from both declared and streamed byte counts', async () => {
    const claim = parsedClaim({ max_response_bytes: 4 });

    await expectFetchError(
      () =>
        fetchGovernanceSnapshot(claim, {
          fetchImplementation: async () =>
            new Response('12345', {
              headers: { 'content-length': '5', 'content-type': 'text/csv' },
              status: 200,
            }),
        }),
      'RESPONSE_TOO_LARGE',
    );

    await expectFetchError(
      () =>
        fetchGovernanceSnapshot(claim, {
          fetchImplementation: async () =>
            new Response('12345', {
              headers: { 'content-type': 'text/csv' },
              status: 200,
            }),
        }),
      'RESPONSE_TOO_LARGE',
    );
  });

  it('requires an expected response media type before reading the body', async () => {
    await expectFetchError(
      () =>
        fetchGovernanceSnapshot(parsedClaim(), {
          fetchImplementation: async () =>
            new Response('<html>not csv</html>', {
              headers: { 'content-type': 'text/html' },
              status: 200,
            }),
        }),
      'MIME_TYPE_INVALID',
    );
  });

  it('hashes the exact fetched bytes and derives a deterministic content-addressed path', async () => {
    const bytes = new TextEncoder().encode('ward,name\n1,Central\n');
    const expectedDigest = createHash('sha256').update(bytes).digest('hex');
    const claim = parsedClaim();
    const result = await fetchGovernanceSnapshot(claim, {
      fetchImplementation: async (_url, init) => {
        assert.equal(init.method, 'GET');
        assert.equal(init.redirect, 'manual');
        assert.equal(init.headers.get('if-none-match'), '"prior-digest"');
        assert.equal(init.headers.get('if-modified-since'), 'Tue, 14 Jul 2026 01:02:03 GMT');
        return new Response(bytes, {
          headers: {
            'content-type': 'text/csv; charset=utf-8',
            etag: '"current-digest"',
            'last-modified': 'Tue, 14 Jul 2026 02:03:04 GMT',
          },
          status: 200,
        });
      },
    });

    assert.equal(result.kind, 'snapshot');
    assert.equal(result.sha256, expectedDigest);
    assert.equal(result.byteSize, bytes.byteLength);
    assert.deepEqual(result.bytes, bytes);
    assert.equal(result.objectPath, `${identifiers.source}/${expectedDigest}.csv`);
    assert.equal(result.mediaType, 'text/csv');
    assert.equal(result.etag, '"current-digest"');
    assert.equal(result.lastModified, '2026-07-14T02:03:04.000Z');
  });

  it('handles a conditional not-modified response without inventing snapshot bytes', async () => {
    const result = await fetchGovernanceSnapshot(parsedClaim(), {
      fetchImplementation: async () =>
        new Response(null, {
          headers: { etag: '"prior-digest"' },
          status: 304,
        }),
    });

    assert.deepEqual(result, {
      kind: 'not_modified',
      status: 304,
      etag: '"prior-digest"',
      lastModified: 'Tue, 14 Jul 2026 01:02:03 GMT',
    });
  });

  it('maps arbitrary dependency errors to fixed safe failure details', () => {
    const failure = safeGovernanceSyncFailure(
      new Error(
        'fetch https://data.maharashtra.gov.in/officers.csv?token=secret failed for person@example.test',
      ),
    );

    assert.deepEqual(failure, {
      code: 'FETCH_FAILED',
      message: 'The approved source could not be retrieved.',
    });
    assert.doesNotMatch(JSON.stringify(failure), /secret|person@|officers\.csv/u);
  });

  it('rejects unsafe claim headers and never exposes the lease token in safe errors', () => {
    assert.throws(
      () => parsedClaim({ etag: 'safe\r\nx-injected: true' }),
      (error) =>
        error instanceof GovernanceSyncFetchError && error.code === 'SOURCE_CONTRACT_INVALID',
    );

    const failure = safeGovernanceSyncFailure(
      new Error(`lease ${identifiers.lease} failed against a private endpoint`),
    );
    assert.doesNotMatch(JSON.stringify(failure), new RegExp(identifiers.lease, 'u'));
  });

  it('retains content-addressed snapshots when database finalization is ambiguous', async () => {
    const edgeFunctionSource = await readFile(
      new URL('../supabase/functions/governance-sync-fetch/index.ts', import.meta.url),
      'utf8',
    );

    assert.doesNotMatch(edgeFunctionSource, /storage\.from\([^)]*\)\.remove/u);
    assert.doesNotMatch(edgeFunctionSource, /snapshot_cleanup/u);
  });
});
