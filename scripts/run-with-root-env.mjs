#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = resolve(dirname(scriptPath), '..');
const rootEnvironmentPath = resolve(repositoryRoot, '.env');
const appLocalEnvironmentFileNames = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.development.local',
  '.env.production',
  '.env.production.local',
  '.env.test',
  '.env.test.local',
];

export function loadEnvironmentFile(environmentPath = rootEnvironmentPath) {
  if (!existsSync(environmentPath)) {
    return false;
  }

  process.loadEnvFile(environmentPath);
  return true;
}

export function findAppLocalEnvironmentFiles(
  workingDirectory = process.cwd(),
  rootDirectory = repositoryRoot,
) {
  const normalizedWorkingDirectory = resolve(workingDirectory);
  if (normalizedWorkingDirectory === resolve(rootDirectory)) {
    return [];
  }

  return appLocalEnvironmentFileNames.filter((fileName) =>
    existsSync(resolve(normalizedWorkingDirectory, fileName)),
  );
}

export function assertNoAppLocalEnvironmentFiles(workingDirectory = process.cwd()) {
  const appLocalFiles = findAppLocalEnvironmentFiles(workingDirectory);
  if (appLocalFiles.length > 0) {
    throw new Error(
      `Remove app-local environment file(s) ${appLocalFiles.join(', ')}; use the repository-root .env or injected environment variables.`,
    );
  }
}

export function resolveExecutable(command) {
  return command === 'node' ? process.execPath : command;
}

export function runWithRootEnvironment(command, commandArguments = []) {
  if (!command) {
    throw new Error('A command is required after run-with-root-env.mjs.');
  }

  assertNoAppLocalEnvironmentFiles();
  loadEnvironmentFile();

  const executable = resolveExecutable(command);
  const child = spawn(executable, commandArguments, {
    env: process.env,
    stdio: 'inherit',
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      child.kill(signal);
    });
  }

  child.once('error', (error) => {
    console.error(`Unable to start ${command}: ${error.message}`);
    process.exitCode = 1;
  });

  child.once('exit', (exitCode, signal) => {
    process.exitCode = exitCode ?? (signal ? 1 : 0);
  });

  return child;
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  const [command, ...commandArguments] = process.argv.slice(2);

  try {
    runWithRootEnvironment(command, commandArguments);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
