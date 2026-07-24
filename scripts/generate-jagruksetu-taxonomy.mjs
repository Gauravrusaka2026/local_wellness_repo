import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const taxonomyPath = join(repositoryRoot, 'resources/JAGRUKSETU_COMPLAINT_TAXONOMY_V1.md');
const migrationPath = join(
  repositoryRoot,
  'supabase/migrations/20260723120000_jagruksetu_complaint_taxonomy.sql',
);
const seedPath = join(
  repositoryRoot,
  'supabase/seed/55_jagruksetu_complaint_taxonomy.generated.sql',
);
const deploymentPath = join(repositoryRoot, 'supabase/deploy/jagruksetu-complaint-taxonomy-v1.sql');
const checkOnly = process.argv.includes('--check');

const stableUuidNamespace = '629dcde9-7590-5ee2-99db-8b1479e2b52c';
const taxonomyDomainId = 'bdd72734-12ce-56fb-85a1-f5e6481c69ce';

const mappedRoutingProfiles = Object.freeze(
  new Map([
    ['SWM-001', 'garbage_dump'],
    ['SWM-004', 'missed_sweeping'],
    ['RDS-001', 'pothole'],
    ['DRN-001', 'blocked_drain'],
    ['DRN-002', 'sewage_overflow'],
    ['DRN-003', 'sewage_overflow'],
    ['WTR-001', 'water_leakage'],
    ['ELE-001', 'broken_streetlight'],
    ['DRN-004', 'open_manhole'],
    ['HLT-001', 'mosquito_breeding'],
    ['BLD-001', 'illegal_construction'],
    ['BLD-002', 'encroachment'],
    ['ENV-001', 'fallen_tree'],
  ]),
);

const expectedWorkflowTypes = Object.freeze(
  new Set([
    'MAINTENANCE',
    'SERVICE_FAILURE',
    'PUBLIC_HEALTH',
    'ENVIRONMENTAL',
    'ENFORCEMENT',
    'SAFETY_HAZARD',
    'EMERGENCY',
    'FACILITY_SERVICE',
    'LAW_AND_ORDER',
    'CRIME_REPORT',
    'CYBER_INCIDENT',
    'WELFARE_PROTECTION',
    'ADMINISTRATIVE_GRIEVANCE',
    'CONSUMER_REGULATORY',
    'TRANSPORT_SERVICE',
    'DISASTER_RESPONSE',
    'INFORMATION_ACCESS',
    'ANIMAL_WELFARE',
    'ANTI_CORRUPTION',
  ]),
);

