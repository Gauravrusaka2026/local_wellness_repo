import assert from 'node:assert/strict';
import test from 'node:test';
import { ConfigurationError } from '@local-wellness/config';

import {
  assertNativeUrlIsReachable,
  assertSupabaseProjectAlignment,
  getPublicPhoneMfaMode,
  isLoopbackUrl,
} from '../src/config/environment';

const jwtForProject = (projectReference: string): string => {
  const payload = Buffer.from(JSON.stringify({ ref: projectReference, role: 'anon' })).toString(
    'base64url',
  );
  return `header.${payload}.signature`;
};

test('accepts aligned Supabase configuration and opaque publishable keys', () => {
  assert.doesNotThrow(() =>
    assertSupabaseProjectAlignment({
      anonKey: jwtForProject('alignedproject'),
      url: 'https://alignedproject.supabase.co',
    }),
  );
  assert.doesNotThrow(() =>
    assertSupabaseProjectAlignment({
      anonKey: 'sb_publishable_opaque-key-without-project-metadata',
      url: 'https://alignedproject.supabase.co',
    }),
  );
});

test('rejects a detectable Supabase URL and public-key project mismatch without exposing values', () => {
  assert.throws(
    () =>
      assertSupabaseProjectAlignment({
        anonKey: jwtForProject('differentproject'),
        url: 'https://alignedproject.supabase.co',
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConfigurationError);
      assert.match(error.message, /belong to different projects/i);
      assert.doesNotMatch(error.message, /alignedproject|differentproject|header/u);
      return true;
    },
  );
});

test('blocks loopback service URLs for native mobile runtimes', () => {
  for (const value of [
    'http://localhost:3001',
    'http://api.localhost:3001',
    'http://127.0.0.1:3001',
    'http://127.10.20.30:3001',
    'http://[::1]:3001',
  ]) {
    assert.equal(isLoopbackUrl(value), true);
    assert.throws(
      () => assertNativeUrlIsReachable(value, 'EXPO_PUBLIC_API_URL', { isNativeRuntime: true }),
      ConfigurationError,
    );
    assert.doesNotThrow(() =>
      assertNativeUrlIsReachable(value, 'EXPO_PUBLIC_API_URL', { isNativeRuntime: false }),
    );
  }

  assert.equal(isLoopbackUrl('http://192.168.1.20:3001'), false);
  assert.doesNotThrow(() =>
    assertNativeUrlIsReachable('http://192.168.1.20:3001', 'EXPO_PUBLIC_API_URL', {
      isNativeRuntime: true,
    }),
  );
});

test('keeps phone MFA staged in observe mode until the SMS provider is configured', () => {
  assert.equal(getPublicPhoneMfaMode(undefined), 'observe');
  assert.equal(getPublicPhoneMfaMode(' enforce '), 'enforce');
  assert.throws(() => getPublicPhoneMfaMode('disabled'), ConfigurationError);
});
