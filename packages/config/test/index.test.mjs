import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ConfigurationError,
  firstConfiguredValue,
  parseApiConfiguration,
  parsePublicHttpUrl,
  parsePublicSupabaseConfiguration,
} from '../dist/index.js';

test('configuration aliases ignore empty preferred values', () => {
  assert.equal(firstConfiguredValue('', '  ', 'legacy-key'), 'legacy-key');
  assert.equal(firstConfiguredValue(' preferred-key ', 'legacy-key'), ' preferred-key ');
  assert.equal(firstConfiguredValue(undefined, ''), undefined);
});

test('public Supabase configuration accepts only complete HTTP configuration', () => {
  assert.deepEqual(
    parsePublicSupabaseConfiguration({
      anonKey: 'publishable-key',
      url: 'https://example.supabase.co/',
    }),
    {
      anonKey: 'publishable-key',
      url: 'https://example.supabase.co',
    },
  );

  assert.throws(
    () => parsePublicSupabaseConfiguration({ anonKey: '', url: 'https://example.com' }),
    ConfigurationError,
  );
  assert.throws(
    () => parsePublicSupabaseConfiguration({ anonKey: 'key', url: 'file:///tmp/database' }),
    /HTTP\(S\)/,
  );
});

test('public HTTP URL configuration normalizes a trailing slash', () => {
  assert.equal(parsePublicHttpUrl('http://localhost:3001/'), 'http://localhost:3001');
});

test('API configuration validates server-only values without including them in errors', () => {
  const configuration = parseApiConfiguration({
    allowedOrigins: 'http://localhost:3000,http://localhost:3003,http://localhost:3000',
    governmentInviteRedirectUrl: 'http://localhost:3003/auth/callback',
    port: '3001',
    supabaseAnonKey: 'anon-value',
    supabaseServiceRoleKey: 'service-secret',
    supabaseUrl: 'http://127.0.0.1:54321',
  });

  assert.equal(configuration.port, 3001);
  assert.deepEqual(configuration.allowedOrigins, [
    'http://localhost:3000',
    'http://localhost:3003',
  ]);
  assert.equal(configuration.supabase.serviceRoleKey, 'service-secret');

  assert.throws(
    () =>
      parseApiConfiguration({
        allowedOrigins: 'http://localhost:3000',
        governmentInviteRedirectUrl: 'http://localhost:3003/auth/callback',
        port: '70000',
        supabaseAnonKey: 'anon-value',
        supabaseServiceRoleKey: 'do-not-print-this',
        supabaseUrl: 'http://127.0.0.1:54321',
      }),
    (error) => error instanceof ConfigurationError && !error.message.includes('do-not-print-this'),
  );
});