const privatePrimaryCodes = new Set(['COR', 'LAW', 'SOC']);
const restrictedPrimaryCodes = new Set(['ADM', 'BLD', 'REG']);
const privateWorkflowTypes = new Set([
  'CRIME_REPORT',
  'CYBER_INCIDENT',
  'LAW_AND_ORDER',
  'WELFARE_PROTECTION',
  'ANTI_CORRUPTION',
]);

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const repositoryPath = (path) => relative(repositoryRoot, path).replaceAll('\\', '/');
const ensureTrailingNewline = (value) => (value.endsWith('\n') ? value : `${value}\n`);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const sqlText = (value) => `'${value.replaceAll("'", "''")}'`;
const sqlNullableText = (value) => (value === null ? 'null' : sqlText(value));
const sqlBoolean = (value) => (value ? 'true' : 'false');
const uuidBytes = (value) => Buffer.from(value.replaceAll('-', ''), 'hex');
const formatUuid = (value) => {
  const hex = value.toString('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)]
    .join('-')
    .toLowerCase();
};
const stableUuid = (kind, naturalKey) => {
  const digest = createHash('sha1')
    .update(uuidBytes(stableUuidNamespace))
    .update(Buffer.from(`${kind}:${naturalKey}`, 'utf8'))
    .digest()
    .subarray(0, 16);
  digest[6] = ((digest[6] ?? 0) & 0x0f) | 0x50;
  digest[8] = ((digest[8] ?? 0) & 0x3f) | 0x80;
  return formatUuid(digest);
};

const parseTaxonomy = (markdown) => {
  assert(
    markdown.includes(
      '**Coverage:** 17 primary categories, 20 subcategories per category, 340 total subcategories, and 19 primary workflow types.',
    ),
    'Taxonomy coverage declaration must be 17 primary categories, 340 subcategories, and 19 workflows.',
  );

  const lines = markdown.split(/\r?\n/u);
  const categories = [];
  let currentHeading = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const headingMatch = /^## \d+\. (.+)$/u.exec(line);
    if (headingMatch !== null) {
      currentHeading = headingMatch[1]?.trim() ?? null;
      continue;
    }

    const codeMatch = /^\*\*Primary category code:\*\* `([A-Z]{3})` {2}$/u.exec(line);
    if (codeMatch === null) {
      continue;
    }

    assert(currentHeading !== null, `Primary ${codeMatch[1]} has no section heading.`);
    const primaryCode = codeMatch[1];
    const subcategories = [];

    for (let rowIndex = index + 1; rowIndex < lines.length; rowIndex += 1) {
      const row = lines[rowIndex] ?? '';
      if (row.startsWith('---') || /^## /u.test(row)) {
        break;
      }
      const rowMatch = /^\| `([A-Z]{3}-[0-9]{3})` \| (.+?)\s+\| `([A-Z_]+)`\s+\|$/u.exec(row);
      if (rowMatch === null) {
        continue;
      }
      subcategories.push({
        code: rowMatch[1],
        name: rowMatch[2]?.trim(),
        workflowType: rowMatch[3],
      });
    }

    categories.push({
      code: primaryCode,
      name: currentHeading,
      subcategories,
    });
  }

  assert(categories.length === 17, `Expected 17 primary categories; found ${categories.length}.`);
  assert(
    new Set(categories.map(({ code }) => code)).size === categories.length,
    'Primary taxonomy codes must be unique.',
  );

  for (const category of categories) {
    assert(
      category.subcategories.length === 20,
      `${category.code} must contain exactly 20 subcategories; found ${category.subcategories.length}.`,
    );
    for (const subcategory of category.subcategories) {
      assert(
        subcategory.code.startsWith(`${category.code}-`),
        `${subcategory.code} does not belong to ${category.code}.`,
      );
      assert(
        expectedWorkflowTypes.has(subcategory.workflowType),
        `${subcategory.code} uses unknown workflow ${subcategory.workflowType}.`,
      );
    }
  }

  const subcategories = categories.flatMap(({ subcategories: rows }) => rows);
  assert(
    subcategories.length === 340,
    `Expected 340 subcategories; found ${subcategories.length}.`,
  );
  assert(
    new Set(subcategories.map(({ code }) => code)).size === subcategories.length,
    'Subcategory taxonomy codes must be unique.',
  );
  assert(
    expectedWorkflowTypes.size === 19 &&
      [...expectedWorkflowTypes].every((workflowType) => markdown.includes(`\`${workflowType}\``)),
    'The workflow table must document all 19 supported workflow types.',
  );

  const corruption = categories.find(({ code }) => code === 'COR');
  assert(corruption !== undefined, 'The protected COR primary category is required.');
  assert(
    corruption.subcategories.every(({ workflowType }) => workflowType === 'ANTI_CORRUPTION'),
    'Every COR subcategory must use the ANTI_CORRUPTION workflow.',
  );
  assert(
    markdown.includes('Never route a report to the accused office') &&
      markdown.includes('generic ward complaint mailbox'),
    'The taxonomy must preserve the independent corruption-routing safeguard.',
  );

  for (const taxonomyCode of mappedRoutingProfiles.keys()) {
    assert(
      subcategories.some(({ code }) => code === taxonomyCode),
      `Mapped taxonomy code ${taxonomyCode} is missing.`,
    );
  }

  return categories;
};

const sensitivityFor = (primaryCode, workflowType = null) => {
  if (primaryCode === 'EMR' || workflowType === 'EMERGENCY') {
    return 'EMERGENCY_PRIVATE';
  }
  if (privatePrimaryCodes.has(primaryCode) || privateWorkflowTypes.has(workflowType)) {
    return 'PRIVATE';
  }
  if (restrictedPrimaryCodes.has(primaryCode)) {
    return 'RESTRICTED';
  }
  return 'PUBLIC';
};

