import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const authFlowPath = fileURLToPath(new URL('./auth-flow.e2e.test.mjs', import.meta.url));

test('required local Auth E2E refuses a hosted Supabase URL before running tests', () => {
  const result = spawnSync(process.execPath, [authFlowPath], {
    encoding: 'utf8',
    env: {
      ...process.env,
      ANON_KEY: 'test-public-key',
      API_URL: 'https://example.supabase.co',
      REQUIRE_LOCAL_SUPABASE: 'true',
      SERVICE_ROLE_KEY: 'test-server-key',
    },
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /REQUIRE_LOCAL_SUPABASE=true refuses the non-loopback Supabase host example\.supabase\.co/,
  );
});
