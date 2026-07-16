import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDirectory = join(repositoryRoot, 'supabase/migrations');
const outputPath = join(repositoryRoot, 'supabase/master.sql');
const checkOnly = process.argv.includes('--check');

const migrationNames = (await readdir(migrationsDirectory))
  .filter((name) => /^\d{14}_[a-z0-9_]+\.sql$/u.test(name))
  .sort((left, right) => left.localeCompare(right));

if (migrationNames.length === 0) {
  throw new Error(`No SQL migrations found in ${migrationsDirectory}.`);
}

const migrations = await Promise.all(
  migrationNames.map(async (name) => {
    const sql = await readFile(join(migrationsDirectory, name), 'utf8');

    if (!sql.trim()) {
      throw new Error(`Migration ${name} is empty.`);
    }

    return {
      name,
      sha256: createHash('sha256').update(sql).digest('hex'),
      sql: sql.endsWith('\n') ? sql : `${sql}\n`,
    };
  }),
);

const generatedAt = migrationNames.at(-1)?.slice(0, 8);
const header = `-- Local Wellness Supabase master migration
--
-- Generated deterministically from supabase/migrations/*.sql by:
--   pnpm database:master:generate
--
-- This artifact is for bootstrapping an empty Supabase/PostgreSQL database.
-- Do not place it in supabase/migrations or apply it after the incremental
-- migrations. Seed data remains intentionally separate under supabase/seed.
-- Source migration cutoff: ${generatedAt}
-- Source migration count: ${migrations.length}
--
-- Source manifest (SHA-256 of the exact source file bytes):
${migrations.map(({ name, sha256 }) => `-- ${sha256}  ${name}`).join('\n')}
`;

const body = migrations
  .map(
    ({ name, sql }) => `
-- ============================================================================
-- BEGIN SOURCE MIGRATION: ${name}
-- ============================================================================
begin;

${sql}
commit;
-- ============================================================================
-- END SOURCE MIGRATION: ${name}
-- ============================================================================
`,
  )
  .join('');
const generated = `${header}${body}`;

if (checkOnly) {
  const committed = await readFile(outputPath, 'utf8').catch(() => null);

  if (committed !== generated) {
    throw new Error(
      'supabase/master.sql is missing or stale. Run `pnpm database:master:generate`.',
    );
  }

  process.stdout.write(`Master migration is current (${migrations.length} source migrations).\n`);
} else {
  await writeFile(outputPath, generated, 'utf8');
  process.stdout.write(`Updated ${outputPath} from ${migrations.length} source migrations.\n`);
}
