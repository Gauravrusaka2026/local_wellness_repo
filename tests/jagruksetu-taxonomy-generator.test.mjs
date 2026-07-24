import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const taxonomyPath = 'resources/JAGRUKSETU_COMPLAINT_TAXONOMY_V1.md';
const migrationPath = 'supabase/migrations/20260723120000_jagruksetu_complaint_taxonomy.sql';
const seedPath = 'supabase/seed/55_jagruksetu_complaint_taxonomy.generated.sql';
const deploymentPath = 'supabase/deploy/jagruksetu-complaint-taxonomy-v1.sql';

test('JagrukSetu taxonomy artifacts pin the current source', async () => {
  const [taxonomy, seed, deployment] = await Promise.all([
    readFile(taxonomyPath, 'utf8'),
    readFile(seedPath, 'utf8'),
    readFile(deploymentPath, 'utf8'),
  ]);
  const sourceSha256 = createHash('sha256').update(taxonomy).digest('hex');

  assert.match(seed, new RegExp(`Source SHA-256: ${sourceSha256}`, 'u'));
  assert.match(deployment, new RegExp(`Taxonomy source SHA-256: ${sourceSha256}`, 'u'));
});

test('JagrukSetu taxonomy source and seed preserve the complete protected hierarchy', async () => {
  const [taxonomy, seed] = await Promise.all([
    readFile(taxonomyPath, 'utf8'),
    readFile(seedPath, 'utf8'),
  ]);

  assert.match(
    taxonomy,
    /17 primary categories, 20 subcategories per category, 340 total subcategories, and 19 primary workflow types/u,
  );
  assert.equal((seed.match(/'taxonomy_primary',\n {4}'[A-Z]{3}'/gu) ?? []).length, 17);
  assert.equal(
    (seed.match(/'taxonomy_subcategory',\n {4}'[A-Z]{3}-[0-9]{3}'/gu) ?? []).length,
    340,
  );
  assert.equal((seed.match(/'mapped',\n/gu) ?? []).length, 13);
  assert.equal((seed.match(/'COR-[0-9]{3}'/gu) ?? []).length, 20);
  assert.match(seed, /JAGRUKSETU_CORRUPTION_PROTECTION_INVALID/u);
  assert.doesNotMatch(seed, /'COR-[0-9]{3}'[\s\S]{0,800}ward_issue_contacts/u);
});

test('taxonomy migration isolates operational profiles and revalidates selection at submission', async () => {
  const migration = await readFile(migrationPath, 'utf8');

  assert.match(
    migration,
    /where category\.category_purpose = 'routing_profile'[\s\S]*public\.list_complaint_taxonomy/u,
  );
  assert.match(
    migration,
    /create function complaints\.assert_taxonomy_selection\([\s\S]*create trigger complaints_validate_taxonomy_on_submission/u,
  );
  assert.match(migration, /JAGRUKSETU_CORRUPTION_INTAKE_MUST_REMAIN_PROTECTED/u);
  assert.match(
    migration,
    /revoke all on function public\.list_complaint_taxonomy\(\)[\s\S]*grant execute on function public\.list_complaint_taxonomy\(\) to service_role/u,
  );
});

test('SQL Editor deployment embeds the exact migration before the generated seed', async () => {
  const [migration, seed, deployment] = await Promise.all([
    readFile(migrationPath, 'utf8'),
    readFile(seedPath, 'utf8'),
    readFile(deploymentPath, 'utf8'),
  ]);

  const migrationStart = deployment.indexOf('-- BEGIN EXACT SOURCE: taxonomy migration\n');
  const migrationEnd = deployment.indexOf('-- END EXACT SOURCE: taxonomy migration\n');
  const seedStart = deployment.indexOf('-- BEGIN EXACT SOURCE: taxonomy seed\n');
  const seedEnd = deployment.indexOf('-- END EXACT SOURCE: taxonomy seed\n');

  assert.ok(migrationStart >= 0 && migrationEnd > migrationStart);
  assert.ok(seedStart > migrationEnd && seedEnd > seedStart);
  assert.equal(
    deployment.slice(
      migrationStart + '-- BEGIN EXACT SOURCE: taxonomy migration\n'.length,
      migrationEnd,
    ),
    migration,
  );
  assert.equal(
    deployment.slice(seedStart + '-- BEGIN EXACT SOURCE: taxonomy seed\n'.length, seedEnd),
    seed,
  );
});
