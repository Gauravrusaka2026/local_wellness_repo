import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import {
  assertNoAppLocalEnvironmentFiles,
  findAppLocalEnvironmentFiles,
  loadEnvironmentFile,
  resolveExecutable,
} from '../scripts/run-with-root-env.mjs';

const temporaryDirectories = [];
const variablesToRestore = new Map();

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }

  for (const [name, value] of variablesToRestore) {
    if (value === undefined) {
      Reflect.deleteProperty(process.env, name);
    } else {
      process.env[name] = value;
    }
  }

  variablesToRestore.clear();
});

function rememberEnvironmentVariable(name) {
  if (!variablesToRestore.has(name)) {
    variablesToRestore.set(name, process.env[name]);
  }
}

test('loads a present environment file', () => {
  const directory = mkdtempSync(join(tmpdir(), 'local-wellness-env-'));
  const environmentPath = join(directory, '.env');
  const variableName = 'LOCAL_WELLNESS_ENV_RUNNER_TEST';
  temporaryDirectories.push(directory);
  rememberEnvironmentVariable(variableName);
  Reflect.deleteProperty(process.env, variableName);
  writeFileSync(environmentPath, `${variableName}=loaded\n`, 'utf8');

  assert.equal(loadEnvironmentFile(environmentPath), true);
  assert.equal(process.env[variableName], 'loaded');
});

test('preserves deployment-injected environment variables', () => {
  const directory = mkdtempSync(join(tmpdir(), 'local-wellness-env-'));
  const environmentPath = join(directory, '.env');
  const variableName = 'LOCAL_WELLNESS_ENV_PRECEDENCE_TEST';
  temporaryDirectories.push(directory);
  rememberEnvironmentVariable(variableName);
  process.env[variableName] = 'injected';
  writeFileSync(environmentPath, `${variableName}=file\n`, 'utf8');

  assert.equal(loadEnvironmentFile(environmentPath), true);
  assert.equal(process.env[variableName], 'injected');
});

test('allows CI and deployments to omit the local root environment file', () => {
  const directory = mkdtempSync(join(tmpdir(), 'local-wellness-env-'));
  temporaryDirectories.push(directory);

  assert.equal(loadEnvironmentFile(join(directory, '.env')), false);
});

test('rejects app-local environment files without rejecting an example', () => {
  const directory = mkdtempSync(join(tmpdir(), 'local-wellness-env-'));
  temporaryDirectories.push(directory);
  writeFileSync(join(directory, '.env.example'), 'SAFE_EXAMPLE=\n', 'utf8');
  writeFileSync(join(directory, '.env.local'), 'FORBIDDEN=value\n', 'utf8');

  assert.deepEqual(findAppLocalEnvironmentFiles(directory), ['.env.local']);
  assert.throws(
    () => assertNoAppLocalEnvironmentFiles(directory),
    /Remove app-local environment file\(s\) \.env\.local/u,
  );
});

test('uses the current Node executable for portable JavaScript entry points', () => {
  assert.equal(resolveExecutable('node'), process.execPath);
  assert.equal(resolveExecutable('/usr/local/bin/custom-command'), '/usr/local/bin/custom-command');
});
