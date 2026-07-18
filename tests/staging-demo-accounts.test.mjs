import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertStagingProjectUrl,
  firstConfiguredEnvironmentValue,
  generateStagingPassword,
  isManagedStagingDemoUser,
  parseStagingDemoArguments,
  stagingDemoAccessMatrix,
  timestampsRepresentSameInstant,
} from '../scripts/provision-staging-demo-accounts.mjs';

test('requires an explicit hosted staging project acknowledgement and exact project ref', () => {
  assert.throws(
    () =>
      parseStagingDemoArguments([
        '--project-ref',
        'abcdefghijklmnopqrst',
        '--authority-name',
        'Reviewed authority',
      ]),
    /acknowledge-staging/u,
  );
  assert.deepEqual(
    parseStagingDemoArguments([
      '--',
      '--acknowledge-staging',
      '--project-ref',
      'abcdefghijklmnopqrst',
      '--authority-name',
      'Reviewed authority',
      '--expires-in-days',
      '14',
      '--rotate-existing-passwords',
    ]),
    {
      acknowledgeStaging: true,
      authorityName: 'Reviewed authority',
      expiresInDays: 14,
      projectRef: 'abcdefghijklmnopqrst',
      rotateExistingPasswords: true,
    },
  );
});

test('rejects a configured project whose hosted URL does not match the acknowledged ref', () => {
  assert.equal(
    assertStagingProjectUrl('https://abcdefghijklmnopqrst.supabase.co', 'abcdefghijklmnopqrst'),
    'abcdefghijklmnopqrst.supabase.co',
  );
  assert.throws(
    () =>
      assertStagingProjectUrl('https://differentprojectref1.supabase.co', 'abcdefghijklmnopqrst'),
    /does not match/u,
  );
  assert.throws(
    () =>
      assertStagingProjectUrl('http://abcdefghijklmnopqrst.supabase.co', 'abcdefghijklmnopqrst'),
    /does not match/u,
  );
  for (const unsafeUrl of [
    'https://abcdefghijklmnopqrst.supabase.co:8443',
    'https://abcdefghijklmnopqrst.supabase.co/rest/v1',
    'https://abcdefghijklmnopqrst.supabase.co?redirect=other',
    'https://abcdefghijklmnopqrst.supabase.co#other',
    'https://operator:secret@abcdefghijklmnopqrst.supabase.co',
  ]) {
    assert.throws(
      () => assertStagingProjectUrl(unsafeUrl, 'abcdefghijklmnopqrst'),
      /does not match/u,
    );
  }
});

test('uses the first non-blank configured credential value', () => {
  assert.equal(firstConfiguredEnvironmentValue('', '  ', ' legacy-key '), 'legacy-key');
  assert.equal(firstConfiguredEnvironmentValue(undefined, ''), undefined);
});

test('trusts only server-controlled metadata when rotating a managed demo account', () => {
  assert.equal(
    isManagedStagingDemoUser({
      app_metadata: {
        local_wellness_demo_account: true,
        local_wellness_demo_environment: 'staging',
        local_wellness_demo_version: 1,
      },
    }),
    true,
  );
  assert.equal(
    isManagedStagingDemoUser({ user_metadata: { local_wellness_demo_account: true } }),
    false,
  );
});

test('compares persisted timestamps by instant instead of transport formatting', () => {
  assert.equal(
    timestampsRepresentSameInstant('2026-08-17T10:00:00.000Z', '2026-08-17T15:30:00+05:30'),
    true,
  );
  assert.equal(
    timestampsRepresentSameInstant('2026-08-17T10:00:00.001Z', '2026-08-17T10:00:00.000Z'),
    false,
  );
  assert.equal(timestampsRepresentSameInstant(undefined, '2026-08-17T10:00:00.000Z'), false);
});

test('uses separate synthetic accounts and bounded reviewed scope selectors', () => {
  assert.equal(
    new Set(stagingDemoAccessMatrix.map((account) => account.emailLocalPart)).size,
    stagingDemoAccessMatrix.length,
  );
  assert.deepEqual(
    new Set(stagingDemoAccessMatrix.map((account) => account.roleCode)),
    new Set(['municipal_admin', 'government_operator', 'ward_officer', 'department_officer']),
  );
  assert.ok(stagingDemoAccessMatrix.every((account) => account.scopeType !== 'global'));
});

test('generates bounded, non-deterministic strong staging passwords', () => {
  const first = generateStagingPassword();
  const second = generateStagingPassword();
  assert.notEqual(first, second);
  assert.match(first, /^Aa1![A-Za-z0-9_-]{32}$/u);
  assert.ok(first.length <= 72);
});