const routingStatusFor = (taxonomyCode, sensitivityClass) => {
  if (mappedRoutingProfiles.has(taxonomyCode)) {
    return 'mapped';
  }
  if (sensitivityClass === 'PRIVATE' || sensitivityClass === 'EMERGENCY_PRIVATE') {
    return 'protected_pending';
  }
  return 'pending_verification';
};

const internalCategoryCode = (taxonomyCode) =>
  `jagruksetu_${taxonomyCode.toLowerCase().replaceAll('-', '_')}`;

const renderCategoryValues = ({
  id,
  parentId,
  code,
  name,
  classificationLevel,
  taxonomyCode,
  workflowType,
  sensitivityClass,
  routingStatus,
  routingProfileCode,
  publicVisibilityDefault,
  isEmergency,
}) => `  (
    ${sqlText(id)},
    ${sqlText(taxonomyDomainId)},
    ${sqlNullableText(parentId)},
    ${sqlText(code)},
    ${sqlText(name)},
    null,
    ${sqlText(classificationLevel)},
    'medium',
    false,
    false,
    'optional',
    ${sqlBoolean(isEmergency)},
    0,
    5,
    '{}'::text[],
    '{"recommended":[]}'::jsonb,
    'active',
    'unverified',
    'Taxonomy classification only; operational routing requires an independently verified route profile.',
    false,
    false,
    'taxonomy_${classificationLevel === 'category' ? 'primary' : 'subcategory'}',
    ${sqlText(taxonomyCode)},
    ${sqlNullableText(workflowType)},
    ${sqlText(sensitivityClass)},
    'taxonomy_ready',
    ${sqlText(routingStatus)},
    ${
      routingProfileCode === null
        ? 'null'
        : `(select category.id from routing.issue_categories as category where category.code = ${sqlText(
            routingProfileCode,
          )} and category.category_purpose = 'routing_profile')`
    },
    ${sqlBoolean(publicVisibilityDefault)},
    ${sqlBoolean(publicVisibilityDefault)},
    ${sqlBoolean(publicVisibilityDefault)}
  )`;

const renderCategoryInsert = (values) => `insert into routing.issue_categories (
  id,
  domain_id,
  parent_category_id,
  code,
  name,
  description,
  classification_level,
  default_severity,
  requires_asset,
  requires_location,
  location_requirement,
  is_emergency,
  minimum_media_count,
  maximum_media_count,
  required_attributes,
  media_requirements,
  status,
  verification_status,
  verification_notes,
  is_placeholder,
  is_routing_eligible,
  category_purpose,
  taxonomy_code,
  workflow_type,
  sensitivity_class,
  configuration_status,
  routing_status,
  routing_profile_category_id,
  public_visibility_default,
  comments_allowed,
  community_support_allowed
)
values
${values.join(',\n')}
on conflict (id) do update
set
  domain_id = excluded.domain_id,
  parent_category_id = excluded.parent_category_id,
  code = excluded.code,
  name = excluded.name,
  description = excluded.description,
  classification_level = excluded.classification_level,
  default_severity = excluded.default_severity,
  requires_asset = excluded.requires_asset,
  requires_location = excluded.requires_location,
  location_requirement = excluded.location_requirement,
  is_emergency = excluded.is_emergency,
  minimum_media_count = excluded.minimum_media_count,
  maximum_media_count = excluded.maximum_media_count,
  required_attributes = excluded.required_attributes,
  media_requirements = excluded.media_requirements,
  status = excluded.status,
  verification_status = excluded.verification_status,
  verification_notes = excluded.verification_notes,
  is_placeholder = excluded.is_placeholder,
  is_routing_eligible = excluded.is_routing_eligible,
  category_purpose = excluded.category_purpose,
  taxonomy_code = excluded.taxonomy_code,
  workflow_type = excluded.workflow_type,
  sensitivity_class = excluded.sensitivity_class,
  configuration_status = excluded.configuration_status,
  routing_status = excluded.routing_status,
  routing_profile_category_id = excluded.routing_profile_category_id,
  public_visibility_default = excluded.public_visibility_default,
  comments_allowed = excluded.comments_allowed,
  community_support_allowed = excluded.community_support_allowed;\n`;

