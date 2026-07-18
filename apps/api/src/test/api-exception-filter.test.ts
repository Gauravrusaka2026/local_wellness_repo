import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ApiException } from '../common/api-exception.js';
import { getSafeFailureSource, stripQueryString } from '../common/api-exception.filter.js';
import { ComplaintDataAccessError } from '../data/complaint.store.js';
import { IdentityDataAccessError } from '../data/identity.store.js';
import { RateLimitDataAccessError } from '../data/rate-limit.store.js';
import { RoutingDataAccessError } from '../data/routing.store.js';

describe('API exception diagnostics', () => {
  it('reports only allow-listed dependency operation labels', () => {
    assert.equal(
      getSafeFailureSource(new ComplaintDataAccessError('submit complaint', 'PGRST202')),
      'complaint:submit complaint:PGRST202',
    );
    assert.equal(
      getSafeFailureSource(new RoutingDataAccessError('record routing decision')),
      'routing:record routing decision',
    );
    assert.equal(
      getSafeFailureSource(new IdentityDataAccessError('find active access')),
      'identity:find active access',
    );
    assert.equal(
      getSafeFailureSource(new RateLimitDataAccessError('57014')),
      'rate-limit:consume quota:57014',
    );
    assert.equal(
      getSafeFailureSource(ApiException.dependencyUnavailable('private detail')),
      'api:DEPENDENCY_UNAVAILABLE',
    );
    assert.equal(
      getSafeFailureSource(new ComplaintDataAccessError('submit complaint', 'private detail')),
      'complaint:submit complaint',
    );
    assert.equal(getSafeFailureSource(new Error('sensitive unknown detail')), null);
  });

  it('removes query strings from logged request paths', () => {
    assert.equal(stripQueryString('/api/v1/complaints?cursor=private'), '/api/v1/complaints');
  });
});
