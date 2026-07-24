import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const taxonomyPath = join(repositoryRoot, 'resources/JAGRUKSETU_COMPLAINT_TAXONOMY_V1.md');
const sourceDirectory = join(repositoryRoot, 'resources/governance/csv/jagruksetu_bmc_intake_v1');
const sourceRegistryPath = join(sourceDirectory, 'Source_Registry.csv');
const handoffActionsPath = join(sourceDirectory, 'Protected_Handoff_Actions.csv');
const generatedDirectory = join(
  repositoryRoot,
  'resources/governance/generated/jagruksetu-bmc-intake-v1',
);
const routeMapPath = join(generatedDirectory, 'taxonomy-route-map.csv');
const importReadyPath = join(generatedDirectory, 'import-ready.json');
const validationReportPath = join(generatedDirectory, 'validation-report.json');
const manifestPath = join(
  repositoryRoot,
  'resources/governance/manifests/jagruksetu-bmc-intake-v1.json',
);
const manifestValidationPath = join(
  repositoryRoot,
  'resources/governance/manifests/jagruksetu-bmc-intake-v1.validation.json',
);
const migrationPath = join(
  repositoryRoot,
  'supabase/migrations/20260724110000_v1_bmc_general_intake_and_handoffs.sql',
);
const seedPath = join(repositoryRoot, 'supabase/seed/56_jagruksetu_bmc_intake.generated.sql');
const deploymentPath = join(repositoryRoot, 'supabase/deploy/jagruksetu-bmc-intake-v1.sql');
const checkOnly = process.argv.includes('--check');

const datasetKey = 'jagruksetu_bmc_intake_v1';
const datasetVersion = '2026-07-24.v1';
const stableUuidNamespace = '8ef77cd6-c43b-5fcb-bd5f-11f86efb20b4';
const civicWellnessDomainId = '93000000-0000-4000-8000-000000000001';
const bmcAuthorityId = '3fabe3b8-47cf-58fe-a59c-bb34bd02322a';
const bmcLocalBodyId = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd';
const bmcCentralDepartmentId = 'c3cb4f48-502e-572c-9c85-5d200b886ac8';
const bmcCentralOfficerRoleId = 'e64f33aa-2731-5a4a-85e6-eff09f7e6005';
const bmcCentralOfficeId = '25f5bf8f-d034-5bbd-976a-0be621edf148';
const bmcConfidencePolicyVersionId = '4235f4f1-d01d-5a40-93cb-5aa2a5537945';
const bmcConnectUrl =
  'https://dm.mcgm.gov.in/assets/pdf/Final%20updated%20Final%20Connect%20Diary%202021.07.07.2021.pdf';
const genericProfileCode = 'general_ward_complaint';
const genericRuleCode = 'V1_WARD_GENERAL_WARD_COMPLAINT';

const wards = Object.freeze([
  'A',
  'B',
  'C',
  'D',
  'E',
  'F/S',
  'F/N',
  'G/S',
  'G/N',
  'H/E',
  'H/W',
  'K/S',
  'K/N',
  'K/W',
  'P/S',
  'P/E',
  'P/W',
  'R/S',
  'R/C',
  'R/N',
  'L',
  'M/E',
  'M/W',
  'N',
  'S',
  'T',
]);

const specializedRoutingProfiles = Object.freeze(
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

const sourceRegistryHeaders = Object.freeze([
  'source_key',
  'publisher',
  'title',
  'url',
  'scope',
  'source_as_of',
  'last_checked_on',
  'verification_status',
  'notes',
]);
const handoffActionHeaders = Object.freeze([
  'taxonomy_code',
  'action_key',
  'action_kind',
  'label',
  'description',
  'target_value',
  'priority',
  'source_key',
  'source_locator',
  'source_as_of',
  'last_checked_on',
  'source_status',
  'owner_approved_for_display',
  'is_active',
]);
const allowedOfficialHosts = Object.freeze(
  new Set([
    'dm.mcgm.gov.in',
    '112.gov.in',
    'www.mumbaipolice.gov.in',
    'www.cybercrime.gov.in',
    'womenchild.maharashtra.gov.in',
    'grievances.maharashtra.gov.in',
    'acb.maharashtra.gov.in',
  ]),
);
const expectedSourceUrls = Object.freeze(
  new Map([
    ['bmc_disaster_management', 'https://dm.mcgm.gov.in/'],
    ['erss_112', 'https://112.gov.in/'],
    ['mumbai_police_online', 'https://www.mumbaipolice.gov.in/OnlineComplaints?ps_id=3'],
    ['national_cybercrime', 'https://www.cybercrime.gov.in/'],
    ['maharashtra_wcd', 'https://womenchild.maharashtra.gov.in/en/support-helpline'],
    ['maharashtra_grievance', 'https://grievances.maharashtra.gov.in/en'],
    ['maharashtra_acb', 'https://acb.maharashtra.gov.in/bribe-complaint'],
  ]),
);
const allowedCallTargetsBySource = Object.freeze(
  new Map([
    ['bmc_disaster_management', new Set(['1916'])],
    ['erss_112', new Set(['112'])],
    ['national_cybercrime', new Set(['1930'])],
    ['maharashtra_wcd', new Set(['181', '1098'])],
    ['maharashtra_acb', new Set(['1064'])],
  ]),
);

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const repositoryPath = (path) => relative(repositoryRoot, path).replaceAll('\\', '/');
const ensureTrailingNewline = (value) => (value.endsWith('\n') ? value : `${value}\n`);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const jsonDocument = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sqlText = (value) => `'${value.replaceAll("'", "''")}'`;
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

const parseCsv = (source, sourceName) => {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      assert(field.length === 0, `${sourceName} contains a quote inside an unquoted field.`);
      quoted = true;
    } else if (character === ',') {
      row.push(field.trim());
      field = '';
    } else if (character === '\n') {
      row.push(field.trim());
      field = '';
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
    } else if (character !== '\r') {
      field += character;
    }
  }

  assert(!quoted, `${sourceName} contains an unterminated quoted field.`);
  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some((value) => value.length > 0)) {
      rows.push(row);
    }
  }
  assert(rows.length >= 2, `${sourceName} must contain a header and at least one row.`);

  const headers = rows[0];
  assert(
    new Set(headers).size === headers.length,
    `${sourceName} contains duplicate column headers.`,
  );
  return {
    headers,
    records: rows.slice(1).map((values, rowIndex) => {
      assert(
        values.length === headers.length,
        `${sourceName} row ${rowIndex + 2} has ${values.length} fields; expected ${headers.length}.`,
      );
      return Object.fromEntries(
        headers.map((header, columnIndex) => [header, values[columnIndex]]),
      );
    }),
  };
};