const renderSeed = (categories, taxonomySourceSha256) => {
  const primaryIds = new Map(
    categories.map(({ code }) => [code, stableUuid('taxonomy-primary', code)]),
  );
  const primaryValues = categories.map(({ code, name }) => {
    const sensitivityClass = sensitivityFor(code);
    return renderCategoryValues({
      id: primaryIds.get(code),
      parentId: null,
      code: internalCategoryCode(code),
      name,
      classificationLevel: 'category',
      taxonomyCode: code,
      workflowType: null,
      sensitivityClass,
      routingStatus:
        sensitivityClass === 'PRIVATE' || sensitivityClass === 'EMERGENCY_PRIVATE'
          ? 'protected_pending'
          : 'pending_verification',
      routingProfileCode: null,
      publicVisibilityDefault: sensitivityClass === 'PUBLIC',
      isEmergency: code === 'EMR',
    });
  });
  const subcategoryValues = categories.flatMap(({ code: primaryCode, subcategories }) =>
    subcategories.map(({ code, name, workflowType }) => {
      const sensitivityClass = sensitivityFor(primaryCode, workflowType);
      return renderCategoryValues({
        id: stableUuid('taxonomy-subcategory', code),
        parentId: primaryIds.get(primaryCode),
        code: internalCategoryCode(code),
        name,
        classificationLevel: 'subcategory',
        taxonomyCode: code,
        workflowType,
        sensitivityClass,
        routingStatus: routingStatusFor(code, sensitivityClass),
        routingProfileCode: mappedRoutingProfiles.get(code) ?? null,
        publicVisibilityDefault: sensitivityClass === 'PUBLIC',
        isEmergency: workflowType === 'EMERGENCY',
      });
    }),
  );
  const requiredRouteProfileCodes = [...new Set(mappedRoutingProfiles.values())].sort();

  return `-- Generated by scripts/generate-jagruksetu-taxonomy.mjs. Do not edit manually.
-- Source: resources/JAGRUKSETU_COMPLAINT_TAXONOMY_V1.md
-- Source SHA-256: ${taxonomySourceSha256}
--
-- These 17 primary and 340 subcategory records classify citizen intake. They
-- do not replace or activate operational route profiles. Only the 13 mappings
-- documented by the source taxonomy point to the 12 existing V1 profiles.

insert into routing.issue_domains (
  id,
  code,
  name,
  description,
  status,
  verification_status,
  verification_notes,
  is_placeholder,
  is_routing_eligible
)
values (
  ${sqlText(taxonomyDomainId)},
  'jagruksetu_taxonomy',
  'JagrukSetu Complaint Taxonomy',
  'Citizen-facing complaint classification. Taxonomy status does not establish government routing authority.',
  'active',
  'unverified',
  'Source taxonomy is implementation-ready; every operational recipient remains independently review-gated.',
  false,
  false
)
on conflict (id) do update
set
  code = excluded.code,
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  verification_status = excluded.verification_status,
  verification_notes = excluded.verification_notes,
  is_placeholder = excluded.is_placeholder,
  is_routing_eligible = excluded.is_routing_eligible;

do $jagruksetu_taxonomy_route_profile_preflight$
declare
  missing_profiles text[];
begin
  select array_agg(required.code order by required.code)
  into missing_profiles
  from unnest(array[${requiredRouteProfileCodes.map(sqlText).join(', ')}]::text[]) as required(code)
  where not exists (
    select 1
    from routing.issue_categories as category
    where category.code = required.code
      and category.category_purpose = 'routing_profile'
  );

  if coalesce(cardinality(missing_profiles), 0) > 0 then
    raise exception using
      errcode = '55000',
      message = 'JAGRUKSETU_TAXONOMY_ROUTE_PROFILES_MISSING',
      detail = array_to_string(missing_profiles, ', '),
      hint = 'Apply the existing V1 operational-category seed before this taxonomy seed.';
  end if;
end;
$jagruksetu_taxonomy_route_profile_preflight$;

${renderCategoryInsert(primaryValues)}
${renderCategoryInsert(subcategoryValues)}
do $jagruksetu_taxonomy_seed_verification$
begin
  if (
    select count(*)
    from routing.issue_categories
    where category_purpose = 'taxonomy_primary'
  ) <> 17 then
    raise exception using
      errcode = '55000',
      message = 'JAGRUKSETU_TAXONOMY_PRIMARY_COUNT_INVALID';
  end if;

  if (
    select count(*)
    from routing.issue_categories
    where category_purpose = 'taxonomy_subcategory'
  ) <> 340 then
    raise exception using
      errcode = '55000',
      message = 'JAGRUKSETU_TAXONOMY_SUBCATEGORY_COUNT_INVALID';
  end if;

  if (
    select count(*)
    from routing.issue_categories
    where category_purpose = 'taxonomy_subcategory'
      and routing_status = 'mapped'
      and routing_profile_category_id is not null
  ) <> 13 then
    raise exception using
      errcode = '55000',
      message = 'JAGRUKSETU_TAXONOMY_MAPPING_COUNT_INVALID';
  end if;

  if (
    select count(*)
    from routing.issue_categories as subcategory
    inner join routing.issue_categories as primary_category
      on primary_category.id = subcategory.parent_category_id
    where primary_category.taxonomy_code = 'COR'
      and subcategory.category_purpose = 'taxonomy_subcategory'
      and subcategory.workflow_type = 'ANTI_CORRUPTION'
      and subcategory.sensitivity_class = 'PRIVATE'
      and subcategory.routing_status = 'protected_pending'
      and subcategory.routing_profile_category_id is null
      and not subcategory.public_visibility_default
      and not subcategory.comments_allowed
      and not subcategory.community_support_allowed
  ) <> 20 then
    raise exception using
      errcode = '55000',
      message = 'JAGRUKSETU_CORRUPTION_PROTECTION_INVALID';
  end if;
end;
$jagruksetu_taxonomy_seed_verification$;
`;
};

