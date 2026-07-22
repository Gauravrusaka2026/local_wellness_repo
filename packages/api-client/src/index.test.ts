import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ApiClientError, createApiClient, type ApiFetch } from './index.js';

const response = (status: number, payload: unknown): Response =>
  ({
    json: async () => payload,
    ok: status >= 200 && status < 300,
    status,
  }) as Response;

const decodeName = (value: unknown): string => {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('name' in value) ||
    typeof value.name !== 'string'
  ) {
    throw new TypeError('Invalid name response.');
  }

  return value.name;
};

describe('LocalWellnessApiClient', () => {
  it('sends authenticated JSON and decodes a valid success envelope', async () => {
    const calls: Array<{ input: string; init: RequestInit | undefined }> = [];
    const fetch: ApiFetch = async (input, init) => {
      calls.push({ input, init });
      return response(200, {
        data: { name: 'Asha' },
        meta: { requestId: 'request-1' },
      });
    };
    const client = createApiClient({
      baseUrl: 'https://api.example.test/',
      fetch,
      getAccessToken: async () => 'access-token',
    });

    const name = await client.post(
      '/api/v1/complaints/drafts',
      { description: 'Broken light' },
      {
        decode: decodeName,
        idempotencyKey: '018f8b20-7f64-7af1-9d90-123456789abc',
      },
    );

    assert.equal(name, 'Asha');
    assert.equal(calls[0]?.input, 'https://api.example.test/api/v1/complaints/drafts');
    assert.equal(calls[0]?.init?.method, 'POST');
    assert.deepEqual(calls[0]?.init?.headers, {
      Accept: 'application/json',
      Authorization: 'Bearer access-token',
      'Content-Type': 'application/json',
      'Idempotency-Key': '018f8b20-7f64-7af1-9d90-123456789abc',
    });
    assert.equal(calls[0]?.init?.body, JSON.stringify({ description: 'Broken light' }));
  });

  it('supports GET, PATCH, and DELETE with an injected AbortSignal', async () => {
    const methods: string[] = [];
    const signals: Array<AbortSignal | null | undefined> = [];
    const fetch: ApiFetch = async (_input, init) => {
      methods.push(init?.method ?? '');
      signals.push(init?.signal);
      return response(200, { data: { name: 'ok' }, meta: { requestId: 'request-2' } });
    };
    const client = createApiClient({
      baseUrl: 'http://localhost:3001',
      fetch,
      getAccessToken: () => 'access-token',
    });
    const controller = new AbortController();
    const options = { decode: decodeName, signal: controller.signal };

    await client.get('/api/v1/complaints', options);
    await client.patch('/api/v1/complaints/drafts/1', {}, options);
    await client.delete('/api/v1/complaints/drafts/1', options);

    assert.deepEqual(methods, ['GET', 'PATCH', 'DELETE']);
    assert.deepEqual(signals, [controller.signal, controller.signal, controller.signal]);
  });

  it('forwards idempotency keys for every replay-safe complaint creation operation', async () => {
    const requests: Array<{ path: string; key: string | undefined }> = [];
    const fetch: ApiFetch = async (input, init) => {
      const headers = init?.headers as Record<string, string> | undefined;
      requests.push({ path: input, key: headers?.['Idempotency-Key'] });
      return response(200, { data: { name: 'ok' }, meta: { requestId: 'request-replay' } });
    };
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      fetch,
      getAccessToken: () => 'access-token',
    });
    const paths = [
      '/api/v1/complaints/drafts',
      '/api/v1/media/upload-intents',
      '/api/v1/complaints/11111111-1111-4111-8111-111111111111/submit',
    ] as const;

    for (const [index, path] of paths.entries()) {
      await client.post(
        path,
        {},
        {
          decode: decodeName,
          idempotencyKey: `complaint-operation-${index.toString().padStart(2, '0')}`,
        },
      );
    }

    assert.deepEqual(
      requests.map(({ key }) => key),
      ['complaint-operation-00', 'complaint-operation-01', 'complaint-operation-02'],
    );
  });

  it('decodes safe API errors without trusting malformed detail values', async () => {
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      fetch: async () =>
        response(409, {
          error: {
            code: 'IDEMPOTENCY_CONFLICT',
            details: { field: 'idempotencyKey' },
            message: 'The idempotency key was used for another request.',
          },
          meta: { requestId: 'request-3' },
        }),
      getAccessToken: () => 'access-token',
    });

    await assert.rejects(
      client.post('/api/v1/complaints/draft/submit', {}, { decode: decodeName }),
      (error: unknown) => {
        assert.ok(error instanceof ApiClientError);
        assert.equal(error.code, 'IDEMPOTENCY_CONFLICT');
        assert.equal(error.status, 409);
        assert.equal(error.requestId, 'request-3');
        assert.deepEqual(error.details, { field: 'idempotencyKey' });
        return true;
      },
    );
  });

  it('accepts a valid success envelope without diagnostic request metadata', async () => {
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      fetch: async () => response(200, { data: { name: 'Asha' } }),
      getAccessToken: () => 'access-token',
    });

    await assert.doesNotReject(async () => {
      assert.equal(await client.get('/api/v1/me', { decode: decodeName }), 'Asha');
    });
  });

  it('rejects malformed success envelopes and decoded payloads', async () => {
    for (const payload of [
      { meta: { requestId: 'request-4' } },
      { data: { unexpected: true }, meta: { requestId: 'request-4' } },
    ]) {
      const client = createApiClient({
        baseUrl: 'https://api.example.test',
        fetch: async () => response(200, payload),
        getAccessToken: () => 'access-token',
      });

      await assert.rejects(
        client.get('/api/v1/me', { decode: decodeName }),
        (error: unknown) => error instanceof ApiClientError && error.code === 'INVALID_RESPONSE',
      );
    }
  });

  it('rejects missing sessions, unsafe paths, and malformed idempotency keys before fetch', async () => {
    let fetchCalls = 0;
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      fetch: async () => {
        fetchCalls += 1;
        return response(200, { data: { name: 'Asha' }, meta: { requestId: 'request-5' } });
      },
      getAccessToken: () => '',
    });

    await assert.rejects(
      client.get('/api/v1/me', { decode: decodeName }),
      (error: unknown) => error instanceof ApiClientError && error.code === 'AUTH_REQUIRED',
    );
    await assert.rejects(
      client.request('//attacker.example', { decode: decodeName }),
      /origin-relative/u,
    );
    await assert.rejects(
      client.post('/api/v1/complaints/drafts', {}, { decode: decodeName, idempotencyKey: 'short' }),
      /invalid format/u,
    );
    assert.equal(fetchCalls, 0);
  });

  it('distinguishes cancellation from other network failures', async () => {
    const controller = new AbortController();
    controller.abort();
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      fetch: async () => {
        throw new Error('aborted');
      },
      getAccessToken: () => 'access-token',
    });

    await assert.rejects(
      client.get('/api/v1/complaints', { decode: decodeName, signal: controller.signal }),
      (error: unknown) => error instanceof ApiClientError && error.code === 'REQUEST_ABORTED',
    );
  });

  it('rejects unsafe API base URLs', () => {
    assert.throws(
      () =>
        createApiClient({
          baseUrl: 'https://user:secret@api.example.test',
          getAccessToken: () => 'access-token',
        }),
      /valid HTTP/u,
    );
  });
});
