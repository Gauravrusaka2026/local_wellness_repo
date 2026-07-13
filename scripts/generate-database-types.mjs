import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = join(repositoryRoot, 'packages/database/src/database.types.ts');
const checkOnly = process.argv.includes('--check');

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const details = result.stderr?.trim() || result.stdout?.trim() || 'Unknown command failure.';
    throw new Error(`${command} ${args.join(' ')} failed: ${details}`);
  }

  return result;
};

const temporaryDirectory = await mkdtemp(
  join(dirname(outputPath), '.local-wellness-database-types-'),
);
const temporaryPath = join(temporaryDirectory, basename(outputPath));

try {
  const generation = run('corepack', [
    'pnpm',
    'exec',
    'supabase',
    'gen',
    'types',
    'typescript',
    '--local',
    '--schema',
    'public,governance',
  ]);

  if (!generation.stdout.trim()) {
    throw new Error('Supabase generated an empty database type definition.');
  }

  await writeFile(temporaryPath, generation.stdout, 'utf8');
  run('corepack', ['pnpm', 'exec', 'prettier', '--write', temporaryPath]);

  const generated = await readFile(temporaryPath, 'utf8');

  if (checkOnly) {
    const committed = await readFile(outputPath, 'utf8');

    if (generated !== committed) {
      throw new Error(
        'Generated database types differ from packages/database/src/database.types.ts. Run `pnpm database:types` and commit the result.',
      );
    }

    process.stdout.write('Generated database types are current.\n');
  } else {
    await rename(temporaryPath, outputPath);
    process.stdout.write(`Updated ${outputPath}.\n`);
  }
} finally {
  await rm(temporaryDirectory, { force: true, recursive: true });
}