const migrationStartMarker = '-- BEGIN EXACT SOURCE: taxonomy migration\n';
const migrationEndMarker = '-- END EXACT SOURCE: taxonomy migration\n';
const seedStartMarker = '-- BEGIN EXACT SOURCE: taxonomy seed\n';
const seedEndMarker = '-- END EXACT SOURCE: taxonomy seed\n';

const renderDeployment = ({ migration, seed, taxonomySourceSha256 }) => {
  const migrationSha256 = sha256(migration);
  const seedSha256 = sha256(seed);
  const orderedPayloadSha256 = sha256(`${migration}${seed}`);

  return `-- JagrukSetu complaint-taxonomy V1 SQL Editor deployment
-- Generated by scripts/generate-jagruksetu-taxonomy.mjs. Do not edit manually.
--
-- Prerequisites:
--   1. Apply repository migrations through
--      20260723110000_prune_deferred_v1_subsystems.sql.
--   2. Load the existing 12 operational V1 category profiles.
--   3. Run this complete file once in the hosted Supabase SQL Editor.
--
-- Taxonomy source SHA-256: ${taxonomySourceSha256}
-- Migration SHA-256: ${migrationSha256}
-- Seed SHA-256: ${seedSha256}
-- Ordered source payload SHA-256: ${orderedPayloadSha256}

${migrationStartMarker}${migration}${migrationEndMarker}
${seedStartMarker}${seed}${seedEndMarker}`;
};

const writeOrCheck = async (path, expected) => {
  if (checkOnly) {
    const current = await readFile(path, 'utf8').catch(() => null);
    if (current !== expected) {
      throw new Error(
        `${repositoryPath(path)} is missing or stale. Run ` + '`pnpm taxonomy:generate`.',
      );
    }
    return;
  }

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, expected, 'utf8');
};

const main = async () => {
  const taxonomySource = ensureTrailingNewline(await readFile(taxonomyPath, 'utf8'));
  const categories = parseTaxonomy(taxonomySource);
  const taxonomySourceSha256 = sha256(taxonomySource);
  const seed = ensureTrailingNewline(renderSeed(categories, taxonomySourceSha256));
  const migration = ensureTrailingNewline(await readFile(migrationPath, 'utf8'));
  const deployment = renderDeployment({ migration, seed, taxonomySourceSha256 });

  await writeOrCheck(seedPath, seed);
  await writeOrCheck(deploymentPath, deployment);

  process.stdout.write(
    `${checkOnly ? 'Checked' : 'Generated'} ${repositoryPath(seedPath)} and ` +
      `${repositoryPath(deploymentPath)} from 17 primary categories and 340 subcategories ` +
      `(source SHA-256 ${taxonomySourceSha256}).\n`,
  );
};

await main();
