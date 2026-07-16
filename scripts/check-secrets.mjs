#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { lstat, readFile, readlink } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const maximumGitOutputBytes = 128 * 1024 * 1024;
const maximumTrackedFileBytes = 8 * 1024 * 1024;

const secretPatterns = [
  {
    name: 'AWS access key',
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/gu,
  },
  {
    name: 'GitHub access token',
    pattern: /\bgh(?:p|o|u|s|r)_[A-Za-z0-9]{30,255}\b/gu,
  },
  {
    name: 'Google API key',
    pattern: /\bAIza[A-Za-z0-9_-]{35}\b/gu,
  },
  {
    name: 'Private key',
    pattern: /-----BEGIN (?:EC |OPENSSH |PGP |RSA )?PRIVATE KEY-----/gu,
  },
  {
    name: 'SendGrid API key',
    pattern: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{20,}\b/gu,
  },
  {
    name: 'Slack access token',
    pattern: /\bxox(?:a|b|p|r|s)-[A-Za-z0-9-]{20,}\b/gu,
  },
  {
    name: 'Stripe live secret',
    pattern: /\bsk_live_[A-Za-z0-9]{20,}\b/gu,
  },
  {
    name: 'Supabase server secret',
    pattern: /\bsb_secret_[A-Za-z0-9_-]{20,}\b/gu,
  },
  {
    name: 'Credential-bearing PostgreSQL URL',
    pattern: /\bpostgres(?:ql)?:\/\/[^\s:@/'"<>]+:[^\s@/'"<>]{8,}@[A-Za-z0-9.-]+/gu,
  },
];

const jwtPattern = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{20,}\b/gu;

const runGit = (arguments_, options = {}) => {
  const result = spawnSync('git', arguments_, {
    cwd: options.cwd,
    encoding: options.encoding ?? 'utf8',
    maxBuffer: maximumGitOutputBytes,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`git ${arguments_[0] ?? 'command'} failed.`);
  }

  return result.stdout;
};

const decodeJwtPayload = (token) => {
  try {
    const encodedPayload = token.split('.')[1];
    if (!encodedPayload) return null;
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    return typeof payload === 'object' && payload !== null ? payload : null;
  } catch {
    return null;
  }
};

const fingerprint = (value) => createHash('sha256').update(value).digest('hex');

const addFinding = (findings, name, source, value) => {
  const key = `${name}:${source}:${fingerprint(value)}`;
  if (!findings.has(key)) findings.set(key, { name, source });
};

export const scanTextForSecrets = (text, source, findings = new Map()) => {
  for (const { name, pattern } of secretPatterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const value = match[0];
      if (value) addFinding(findings, name, source, value);
    }
  }

  jwtPattern.lastIndex = 0;
  for (const match of text.matchAll(jwtPattern)) {
    const value = match[0];
    const payload = value ? decodeJwtPayload(value) : null;
    if (value && payload?.role === 'service_role') {
      addFinding(findings, 'Supabase service-role JWT', source, value);
    }
  }

  return findings;
};

const readTrackedPath = async (repositoryRoot, relativePath) => {
  const absolutePath = path.resolve(repositoryRoot, relativePath);
  const repositoryPrefix = `${path.resolve(repositoryRoot)}${path.sep}`;

  if (!absolutePath.startsWith(repositoryPrefix)) {
    throw new Error('Git returned a tracked path outside the repository.');
  }

  const metadata = await lstat(absolutePath);
  if (metadata.isSymbolicLink()) {
    return Buffer.from(await readlink(absolutePath), 'utf8');
  }
  if (!metadata.isFile()) return null;
  if (metadata.size > maximumTrackedFileBytes) {
    throw new Error('A tracked file exceeds the bounded secret-scan size limit.');
  }
  return readFile(absolutePath);
};

export const scanTrackedFiles = async (
  repositoryRoot,
  findings = new Map(),
  gitRunner = runGit,
) => {
  const output = gitRunner(['ls-files', '-z'], { cwd: repositoryRoot });
  const paths = output.split('\0').filter(Boolean);

  for (const relativePath of paths) {
    let bytes;
    try {
      bytes = await readTrackedPath(repositoryRoot, relativePath);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }

    if (!bytes) continue;
    scanTextForSecrets(bytes.toString('utf8'), `tracked:${relativePath}`, findings);
  }

  return findings;
};

export const scanLocalGitHistory = (repositoryRoot, findings = new Map(), gitRunner = runGit) => {
  const history = gitRunner(
    ['log', '--all', '--full-history', '--format=%B', '--no-ext-diff', '--no-renames', '--patch'],
    { cwd: repositoryRoot },
  );
  scanTextForSecrets(history, 'local Git history', findings);
  return findings;
};

export const scanRepositoryForSecrets = async (
  repositoryRoot = process.cwd(),
  dependencies = {},
) => {
  const gitRunner = dependencies.gitRunner ?? runGit;
  const findings = await scanTrackedFiles(repositoryRoot, new Map(), gitRunner);
  scanLocalGitHistory(repositoryRoot, findings, gitRunner);
  return [...findings.values()].sort(
    (left, right) => left.source.localeCompare(right.source) || left.name.localeCompare(right.name),
  );
};

export const formatSecretScanResult = (findings) => {
  if (findings.length === 0) {
    return 'Secret scan passed: tracked files and all locally available Git history are clear.';
  }

  const lines = findings.map((finding) => `- ${finding.name} in ${finding.source}`);
  return [
    `Secret scan failed: ${findings.length} potential secret finding(s).`,
    ...lines,
    'Matched values are intentionally omitted. Review and rotate affected credentials before release.',
  ].join('\n');
};

const isMainModule =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
  try {
    const findings = await scanRepositoryForSecrets();
    const output = formatSecretScanResult(findings);
    (findings.length === 0 ? process.stdout : process.stderr).write(`${output}\n`);
    if (findings.length > 0) process.exitCode = 1;
  } catch {
    process.stderr.write(
      'Secret scan could not complete. No matched values or command output were printed.\n',
    );
    process.exitCode = 2;
  }
}
