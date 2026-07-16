import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import {
  formatSecretScanResult,
  scanRepositoryForSecrets,
  scanTextForSecrets,
} from '../scripts/check-secrets.mjs';

const temporaryDirectories = [];

const createTrackedTree = async (contents) => {
  const repository = await mkdtemp(path.join(tmpdir(), 'local-wellness-secret-scan-'));
  temporaryDirectories.push(repository);
  await writeFile(path.join(repository, 'configuration.txt'), contents, 'utf8');
  return repository;
};

const fakeGitRunner = (history) => (arguments_) => {
  if (arguments_[0] === 'ls-files') return 'configuration.txt\0';
  if (arguments_[0] === 'log') return history;
  throw new Error('Unexpected Git command in secret scanner test.');
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe('privacy-safe repository secret scan', () => {
  it('recognizes server secrets while omitting matched values from output', () => {
    const candidate = ['sb', 'secret', 'abcdefghijklmnopqrstuvwxyz123456'].join('_');
    const findings = [...scanTextForSecrets(candidate, 'tracked:fixture.txt').values()];
    const output = formatSecretScanResult(findings);

    assert.equal(findings.length, 1);
    assert.match(output, /Supabase server secret in tracked:fixture\.txt/u);
    assert.doesNotMatch(output, new RegExp(candidate, 'u'));
  });

  it('detects a service-role JWT without flagging a public-role JWT', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const signature = 'a'.repeat(32);
    const tokenForRole = (role) =>
      [header, Buffer.from(JSON.stringify({ role })).toString('base64url'), signature].join('.');

    const serviceFindings = [
      ...scanTextForSecrets(tokenForRole('service_role'), 'tracked:server.txt').values(),
    ];
    const publicFindings = [
      ...scanTextForSecrets(tokenForRole('anon'), 'tracked:client.txt').values(),
    ];

    assert.equal(serviceFindings[0]?.name, 'Supabase service-role JWT');
    assert.deepEqual(publicFindings, []);
  });

  it('passes a clean tracked tree and local history', async () => {
    const repository = await createTrackedTree('No credentials are stored here.\n');
    const findings = await scanRepositoryForSecrets(repository, {
      gitRunner: fakeGitRunner('A safe historical patch.\n'),
    });

    assert.deepEqual(findings, []);
  });

  it('finds tracked and removed historical secrets without returning their values', async () => {
    const trackedCandidate = ['sk', 'live', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234'].join('_');
    const historicalCandidate = ['ghp', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'].join('_');
    const repository = await createTrackedTree(`${trackedCandidate}\n`);
    const findings = await scanRepositoryForSecrets(repository, {
      gitRunner: fakeGitRunner(`-${historicalCandidate}\n`),
    });
    const output = formatSecretScanResult(findings);

    assert.ok(findings.some((finding) => finding.source === 'tracked:configuration.txt'));
    assert.ok(findings.some((finding) => finding.source === 'local Git history'));
    assert.doesNotMatch(output, new RegExp(trackedCandidate, 'u'));
    assert.doesNotMatch(output, new RegExp(historicalCandidate, 'u'));
  });

  it('reports a generic operational error without command or matched output', () => {
    const findings = [{ name: 'Supabase server secret', source: 'local Git history' }];
    const output = formatSecretScanResult(findings);

    assert.match(output, /potential secret finding/u);
    assert.match(output, /Matched values are intentionally omitted/u);
  });
});