const assertHeaders = (actual, expected, sourceName) => {
  assert(
    actual.length === expected.length &&
      actual.every((header, index) => header === expected[index]),
    `${sourceName} headers must be exactly: ${expected.join(',')}.`,
  );
};

const csvCell = (value) => {
  const normalized = String(value);
  return /[",\r\n]/u.test(normalized) ? `"${normalized.replaceAll('"', '""')}"` : normalized;
};
const renderCsv = (headers, records) =>
  `${headers.join(',')}\n${records
    .map((record) => headers.map((header) => csvCell(record[header] ?? '')).join(','))
    .join('\n')}\n`;

const parseTaxonomy = (markdown) => {
  assert(
    markdown.includes(
      '**Coverage:** 17 primary categories, 20 subcategories per category, 340 total subcategories, and 19 primary workflow types.',
    ),
    'Taxonomy coverage declaration is not the expected V1 declaration.',
  );

  const lines = markdown.split(/\r?\n/u);
  const categories = [];
  let heading = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const headingMatch = /^## \d+\. (.+)$/u.exec(line);
    if (headingMatch !== null) {
      heading = headingMatch[1]?.trim() ?? null;
      continue;
    }
    const primaryMatch = /^\*\*Primary category code:\*\* `([A-Z]{3})` {2}$/u.exec(line);
    if (primaryMatch === null) {
      continue;
    }

    const primaryCode = primaryMatch[1];
    assert(heading !== null, `${primaryCode} has no section heading.`);
    const subcategories = [];
    for (let rowIndex = index + 1; rowIndex < lines.length; rowIndex += 1) {
      const row = lines[rowIndex] ?? '';
      if (row.startsWith('---') || /^## /u.test(row)) {
        break;
      }
      const rowMatch = /^\| `([A-Z]{3}-[0-9]{3})` \| (.+?)\s+\| `([A-Z_]+)`\s+\|$/u.exec(row);
      if (rowMatch !== null) {
        subcategories.push({
          primaryCode,
          code: rowMatch[1],
          name: rowMatch[2]?.trim(),
          workflowType: rowMatch[3],
        });
      }
    }
    categories.push({ code: primaryCode, name: heading, subcategories });
  }

  assert(categories.length === 17, `Expected 17 primary categories; found ${categories.length}.`);
  assert(
    new Set(categories.map(({ code }) => code)).size === categories.length,
    'Primary taxonomy codes must be unique.',
  );
  for (const category of categories) {
    assert(
      category.subcategories.length === 20,
      `${category.code} must contain 20 subcategories; found ${category.subcategories.length}.`,
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
  return { categories, subcategories };
};

const sensitivityFor = (primaryCode, workflowType) => {
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

const parseSourceRegistry = (source) => {
  const parsed = parseCsv(source, repositoryPath(sourceRegistryPath));
  assertHeaders(parsed.headers, sourceRegistryHeaders, repositoryPath(sourceRegistryPath));
  const sources = parsed.records.map((record) => {
    assert(
      /^[a-z][a-z0-9_]{1,79}$/u.test(record.source_key),
      `Invalid source_key ${record.source_key}.`,
    );
    const url = new URL(record.url);
    assert(url.protocol === 'https:', `${record.source_key} must use HTTPS.`);
    assert(
      allowedOfficialHosts.has(url.hostname),
      `${record.source_key} uses unapproved host ${url.hostname}.`,
    );
    assert(
      /^\d{4}-\d{2}-\d{2}$/u.test(record.source_as_of) &&
        /^\d{4}-\d{2}-\d{2}$/u.test(record.last_checked_on) &&
        record.source_as_of <= record.last_checked_on,
      `${record.source_key} has invalid source dates.`,
    );
    assert(
      record.verification_status === 'official_current',
      `${record.source_key} must be official_current.`,
    );
    for (const key of ['publisher', 'title', 'scope', 'notes']) {
      assert(record[key].length > 0, `${record.source_key} is missing ${key}.`);
    }
    return Object.freeze(record);
  });
  assert(sources.length === 7, `Expected 7 official sources; found ${sources.length}.`);
  assert(
    new Set(sources.map(({ source_key: key }) => key)).size === sources.length,
    'Source registry keys must be unique.',
  );
  for (const [sourceKey, expectedUrl] of expectedSourceUrls) {
    assert(
      sources.some(
        ({ source_key: candidateKey, url }) => candidateKey === sourceKey && url === expectedUrl,
      ),
      `${sourceKey} must pin the approved official URL ${expectedUrl}.`,
    );
  }
  return sources;
};

const parseBoolean = (value, fieldName, rowKey) => {
  assert(value === 'true' || value === 'false', `${rowKey} has invalid ${fieldName}.`);
  return value === 'true';
};

const parseHandoffActions = (source, sourceByKey, taxonomyCodes) => {
  const parsed = parseCsv(source, repositoryPath(handoffActionsPath));
  assertHeaders(parsed.headers, handoffActionHeaders, repositoryPath(handoffActionsPath));
  const actions = parsed.records.map((record) => {
    assert(
      taxonomyCodes.has(record.taxonomy_code),
      `${record.action_key} has an unknown taxonomy.`,
    );
    assert(
      /^[a-z][a-z0-9_]{1,79}$/u.test(record.action_key),
      `Invalid action_key ${record.action_key}.`,
    );
    assert(
      record.action_kind === 'call' || record.action_kind === 'browser',
      `${record.action_key} has invalid action_kind.`,
    );
    assert(
      record.label.length >= 1 && record.label.length <= 120,
      `${record.action_key} has an invalid label.`,
    );
    assert(
      record.description.length >= 1 && record.description.length <= 500,
      `${record.action_key} has an invalid description.`,
    );
    if (record.action_kind === 'call') {
      assert(
        /^[0-9]{3,15}$/u.test(record.target_value),
        `${record.action_key} must contain a digits-only call target.`,
      );
      assert(
        allowedCallTargetsBySource.get(record.source_key)?.has(record.target_value) === true,
        `${record.action_key} uses a call target not published by ${record.source_key}.`,
      );
    } else {
      const target = new URL(record.target_value);
      assert(
        target.protocol === 'https:' &&
          target.username.length === 0 &&
          target.password.length === 0 &&
          allowedOfficialHosts.has(target.hostname),
        `${record.action_key} must contain an approved HTTPS browser target.`,
      );
      assert(
        record.target_value === expectedSourceUrls.get(record.source_key),
        `${record.action_key} browser target must equal its registered official source URL.`,
      );
    }
    assert(!record.target_value.includes('@'), `${record.action_key} must not expose an email.`);
    const priority = Number.parseInt(record.priority, 10);
    assert(
      String(priority) === record.priority && priority >= 0 && priority <= 32_767,
      `${record.action_key} has invalid priority.`,
    );
    const registeredSource = sourceByKey.get(record.source_key);
    assert(registeredSource !== undefined, `${record.action_key} uses an unknown source.`);
    assert(
      record.source_as_of === registeredSource.source_as_of &&
        record.last_checked_on === registeredSource.last_checked_on &&
        record.source_status === registeredSource.verification_status,
      `${record.action_key} source metadata differs from ${record.source_key}.`,
    );
    const ownerApprovedForDisplay = parseBoolean(
      record.owner_approved_for_display,
      'owner_approved_for_display',
      record.action_key,
    );
    const isActive = parseBoolean(record.is_active, 'is_active', record.action_key);
    assert(
      ownerApprovedForDisplay && isActive,
      `${record.action_key} must be active and approved for display.`,
    );
    return Object.freeze({
      taxonomyCode: record.taxonomy_code,
      key: record.action_key,
      kind: record.action_kind,
      label: record.label,
      description: record.description,
      target: record.target_value,
      priority,
      sourceKey: record.source_key,
      sourceUrl: registeredSource.url,
      sourceLocator: record.source_locator,
      sourceAsOf: record.source_as_of,
      lastCheckedOn: record.last_checked_on,
      sourceStatus: record.source_status,
      ownerApprovedForDisplay,
      isActive,
    });
  });
  assert(actions.length === 29, `Expected 29 protected handoff actions; found ${actions.length}.`);
  assert(
    new Set(actions.map(({ key }) => key)).size === actions.length,
    'Handoff action keys must be unique.',
  );
  return actions;
};

const buildMappings = (subcategories, actions) => {
  const actionsByTaxonomy = new Map();
  for (const action of actions) {
    const existing = actionsByTaxonomy.get(action.taxonomyCode) ?? [];
    existing.push(action);
    actionsByTaxonomy.set(action.taxonomyCode, existing);
  }

  const mappings = subcategories.map((subcategory) => {
    const sensitivityClass = sensitivityFor(subcategory.primaryCode, subcategory.workflowType);
    const protectedIntake =
      sensitivityClass === 'PRIVATE' || sensitivityClass === 'EMERGENCY_PRIVATE';
    const resolvedActions = protectedIntake
      ? [
          ...(actionsByTaxonomy.get(subcategory.code) ?? []),
          ...(actionsByTaxonomy.get(subcategory.primaryCode) ?? []),
        ].sort((left, right) => left.priority - right.priority || left.key.localeCompare(right.key))
      : [];
    const specializedProfile = specializedRoutingProfiles.get(subcategory.code);
    const routeMode = protectedIntake
      ? 'protected_handoff'
      : specializedProfile === undefined
        ? 'generic_ward'
        : 'specialized_ward';

    assert(
      !protectedIntake || resolvedActions.length > 0,
      `${subcategory.code} has no approved protected handoff action.`,
    );
    assert(
      protectedIntake || resolvedActions.length === 0,
      `${subcategory.code} unexpectedly exposes a protected handoff action.`,
    );
    return Object.freeze({
      ...subcategory,
      sensitivityClass,
      routeMode,
      routingProfileCode:
        routeMode === 'protected_handoff' ? null : (specializedProfile ?? genericProfileCode),
      routingStatus: routeMode === 'protected_handoff' ? 'protected_handoff' : 'mapped',
      submissionAvailable: routeMode !== 'protected_handoff',
      actionKeys: resolvedActions.map(({ key }) => key),
    });
  });

  const counts = {
    total: mappings.length,
    specializedWard: mappings.filter(({ routeMode }) => routeMode === 'specialized_ward').length,
    genericWard: mappings.filter(({ routeMode }) => routeMode === 'generic_ward').length,
    protectedHandoff: mappings.filter(({ routeMode }) => routeMode === 'protected_handoff').length,
  };
  assert(counts.total === 340, `Expected 340 mappings; found ${counts.total}.`);
  assert(
    counts.specializedWard === 13,
    `Expected 13 specialized mappings; found ${counts.specializedWard}.`,
  );
  assert(
    counts.genericWard === 243,
    `Expected 243 generic ward mappings; found ${counts.genericWard}.`,
  );
  assert(
    counts.protectedHandoff === 84,
    `Expected 84 protected handoffs; found ${counts.protectedHandoff}.`,
  );
  const usedActionKeys = new Set(mappings.flatMap(({ actionKeys }) => actionKeys));
  assert(
    actions.every(({ key }) => usedActionKeys.has(key)) && usedActionKeys.size === actions.length,
    'Every protected handoff action must serve at least one protected taxonomy leaf.',
  );
  return { mappings, counts };
};

const renderRouteMap = (mappings) =>
  renderCsv(
    [
      'taxonomy_code',
      'primary_code',
      'name',
      'workflow_type',
      'sensitivity_class',
      'route_mode',
      'routing_profile_code',
      'routing_status',
      'submission_available',
      'handoff_action_keys',
    ],
    mappings.map((mapping) => ({
      taxonomy_code: mapping.code,
      primary_code: mapping.primaryCode,
      name: mapping.name,
      workflow_type: mapping.workflowType,
      sensitivity_class: mapping.sensitivityClass,
      route_mode: mapping.routeMode,
      routing_profile_code: mapping.routingProfileCode ?? '',
      routing_status: mapping.routingStatus,
      submission_available: String(mapping.submissionAvailable),
      handoff_action_keys: mapping.actionKeys.join('|'),
    })),
  );

const renderSeed = ({ mappings, actions, sourceHashes }) => {
  const genericProfileId = stableUuid('routing-profile', genericProfileCode);
  const genericRuleId = stableUuid('route-rule', genericRuleCode);
  const genericRuleVersionId = stableUuid('route-rule-version', `${genericRuleCode}:1`);
  const specializedCodes = [...specializedRoutingProfiles.keys()].sort();
  const wardTargets = wards
    .map(
      (wardNumber) =>
        `    (${sqlText(stableUuid('ward-contact', `${wardNumber}:${genericProfileCode}`))}::uuid, ${sqlText(
          wardNumber,
        )}::text)`,
    )
    .join(',\n');
  const actionValues = actions
    .map(
      (action) => `  (
    ${sqlText(stableUuid('handoff-action', action.key))}::uuid,
    ${sqlText(action.key)},
    (select category.id from routing.issue_categories as category where category.taxonomy_code = ${sqlText(
      action.taxonomyCode,
    )}),
    ${sqlText(action.kind)},
    ${sqlText(action.label)},
    ${sqlText(action.description)},
    ${sqlText(action.target)},
    ${action.priority},
    ${sqlText(action.sourceUrl)},
    ${sqlText(action.sourceLocator)},
    ${sqlText(action.sourceAsOf)}::date,
    ${sqlText(action.lastCheckedOn)}::date,
    ${sqlText(action.sourceStatus)},
    true,
    true
  )`,
    )
    .join(',\n');
  const mappedTaxonomyCodes = mappings
    .filter(({ routeMode }) => routeMode === 'generic_ward')
    .map(({ code }) => code)
    .sort();
  return `-- Generated by scripts/generate-jagruksetu-bmc-intake.mjs. Do not edit manually.
-- Dataset: ${datasetKey} ${datasetVersion}
-- Taxonomy SHA-256: ${sourceHashes.taxonomy}
-- Source registry SHA-256: ${sourceHashes.sourceRegistry}
-- Protected handoff actions SHA-256: ${sourceHashes.handoffActions}
--
-- V1 cutover:
--   * preserve 13 specialized taxonomy mappings;
--   * map 243 ordinary taxonomy leaves to one generic ward profile;
--   * expose public-safe official handoffs for 84 protected leaves;
--   * add one private recipient row per BMC operational ward.

begin;

do $jagruksetu_bmc_intake_prerequisites$
begin
  if to_regclass('routing.complaint_handoff_actions') is null then
    raise exception using
      errcode = '42P01',
      message = 'JAGRUKSETU_HANDOFF_ACTIONS_MIGRATION_REQUIRED';
  end if;

  if not exists (
    select 1
    from governance.reference_sources
    where url = ${sqlText(bmcConnectUrl)}
  ) then
    raise exception using
      errcode = '55000',
      message = 'BMC_REFERENCE_SOURCE_REQUIRED';
  end if;

  if not exists (
    select 1 from governance.authorities where id = ${sqlText(bmcAuthorityId)}
  ) or not exists (
    select 1 from governance.local_bodies where id = ${sqlText(bmcLocalBodyId)}
  ) or not exists (
    select 1 from governance.departments where id = ${sqlText(bmcCentralDepartmentId)}
  ) or not exists (
    select 1 from governance.officer_roles where id = ${sqlText(bmcCentralOfficerRoleId)}
  ) or not exists (
    select 1 from governance.offices where id = ${sqlText(bmcCentralOfficeId)}
  ) or not exists (
    select 1
    from routing.confidence_policy_versions
    where id = ${sqlText(bmcConfidencePolicyVersionId)}
  ) then
    raise exception using
      errcode = '55000',
      message = 'BMC_V1_ROUTE_TARGET_PREREQUISITE_MISSING';
  end if;

  if (
    select count(*)
    from routing.issue_categories
    where category_purpose = 'taxonomy_subcategory'
  ) <> 340 then
    raise exception using
      errcode = '55000',
      message = 'JAGRUKSETU_TAXONOMY_SEED_REQUIRED';
  end if;

  if (
    select count(*)
    from governance.wards
    where local_body_id = ${sqlText(bmcLocalBodyId)}
      and ward_number = any(array[${wards.map(sqlText).join(', ')}]::text[])
  ) <> 26 then
    raise exception using
      errcode = '55000',
      message = 'BMC_OPERATIONAL_WARD_COUNT_INVALID';
  end if;

  if (
    select count(*)
    from routing.ward_issue_contacts as contact
    inner join governance.wards as ward on ward.id = contact.ward_id
    inner join routing.issue_categories as category on category.id = contact.category_id
    where ward.local_body_id = ${sqlText(bmcLocalBodyId)}
      and category.code = any(array[${[...new Set(specializedRoutingProfiles.values())]
        .sort()
        .map(sqlText)
        .join(', ')}]::text[])
      and contact.is_active
      and contact.email_owner_approved_for_routing
  ) <> 312 then
    raise exception using
      errcode = '55000',
      message = 'BMC_V1_SPECIALIZED_CONTACT_MATRIX_REQUIRED';
  end if;

  if exists (
    select 1
    from routing.issue_categories
    where code = ${sqlText(genericProfileCode)}
      and id <> ${sqlText(genericProfileId)}
  ) then
    raise exception using
      errcode = '55000',
      message = 'JAGRUKSETU_GENERIC_PROFILE_ID_CONFLICT';
  end if;
end;
$jagruksetu_bmc_intake_prerequisites$;

update routing.issue_domains
set
  status = 'active',
  verification_status = 'verified',
  verification_notes = 'Owner-approved V1 BMC ward intake domain.',
  is_placeholder = false,
  is_routing_eligible = true,
  last_verified_on = '2026-07-24'::date,
  reference_source_id = (
    select id from governance.reference_sources where url = ${sqlText(bmcConnectUrl)}
  ),
  updated_at = now()
where id = ${sqlText(civicWellnessDomainId)};

insert into routing.issue_categories (
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
  last_verified_on,
  reference_source_id,
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
values (
  ${sqlText(genericProfileId)},
  ${sqlText(civicWellnessDomainId)},
  null,
  ${sqlText(genericProfileCode)},
  'General ward complaint',
  'V1 catch-all profile for non-sensitive civic complaints delivered to the resolved BMC ward office.',
  'category',
  'medium',
  false,
  true,
  'required',
  false,
  0,
  5,
  '{}'::text[],
  '{"recommended":["photo"],"maximumCaptureDistanceMeters":50}'::jsonb,
  'active',
  'verified',
  'Owner-approved V1 general ward intake profile. Protected complaints are explicitly excluded.',
  false,
  true,
  '2026-07-24'::date,
  (select id from governance.reference_sources where url = ${sqlText(bmcConnectUrl)}),
  'routing_profile',
  null,
  null,
  null,
  'legacy',
  'legacy',
  null,
  null,
  null,
  null
)
on conflict (id) do update set
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
  last_verified_on = excluded.last_verified_on,
  reference_source_id = excluded.reference_source_id,
  updated_at = now();

insert into routing.route_rules (
  id,
  category_id,
  rule_code,
  name,
  status,
  verification_status,
  verification_notes,
  is_placeholder,
  is_routing_eligible,
  last_verified_on,
  reference_source_id
)
values (
  ${sqlText(genericRuleId)},
  ${sqlText(genericProfileId)},
  ${sqlText(genericRuleCode)},
  'V1 BMC ward route — General ward complaint',
  'active',
  'verified',
  'Owner-approved V1 general ward route used by the private ward-routing facade.',
  false,
  true,
  '2026-07-24'::date,
  (select id from governance.reference_sources where url = ${sqlText(bmcConnectUrl)})
)
on conflict (rule_code) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  status = excluded.status,
  verification_status = excluded.verification_status,
  verification_notes = excluded.verification_notes,
  is_placeholder = excluded.is_placeholder,
  is_routing_eligible = excluded.is_routing_eligible,
  last_verified_on = excluded.last_verified_on,
  reference_source_id = excluded.reference_source_id,
  updated_at = now();

insert into routing.route_rule_versions (
  id,
  route_rule_id,
  version,
  scope_authority_id,
  scope_local_body_id,
  scope_ward_id,
  target_authority_id,
  target_department_id,
  target_officer_role_id,
  target_office_id,
  confidence_policy_version_id,
  asset_requirement,
  requires_asset_owner,
  priority,
  fallback_depth,
  fallback_path,
  confidence_factor_codes,
  explanation_code,
  routing_notes,
  status,
  verification_status,
  verification_notes,
  is_placeholder,
  is_routing_eligible,
  effective_from,
  last_verified_on,
  reference_source_id
)
values (
  ${sqlText(genericRuleVersionId)},
  (select id from routing.route_rules where rule_code = ${sqlText(genericRuleCode)}),
  1,
  ${sqlText(bmcAuthorityId)},
  ${sqlText(bmcLocalBodyId)},
  null,
  ${sqlText(bmcAuthorityId)},
  ${sqlText(bmcCentralDepartmentId)},
  ${sqlText(bmcCentralOfficerRoleId)},
  ${sqlText(bmcCentralOfficeId)},
  ${sqlText(bmcConfidencePolicyVersionId)},
  'none',
  false,
  100,
  0,
  '{}'::uuid[],
  array['jurisdiction', 'category', 'department', 'role']::text[],
  'v1_ward_contact_route',
  'Resolve the location to an operational ward and use the private general ward contact.',
  'active',
  'verified',
  'Owner-approved V1 general ward route.',
  false,
  true,
  '2026-07-24T00:00:00Z'::timestamptz,
  '2026-07-24'::date,
  (select id from governance.reference_sources where url = ${sqlText(bmcConnectUrl)})
)
on conflict (route_rule_id, version) do update set
  scope_authority_id = excluded.scope_authority_id,
  scope_local_body_id = excluded.scope_local_body_id,
  scope_ward_id = excluded.scope_ward_id,
  target_authority_id = excluded.target_authority_id,
  target_department_id = excluded.target_department_id,
  target_officer_role_id = excluded.target_officer_role_id,
  target_office_id = excluded.target_office_id,
  confidence_policy_version_id = excluded.confidence_policy_version_id,
  asset_requirement = excluded.asset_requirement,
  requires_asset_owner = excluded.requires_asset_owner,
  priority = excluded.priority,
  fallback_depth = excluded.fallback_depth,
  fallback_path = excluded.fallback_path,
  confidence_factor_codes = excluded.confidence_factor_codes,
  explanation_code = excluded.explanation_code,
  routing_notes = excluded.routing_notes,
  status = excluded.status,
  verification_status = excluded.verification_status,
  verification_notes = excluded.verification_notes,
  is_placeholder = excluded.is_placeholder,
  is_routing_eligible = excluded.is_routing_eligible,
  effective_from = excluded.effective_from,
  effective_to = null,
  last_verified_on = excluded.last_verified_on,
  reference_source_id = excluded.reference_source_id,
  updated_at = now();

with target_wards (id, ward_number) as (
  values
${wardTargets}
),
source_contacts as (
  select distinct on (contact.ward_id)
    contact.*,
    ward.ward_number
  from routing.ward_issue_contacts as contact
  inner join governance.wards as ward on ward.id = contact.ward_id
  inner join routing.issue_categories as category on category.id = contact.category_id
  where ward.local_body_id = ${sqlText(bmcLocalBodyId)}
    and category.code = 'garbage_dump'
    and contact.is_active
    and contact.email_owner_approved_for_routing
  order by contact.ward_id, contact.id
)
insert into routing.ward_issue_contacts (
  id,
  ward_id,
  category_id,
  recipient_email,
  primary_contact,
  secondary_contact,
  central_fallback,
  whatsapp_contact,
  durable_role,
  usage_note,
  source_as_of,
  last_checked_on,
  ward_source_url,
  issue_source_url,
  email_source_url,
  email_source_as_of,
  email_last_checked_on,
  email_source_locator,
  email_source_reported_status,
  email_owner_approved_for_routing,
  is_active
)
select
  target.id,
  source.ward_id,
  ${sqlText(genericProfileId)},
  source.recipient_email,
  source.primary_contact,
  null,
  source.central_fallback,
  source.whatsapp_contact,
  'Assistant Commissioner / Ward Control Room',
  'General non-sensitive V1 intake; route to the ward office resolved from complaint location.',
  source.source_as_of,
  source.last_checked_on,
  source.ward_source_url,
  source.issue_source_url,
  source.email_source_url,
  source.email_source_as_of,
  source.email_last_checked_on,
  source.email_source_locator,
  source.email_source_reported_status,
  source.email_owner_approved_for_routing,
  true
from target_wards as target
inner join source_contacts as source on source.ward_number = target.ward_number
on conflict (ward_id, category_id) do update set
  recipient_email = excluded.recipient_email,
  primary_contact = excluded.primary_contact,
  secondary_contact = excluded.secondary_contact,
  central_fallback = excluded.central_fallback,
  whatsapp_contact = excluded.whatsapp_contact,
  durable_role = excluded.durable_role,
  usage_note = excluded.usage_note,
  source_as_of = excluded.source_as_of,
  last_checked_on = excluded.last_checked_on,
  ward_source_url = excluded.ward_source_url,
  issue_source_url = excluded.issue_source_url,
  email_source_url = excluded.email_source_url,
  email_source_as_of = excluded.email_source_as_of,
  email_last_checked_on = excluded.email_last_checked_on,
  email_source_locator = excluded.email_source_locator,
  email_source_reported_status = excluded.email_source_reported_status,
  email_owner_approved_for_routing = excluded.email_owner_approved_for_routing,
  is_active = excluded.is_active,
  updated_at = now();

update routing.issue_categories
set
  routing_status = 'mapped',
  routing_profile_category_id = ${sqlText(genericProfileId)},
  updated_at = now()
where category_purpose = 'taxonomy_subcategory'
  and taxonomy_code = any(array[${mappedTaxonomyCodes.map(sqlText).join(', ')}]::text[]);

update routing.issue_categories
set
  routing_status = 'protected_handoff',
  routing_profile_category_id = null,
  public_visibility_default = false,
  comments_allowed = false,
  community_support_allowed = false,
  updated_at = now()
where category_purpose in ('taxonomy_primary', 'taxonomy_subcategory')
  and sensitivity_class in ('PRIVATE', 'EMERGENCY_PRIVATE');

insert into routing.complaint_handoff_actions (
  id,
  action_key,
  taxonomy_category_id,
  action_kind,
  label,
  description,
  target_value,
  priority,
  source_url,
  source_locator,
  source_as_of,
  last_checked_on,
  source_status,
  owner_approved_for_display,
  is_active
)
values
${actionValues}
on conflict (action_key) do update set
  taxonomy_category_id = excluded.taxonomy_category_id,
  action_kind = excluded.action_kind,
  label = excluded.label,
  description = excluded.description,
  target_value = excluded.target_value,
  priority = excluded.priority,
  source_url = excluded.source_url,
  source_locator = excluded.source_locator,
  source_as_of = excluded.source_as_of,
  last_checked_on = excluded.last_checked_on,
  source_status = excluded.source_status,
  owner_approved_for_display = excluded.owner_approved_for_display,
  is_active = excluded.is_active,
  updated_at = now();

do $jagruksetu_bmc_intake_verification$
declare
  missing_profile_prerequisites text[];
begin
  if (
    select count(*)
    from routing.issue_categories
    where category_purpose = 'taxonomy_subcategory'
      and routing_status = 'mapped'
      and routing_profile_category_id is not null
  ) <> 256 then
    raise exception using
      errcode = '55000',
      message = 'JAGRUKSETU_MAPPED_LEAF_COUNT_INVALID';
  end if;

  if (
    select count(*)
    from routing.issue_categories
    where category_purpose = 'taxonomy_subcategory'
      and routing_status = 'protected_handoff'
      and routing_profile_category_id is null
  ) <> 84 then
    raise exception using
      errcode = '55000',
      message = 'JAGRUKSETU_PROTECTED_HANDOFF_LEAF_COUNT_INVALID';
  end if;

  if exists (
    select 1
    from routing.issue_categories
    where category_purpose = 'taxonomy_subcategory'
      and routing_status in ('pending_verification', 'protected_pending')
  ) then
    raise exception using
      errcode = '55000',
      message = 'JAGRUKSETU_PENDING_LEAF_REMAINS';
  end if;

  if (
    select count(distinct routing_profile_category_id)
    from routing.issue_categories
    where category_purpose = 'taxonomy_subcategory'
      and routing_status = 'mapped'
  ) <> 13 then
    raise exception using
      errcode = '55000',
      message = 'JAGRUKSETU_OPERATIONAL_PROFILE_COUNT_INVALID';
  end if;

  select array_agg(profile.code order by profile.code)
  into missing_profile_prerequisites
  from (
    select distinct route_profile.id, route_profile.code
    from routing.issue_categories as taxonomy
    inner join routing.issue_categories as route_profile
      on route_profile.id = taxonomy.routing_profile_category_id
    where taxonomy.category_purpose = 'taxonomy_subcategory'
      and taxonomy.routing_status = 'mapped'
  ) as profile
  where not exists (
    select 1
    from routing.route_rules as rule
    inner join routing.route_rule_versions as version on version.route_rule_id = rule.id
    where rule.category_id = profile.id
      and rule.rule_code = 'V1_WARD_' || upper(profile.code)
      and rule.status = 'active'
      and rule.verification_status = 'verified'
      and rule.is_routing_eligible
      and version.version = 1
      and version.status = 'active'
      and version.verification_status = 'verified'
      and version.is_routing_eligible
      and version.scope_local_body_id = ${sqlText(bmcLocalBodyId)}
  ) or (
    select count(*)
    from routing.ward_issue_contacts as contact
    inner join governance.wards as ward on ward.id = contact.ward_id
    where contact.category_id = profile.id
      and ward.local_body_id = ${sqlText(bmcLocalBodyId)}
      and contact.is_active
      and contact.email_owner_approved_for_routing
  ) <> 26;

  if coalesce(cardinality(missing_profile_prerequisites), 0) > 0 then
    raise exception using
      errcode = '55000',
      message = 'JAGRUKSETU_MAPPED_PROFILE_PREREQUISITES_INCOMPLETE',
      detail = array_to_string(missing_profile_prerequisites, ', ');
  end if;

  if (
    select count(*)
    from routing.ward_issue_contacts as contact
    inner join governance.wards as ward on ward.id = contact.ward_id
    where ward.local_body_id = ${sqlText(bmcLocalBodyId)}
      and contact.category_id in (
        select distinct routing_profile_category_id
        from routing.issue_categories
        where category_purpose = 'taxonomy_subcategory'
          and routing_status = 'mapped'
      )
      and contact.is_active
      and contact.email_owner_approved_for_routing
  ) <> 338 then
    raise exception using
      errcode = '55000',
      message = 'JAGRUKSETU_BMC_CONTACT_COUNT_INVALID';
  end if;

  if exists (
    select 1
    from routing.issue_categories
    where category_purpose = 'taxonomy_subcategory'
      and sensitivity_class in ('PRIVATE', 'EMERGENCY_PRIVATE')
      and routing_profile_category_id is not null
  ) or exists (
    select 1
    from routing.ward_issue_contacts as contact
    inner join routing.issue_categories as taxonomy on taxonomy.id = contact.category_id
    where taxonomy.category_purpose in ('taxonomy_primary', 'taxonomy_subcategory')
      and taxonomy.sensitivity_class in ('PRIVATE', 'EMERGENCY_PRIVATE')
  ) then
    raise exception using
      errcode = '55000',
      message = 'JAGRUKSETU_PROTECTED_ROUTE_LEAK_DETECTED';
  end if;

  if exists (
    select 1
    from routing.issue_categories as taxonomy
    where taxonomy.category_purpose = 'taxonomy_subcategory'
      and taxonomy.routing_status = 'protected_handoff'
      and not exists (
        select 1
        from routing.complaint_handoff_actions as action
        where action.is_active
          and action.owner_approved_for_display
          and action.taxonomy_category_id in (taxonomy.id, taxonomy.parent_category_id)
      )
  ) then
    raise exception using
      errcode = '55000',
      message = 'JAGRUKSETU_PROTECTED_HANDOFF_COVERAGE_INVALID';
  end if;

  if (
    select count(*)
    from routing.issue_categories as taxonomy
    where taxonomy.category_purpose = 'taxonomy_subcategory'
      and taxonomy.taxonomy_code = any(array[${specializedCodes.map(sqlText).join(', ')}]::text[])
      and taxonomy.routing_profile_category_id <> (
        select profile.id
        from routing.issue_categories as profile
        where profile.code = case taxonomy.taxonomy_code
${specializedCodes
  .map(
    (taxonomyCode) =>
      `          when ${sqlText(taxonomyCode)} then ${sqlText(
        specializedRoutingProfiles.get(taxonomyCode),
      )}`,
  )
  .join('\n')}
        end
      )
  ) <> 0 then
    raise exception using
      errcode = '55000',
      message = 'JAGRUKSETU_SPECIALIZED_MAPPING_CHANGED';
  end if;
end;
$jagruksetu_bmc_intake_verification$;

commit;
`;
};

const deploymentMigrationStartMarker =
  '-- BEGIN EXACT SOURCE: 20260724110000_v1_bmc_general_intake_and_handoffs.sql\n';
const deploymentMigrationEndMarker =
  '-- END EXACT SOURCE: 20260724110000_v1_bmc_general_intake_and_handoffs.sql\n';
const deploymentSeedStartMarker = '-- BEGIN EXACT SOURCE: 56_jagruksetu_bmc_intake.generated.sql\n';
const deploymentSeedEndMarker = '-- END EXACT SOURCE: 56_jagruksetu_bmc_intake.generated.sql\n';

const renderDeployment = ({ migration, seed, sourceHashes }) => {
  const migrationSha256 = sha256(migration);
  const seedSha256 = sha256(seed);
  const orderedSourcePayloadSha256 = sha256(`${migration}${seed}`);

  return `-- JagrukSetu BMC intake V1 SQL Editor deployment
-- Generated by scripts/generate-jagruksetu-bmc-intake.mjs. Do not edit manually.
--
-- Purpose:
--   Apply the protected-handoff schema/RPC migration and the deterministic
--   Mumbai V1 intake seed as one auditable SQL Editor payload.
--
-- Prerequisites:
--   1. Apply repository migrations through
--      20260724100000_require_email_identity_for_auth_signup.sql.
--   2. Load BMC governance/contact seed 54 and JagrukSetu taxonomy seed 55.
--   3. Run this complete file once in the hosted Supabase SQL Editor.
--
-- Dataset: ${datasetKey} ${datasetVersion}
-- Taxonomy source SHA-256: ${sourceHashes.taxonomy}
-- Source registry SHA-256: ${sourceHashes.sourceRegistry}
-- Protected handoff actions SHA-256: ${sourceHashes.handoffActions}
-- Migration source SHA-256: ${migrationSha256}
-- Seed source SHA-256: ${seedSha256}
-- Ordered migration+seed payload SHA-256: ${orderedSourcePayloadSha256}

${deploymentMigrationStartMarker}${migration}${deploymentMigrationEndMarker}
${deploymentSeedStartMarker}${seed}${deploymentSeedEndMarker}`;
};

const writeOrCheck = async (path, expected) => {
  if (checkOnly) {
    const current = await readFile(path, 'utf8').catch(() => null);
    if (current !== expected) {
      throw new Error(
        `${repositoryPath(path)} is missing or stale. Run ` +
          '`pnpm governance:jagruksetu:intake:generate`.',
      );
    }
    return;
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, expected, 'utf8');
};

const main = async () => {
  const [taxonomySource, sourceRegistrySource, handoffActionsSource, migration] = await Promise.all(
    [
      readFile(taxonomyPath, 'utf8').then(ensureTrailingNewline),
      readFile(sourceRegistryPath, 'utf8').then(ensureTrailingNewline),
      readFile(handoffActionsPath, 'utf8').then(ensureTrailingNewline),
      readFile(migrationPath, 'utf8').then(ensureTrailingNewline),
    ],
  );
  const sourceHashes = Object.freeze({
    taxonomy: sha256(taxonomySource),
    sourceRegistry: sha256(sourceRegistrySource),
    handoffActions: sha256(handoffActionsSource),
    migration: sha256(migration),
  });
  const { categories, subcategories } = parseTaxonomy(taxonomySource);
  const sources = parseSourceRegistry(sourceRegistrySource);
  const sourceByKey = new Map(sources.map((source) => [source.source_key, source]));
  const taxonomyCodes = new Set([
    ...categories.map(({ code }) => code),
    ...subcategories.map(({ code }) => code),
  ]);
  const actions = parseHandoffActions(handoffActionsSource, sourceByKey, taxonomyCodes);
  const { mappings, counts } = buildMappings(subcategories, actions);

  const routeMap = renderRouteMap(mappings);
  const importReady = jsonDocument({
    schemaVersion: 1,
    datasetKey,
    datasetVersion,
    municipality: 'Brihanmumbai Municipal Corporation',
    routingProfile: {
      code: genericProfileCode,
      routeRuleCode: genericRuleCode,
      wardCount: 26,
    },
    mappings: mappings.map((mapping) => ({
      taxonomyCode: mapping.code,
      primaryCode: mapping.primaryCode,
      name: mapping.name,
      workflowType: mapping.workflowType,
      sensitivityClass: mapping.sensitivityClass,
      routeMode: mapping.routeMode,
      routingProfileCode: mapping.routingProfileCode,
      routingStatus: mapping.routingStatus,
      submissionAvailable: mapping.submissionAvailable,
      handoffActionKeys: mapping.actionKeys,
    })),
    handoffActions: actions.map((action) => ({
      taxonomyCode: action.taxonomyCode,
      key: action.key,
      kind: action.kind,
      label: action.label,
      description: action.description,
      target: action.target,
      priority: action.priority,
      sourceUrl: action.sourceUrl,
      sourceLocator: action.sourceLocator,
      sourceAsOf: action.sourceAsOf,
      lastCheckedOn: action.lastCheckedOn,
    })),
  });
  assert(!/@[^/\s]+/u.test(importReady), 'Import-ready output must not contain email addresses.');

  const validationReport = jsonDocument({
    schemaVersion: 1,
    datasetKey,
    datasetVersion,
    valid: true,
    sourceHashes,
    counts: {
      taxonomyPrimaryCategories: categories.length,
      taxonomyLeaves: counts.total,
      specializedWardLeaves: counts.specializedWard,
      genericWardLeaves: counts.genericWard,
      internallyMappedLeaves: counts.specializedWard + counts.genericWard,
      protectedHandoffLeaves: counts.protectedHandoff,
      pendingLeaves: 0,
      distinctOperationalProfiles: 13,
      BmcOperationalWards: wards.length,
      expectedPrivateWardContacts: wards.length * 13,
      officialSources: sources.length,
      handoffActions: actions.length,
    },
    checks: [
      'All 340 taxonomy leaves are classified exactly once.',
      'The 13 existing specialized route mappings are preserved.',
      'The remaining 243 PUBLIC or RESTRICTED leaves use the generic ward profile.',
      'All 84 PRIVATE or EMERGENCY_PRIVATE leaves use official handoff actions.',
      'No client-visible action contains an email address.',
      'Every browser target is HTTPS on an approved official host.',
      'Every call target contains only 3 to 15 digits.',
    ],
  });
  const seed = ensureTrailingNewline(renderSeed({ mappings, actions, sourceHashes }));
  const deployment = ensureTrailingNewline(renderDeployment({ migration, seed, sourceHashes }));

  const artifactHashes = {
    [repositoryPath(routeMapPath)]: sha256(routeMap),
    [repositoryPath(importReadyPath)]: sha256(importReady),
    [repositoryPath(validationReportPath)]: sha256(validationReport),
    [repositoryPath(seedPath)]: sha256(seed),
    [repositoryPath(deploymentPath)]: sha256(deployment),
  };
  const manifest = jsonDocument({
    schemaVersion: 1,
    datasetKey,
    datasetVersion,
    sourceFiles: {
      [repositoryPath(taxonomyPath)]: sourceHashes.taxonomy,
      [repositoryPath(sourceRegistryPath)]: sourceHashes.sourceRegistry,
      [repositoryPath(handoffActionsPath)]: sourceHashes.handoffActions,
      [repositoryPath(migrationPath)]: sourceHashes.migration,
    },
    generatedFiles: artifactHashes,
  });
  const manifestValidation = jsonDocument({
    schemaVersion: 1,
    datasetKey,
    datasetVersion,
    valid: true,
    manifestSha256: sha256(manifest),
    sourceFileCount: 4,
    generatedFileCount: Object.keys(artifactHashes).length,
    taxonomyLeafCount: 340,
    internallyMappedLeafCount: 256,
    protectedHandoffLeafCount: 84,
    pendingLeafCount: 0,
  });

  await Promise.all([
    writeOrCheck(routeMapPath, routeMap),
    writeOrCheck(importReadyPath, importReady),
    writeOrCheck(validationReportPath, validationReport),
    writeOrCheck(seedPath, seed),
    writeOrCheck(deploymentPath, deployment),
    writeOrCheck(manifestPath, manifest),
    writeOrCheck(manifestValidationPath, manifestValidation),
  ]);

  process.stdout.write(
    `${checkOnly ? 'Checked' : 'Generated'} ${counts.total} JagrukSetu BMC V1 mappings: ` +
      `${counts.specializedWard} specialized ward, ${counts.genericWard} generic ward, ` +
      `${counts.protectedHandoff} protected handoff.\n`,
  );
};

await main();
