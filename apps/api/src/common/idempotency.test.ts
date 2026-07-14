import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createComplaintMutationIdentity } from './idempotency.js';

describe('complaint mutation identity', () => {
  it('does not retain the caller idempotency key', () => {
    const key = '018f8b20-7f64-7af1-9d90-123456789abc';
    const identity = createComplaintMutationIdentity(key, 'create-draft', { description: 'Road' });

    assert.equal(identity.idempotencyKeyHash.length, 64);
    assert.equal(identity.requestFingerprint.length, 64);
    assert.equal(JSON.stringify(identity).includes(key), false);
  });

  it('uses canonical object ordering while retaining request scope', () => {
    const key = '018f8b20-7f64-7af1-9d90-123456789abc';
    const first = createComplaintMutationIdentity(key, 'create-draft', { a: 1, b: 2 });
    const second = createComplaintMutationIdentity(key, 'create-draft', { b: 2, a: 1 });
    const differentScope = createComplaintMutationIdentity(key, 'submit', { a: 1, b: 2 });

    assert.deepEqual(first, second);
    assert.notEqual(first.requestFingerprint, differentScope.requestFingerprint);
  });
});
