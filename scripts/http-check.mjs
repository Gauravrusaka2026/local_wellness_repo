#!/usr/bin/env node

import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const defaults = {
  concurrency: 5,
  maxErrorRate: 0,
  maxP95Milliseconds: 2_000,
  mode: 'smoke',
  requests: 100,
  timeoutMilliseconds: 5_000,
  urls: ['http://127.0.0.1:3001/health/live'],
};

const bounds = {
  concurrency: { maximum: 50, minimum: 1 },
  maxErrorRate: { maximum: 1, minimum: 0 },
  maxP95Milliseconds: { maximum: 60_000, minimum: 1 },
  requests: { maximum: 5_000, minimum: 1 },
  timeoutMilliseconds: { maximum: 30_000, minimum: 100 },
};

const loopbackHostnames = new Set(['127.0.0.1', '::1', '[::1]', 'localhost']);

const parseNumber = (value, name, policy, integer = true) => {
  const parsed = Number(value);
  if (
    !Number.isFinite(parsed) ||
    (integer && !Number.isInteger(parsed)) ||
    parsed < policy.minimum ||
    parsed > policy.maximum
  ) {
    throw new Error(`${name} must be between ${policy.minimum} and ${policy.maximum}.`);
  }
  return parsed;
};

const optionValue = (arguments_, index, name) => {
  const argument = arguments_[index];
  const separator = argument.indexOf('=');
  if (separator >= 0) return { consumed: 0, value: argument.slice(separator + 1) };
  const value = arguments_[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value.`);
  return { consumed: 1, value };
};

const validateUrl = (value, allowRemote) => {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Each check URL must be a valid HTTP(S) URL.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Each check URL must use HTTP or HTTPS.');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('Check URLs must not contain credentials, query strings, or fragments.');
  }
  const isLoopback = loopbackHostnames.has(url.hostname);
  if (!allowRemote && !isLoopback) {
    throw new Error('Remote checks require the explicit --allow-remote flag.');
  }
  if (!isLoopback && url.protocol !== 'https:') {
    throw new Error('Remote checks require HTTPS.');
  }

  return url;
};

export const parseHttpCheckOptions = (arguments_) => {
  const values = { ...defaults, urls: [] };
  let allowRemote = false;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === '--allow-remote') {
      allowRemote = true;
      continue;
    }

    const supported = [
      '--concurrency',
      '--max-error-rate',
      '--max-p95-ms',
      '--mode',
      '--requests',
      '--timeout-ms',
      '--url',
    ].find((name) => argument === name || argument.startsWith(`${name}=`));
    if (!supported) throw new Error(`Unsupported HTTP check option: ${argument}`);

    const { consumed, value } = optionValue(arguments_, index, supported);
    index += consumed;
    switch (supported) {
      case '--concurrency':
        values.concurrency = parseNumber(value, 'Concurrency', bounds.concurrency);
        break;
      case '--max-error-rate':
        values.maxErrorRate = parseNumber(value, 'Maximum error rate', bounds.maxErrorRate, false);
        break;
      case '--max-p95-ms':
        values.maxP95Milliseconds = parseNumber(
          value,
          'Maximum p95 latency',
          bounds.maxP95Milliseconds,
        );
        break;
      case '--mode':
        if (value !== 'load' && value !== 'smoke') {
          throw new Error('Mode must be smoke or load.');
        }
        values.mode = value;
        break;
      case '--requests':
        values.requests = parseNumber(value, 'Request count', bounds.requests);
        break;
      case '--timeout-ms':
        values.timeoutMilliseconds = parseNumber(value, 'Timeout', bounds.timeoutMilliseconds);
        break;
      case '--url':
        values.urls.push(value);
        break;
    }
  }

  if (values.urls.length === 0) values.urls = [...defaults.urls];
  const urls = values.urls.map((value) => validateUrl(value, allowRemote));
  const requestCount = values.mode === 'smoke' ? urls.length : values.requests;

  return {
    allowRemote,
    concurrency: Math.min(values.concurrency, requestCount),
    maxErrorRate: values.maxErrorRate,
    maxP95Milliseconds: values.maxP95Milliseconds,
    mode: values.mode,
    requestCount,
    timeoutMilliseconds: values.timeoutMilliseconds,
    urls,
  };
};

const percentile = (sortedValues, percentage) => {
  if (sortedValues.length === 0) return 0;
  const index = Math.max(0, Math.ceil((percentage / 100) * sortedValues.length) - 1);
  return sortedValues[Math.min(index, sortedValues.length - 1)];
};

const safeEndpoint = (url) => `${url.origin}${url.pathname}`;

const classifyFailure = (error) => {
  if (error instanceof DOMException && error.name === 'TimeoutError') return 'timeout';
  if (error instanceof TypeError) return 'network';
  return 'other';
};

const performRequest = async (url, timeoutMilliseconds, fetchImplementation) => {
  const startedAt = performance.now();
  try {
    const response = await fetchImplementation(url, {
      cache: 'no-store',
      headers: { accept: 'application/json', 'user-agent': 'local-wellness-v1-check/1' },
      method: 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMilliseconds),
    });
    await response.body?.cancel();
    return {
      durationMilliseconds: performance.now() - startedAt,
      failure: response.ok ? null : `status_${response.status}`,
    };
  } catch (error) {
    return {
      durationMilliseconds: performance.now() - startedAt,
      failure: classifyFailure(error),
    };
  }
};

export const runHttpCheck = async (options, fetchImplementation = fetch) => {
  const checkStartedAt = performance.now();
  const durations = [];
  const failures = new Map();
  let nextRequest = 0;

  const worker = async () => {
    while (true) {
      const requestIndex = nextRequest;
      nextRequest += 1;
      if (requestIndex >= options.requestCount) return;
      const url = options.urls[requestIndex % options.urls.length];
      const result = await performRequest(url, options.timeoutMilliseconds, fetchImplementation);
      durations.push(result.durationMilliseconds);
      if (result.failure) failures.set(result.failure, (failures.get(result.failure) ?? 0) + 1);
    }
  };

  await Promise.all(Array.from({ length: options.concurrency }, worker));
  const elapsedMilliseconds = performance.now() - checkStartedAt;
  durations.sort((left, right) => left - right);
  const failedRequests = [...failures.values()].reduce((total, count) => total + count, 0);
  const errorRate = failedRequests / options.requestCount;
  const p95Milliseconds = percentile(durations, 95);

  return {
    endpoints: options.urls.map(safeEndpoint),
    elapsedMilliseconds,
    errorRate,
    failedRequests,
    failureCounts: Object.fromEntries([...failures.entries()].sort()),
    maximumMilliseconds: durations.at(-1) ?? 0,
    p50Milliseconds: percentile(durations, 50),
    p95Milliseconds,
    p99Milliseconds: percentile(durations, 99),
    passed: errorRate <= options.maxErrorRate && p95Milliseconds <= options.maxP95Milliseconds,
    requests: options.requestCount,
    requestsPerSecond:
      elapsedMilliseconds === 0
        ? options.requestCount
        : options.requestCount / (elapsedMilliseconds / 1_000),
    successfulRequests: options.requestCount - failedRequests,
  };
};

const round = (value) => Math.round(value * 100) / 100;

export const formatHttpCheckResult = (result) =>
  JSON.stringify({
    endpoints: result.endpoints,
    elapsedMilliseconds: round(result.elapsedMilliseconds),
    errorRate: round(result.errorRate),
    failedRequests: result.failedRequests,
    failureCounts: result.failureCounts,
    maximumMilliseconds: round(result.maximumMilliseconds),
    p50Milliseconds: round(result.p50Milliseconds),
    p95Milliseconds: round(result.p95Milliseconds),
    p99Milliseconds: round(result.p99Milliseconds),
    passed: result.passed,
    requests: result.requests,
    requestsPerSecond: round(result.requestsPerSecond),
    successfulRequests: result.successfulRequests,
  });

const isMainModule =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
  try {
    const options = parseHttpCheckOptions(process.argv.slice(2));
    const result = await runHttpCheck(options);
    process.stdout.write(`${formatHttpCheckResult(result)}\n`);
    if (!result.passed) process.exitCode = 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'HTTP check configuration is invalid.';
    process.stderr.write(`${message}\n`);
    process.exitCode = 2;
  }
}
