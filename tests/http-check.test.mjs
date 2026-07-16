import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatHttpCheckResult,
  parseHttpCheckOptions,
  runHttpCheck,
} from '../scripts/http-check.mjs';

describe('bounded HTTP smoke and load checks', () => {
  it('defaults to a bounded loopback smoke request', () => {
    const options = parseHttpCheckOptions([]);
    assert.equal(options.mode, 'smoke');
    assert.equal(options.requestCount, 1);
    assert.equal(options.concurrency, 1);
    assert.equal(options.urls[0].toString(), 'http://127.0.0.1:3001/health/live');
  });

  it('requires an explicit opt-in for remote URLs and rejects secret-bearing URLs', () => {
    assert.throws(
      () => parseHttpCheckOptions(['--url=https://api.example.test/health/live']),
      /explicit --allow-remote/u,
    );
    assert.doesNotThrow(() =>
      parseHttpCheckOptions(['--allow-remote', '--url=https://api.example.test/health/live']),
    );
    assert.throws(
      () => parseHttpCheckOptions(['--allow-remote', '--url=http://api.example.test/health/live']),
      /require HTTPS/u,
    );
    assert.throws(
      () => parseHttpCheckOptions(['--url=http://user:password@127.0.0.1/health/live']),
      /must not contain credentials/u,
    );
    assert.throws(
      () => parseHttpCheckOptions(['--url=http://127.0.0.1/health/live?token=value']),
      /must not contain credentials/u,
    );
  });

  it('enforces request, concurrency, timeout, and threshold bounds', () => {
    for (const arguments_ of [
      ['--mode=load', '--requests=5001'],
      ['--mode=load', '--concurrency=51'],
      ['--timeout-ms=99'],
      ['--max-p95-ms=0'],
      ['--max-error-rate=1.1'],
      ['--mode=unsafe'],
    ]) {
      assert.throws(() => parseHttpCheckOptions(arguments_));
    }
  });

  it('uses only GET and reports aggregate latency without reading response bodies', async () => {
    const methods = [];
    const options = parseHttpCheckOptions([
      '--mode=load',
      '--url',
      'http://127.0.0.1:3001/health/live',
      '--requests=12',
      '--concurrency=3',
      '--max-p95-ms=5000',
    ]);
    const result = await runHttpCheck(options, async (_url, init) => {
      methods.push(init.method);
      return new Response('{"status":"ok"}', {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    });

    assert.equal(result.passed, true);
    assert.equal(result.requests, 12);
    assert.ok(result.requestsPerSecond > 0);
    assert.equal(result.successfulRequests, 12);
    assert.deepEqual(new Set(methods), new Set(['GET']));
    assert.deepEqual(result.endpoints, ['http://127.0.0.1:3001/health/live']);
    assert.doesNotMatch(formatHttpCheckResult(result), /"status":"ok"/u);
  });

  it('fails closed on unhealthy status codes and redirects', async () => {
    const unavailable = await runHttpCheck(
      parseHttpCheckOptions(['--url', 'http://127.0.0.1:3001/unavailable']),
      async () => new Response(null, { status: 503 }),
    );
    assert.equal(unavailable.passed, false);
    assert.deepEqual(unavailable.failureCounts, { status_503: 1 });

    const redirect = await runHttpCheck(
      parseHttpCheckOptions(['--url', 'http://127.0.0.1:3001/redirect']),
      async () => {
        throw new TypeError('redirect rejected');
      },
    );
    assert.equal(redirect.passed, false);
    assert.equal(redirect.failedRequests, 1);
  });
});
