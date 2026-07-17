import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const sourcePaths = {
  workbook: join(repositoryRoot, 'resources/governance/MUMBAI_BMC_DEMO_BOOTSTRAP_DATA_v1.xlsx'),
  guide: join(repositoryRoot, 'resources/governance/MUMBAI_BMC_DEMO_BOOTSTRAP_GUIDE.md'),
  geometry: join(repositoryRoot, 'resources/governance/geometry/bmc-legacy-wards-2026.geojson'),
};

const outputPaths = {
  csvDirectory: join(repositoryRoot, 'resources/governance/csv/mumbai_bmc_demo_bootstrap_v1'),
  manifest: join(
    repositoryRoot,
    'resources/governance/manifests/mumbai-bmc-demo-bootstrap.v1.json',
  ),
  validation: join(
    repositoryRoot,
    'resources/governance/manifests/mumbai-bmc-demo-bootstrap.v1.validation.json',
  ),
  sql: join(repositoryRoot, 'supabase/seed/50_bmc_demo_governance.generated.sql'),
  checksumSql: join(repositoryRoot, 'supabase/seed/51_bmc_demo_governance_checksum.generated.sql'),
  routingSql: join(repositoryRoot, 'supabase/seed/52_bmc_demo_routing.generated.sql'),
  routingVerificationSql: join(
    repositoryRoot,
    'supabase/seed/53_bmc_demo_routing_verification.generated.sql',
  ),
};

const datasetVersion = 'MUMBAI_BMC_DEMO_BOOTSTRAP_DATA_v1';
const datasetKey = 'bmc_demo_governance';
const sourceLastCheckedOn = '2026-07-16';
const stableUuidNamespace = 'f4f74f8d-dfe5-5b1f-a5d2-64705c90d68c';
const bmcAuthorityId = '3fabe3b8-47cf-58fe-a59c-bb34bd02322a';
const bmcLocalBodyId = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd';
const maharashtraStateId = 'ed4e7b9a-45ef-5180-8b26-19ccac5f9fc6';
const maharashtraAuthorityId = '984805ee-52b9-5be0-bed2-3951cc6cab2d';
const bmcConnectUrl =
  'https://dm.mcgm.gov.in/assets/pdf/Final%20updated%20Final%20Connect%20Diary%202021.07.07.2021.pdf';
const bmcGeometrySourceUrl =
  'https://prsrvgisapp.mcgm.gov.in/server/rest/services/mcgm/MCGMGIS_Departments_Master_All_Layers_WGS/MapServer/238/query?where=1%3d1&outFields=GISMASTER.Wards.OBJECTID%2cGISMASTER.Wards.NAME%2cGISMASTER.Wards.FLAGID%2cGISMASTER.Wards.ZONE&returnGeometry=true&outSR=4326&orderByFields=GISMASTER.Wards.NAME&f=geojson';
const bmcGeometryLayerMetadataUrl =
  'https://prsrvgisapp.mcgm.gov.in/server/rest/services/mcgm/MCGMGIS_Departments_Master_All_Layers_WGS/MapServer/238?f=pjson';
const geometryLastCheckedOn = '2026-07-17';
const routingEffectiveFrom = '2026-06-18T00:00:00Z';
const routingLastVerifiedOn = '2026-07-16';

const bmcInternalRoutingConfiguration = Object.freeze({
  operationalWardCodes: Object.freeze([
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
    'K/W',
    'L',
    'M/E',
    'M/W',
    'N',
    'P/S',
    'R/S',
    'R/C',
    'R/N',
    'S',
    'T',
  ]),
  excludedSplitWardCodes: Object.freeze(['K/S', 'K/N', 'P/E', 'P/W']),
  legacyAnchorCodes: Object.freeze(['K/E', 'P/N']),
  categories: Object.freeze([
    Object.freeze({
      code: 'garbage_dump',
      departmentCode: 'BMC_SWM',
      routingReferenceCode: 'BMC_R001',
    }),
    Object.freeze({
      code: 'missed_sweeping',
      departmentCode: 'BMC_SWM',
      routingReferenceCode: 'BMC_R002',
    }),
    Object.freeze({
      code: 'mosquito_breeding',
      departmentCode: 'BMC_PUBLIC_HEALTH',
      routingReferenceCode: 'BMC_R009',
    }),
  ]),
});

const sourcePins = Object.freeze({
  workbook: 'f86b70b239807316f26d9d0164958dcc49953240a519a5edff65b04a1b829b26',
  guide: '24e9e176c97115243106401998676e751812323f3dbe19128df18b27c2655cd8',
  geometry: 'ca6f81f168159aa90a897680a6bed176f3d421acdc8841beeabf5c1aa751e1f0',
});

const sheetDefinitions = Object.freeze([
  {
    name: 'Authority',
    fileName: 'Authority.csv',
    expectedRecordCount: 1,
    naturalKey: ['authority_code'],
    headers: [
      'authority_code',
      'authority_name',
      'authority_type',
      'state',
      'district_scope',
      'head_office_address',
      'central_helpline',
      'whatsapp',
      'complaint_portal',
      'official_website',
      'source_status',
      'operational_approval_status',
      'demo_routable',
      'production_routable',
      'source_as_of',
      'last_checked',
      'source_url',
      'notes',
    ],
  },
  {
    name: 'Public Channels',
    fileName: 'Public_Channels.csv',
    expectedRecordCount: 5,
    naturalKey: ['channel_code'],
    headers: [
      'channel_code',
      'channel_name',
      'channel_type',
      'value',
      'scope',
      'purpose',
      'availability',
      'verification_status',
      'demo_use',
      'production_use',
      'source_url',
      'source_as_of',
    ],
  },
  {
    name: 'Senior Leadership',
    fileName: 'Senior_Leadership.csv',
    expectedRecordCount: 5,
    naturalKey: ['assignment_code'],
    headers: [
      'assignment_code',
      'authority_code',
      'scope_code',
      'role_title',
      'person_name',
      'office_phone',
      'mobile',
      'email',
      'office_name',
      'verification_status',
      'approval_status',
      'demo_routable',
      'production_routable',
      'source_as_of',
      'last_checked',
      'source_url',
      'source_reference',
    ],
  },
  {
    name: 'Zones',
    fileName: 'Zones.csv',
    expectedRecordCount: 7,
    naturalKey: ['zone_code'],
    headers: [
      'zone_code',
      'zone_name',
      'operational_ward_codes',
      'person_name',
      'role_title',
      'office_phone',
      'mobile',
      'email',
      'verification_status',
      'approval_status',
      'demo_routable',
      'production_routable',
      'source_as_of',
      'last_checked',
      'source_url',
      'source_reference',
    ],
  },
  {
    name: 'Ward Offices',
    fileName: 'Ward_Offices.csv',
    expectedRecordCount: 26,
    naturalKey: ['operational_ward_code'],
    headers: [
      'operational_ward_code',
      'display_name',
      'zone_code',
      'legacy_parent_geometry_code',
      'office_address',
      'ward_office_phone',
      'control_room_contact',
      'assistant_commissioner_name',
      'assistant_commissioner_role',
      'assistant_commissioner_office_phone',
      'assistant_commissioner_mobile',
      'assistant_commissioner_email',
      'complaint_officer_name',
      'complaint_officer_role',
      'complaint_officer_contact',
      'verification_status',
      'approval_status',
      'demo_routable',
      'production_routable',
      'source_as_of',
      'last_checked',
      'source_url',
      'source_reference',
    ],
  },
  {
    name: 'Ward Crosswalk',
    fileName: 'Ward_Crosswalk.csv',
    expectedRecordCount: 26,
    naturalKey: ['geometry_ward_code', 'operational_ward_code'],
    headers: [
      'geometry_ward_code',
      'operational_ward_code',
      'relationship_type',
      'routing_instruction',
      'automatic_demo_route_allowed',
      'notes',
    ],
  },
  {
    name: 'Departments',
    fileName: 'Departments.csv',
    expectedRecordCount: 20,
    naturalKey: ['department_code'],
    headers: [
      'department_code',
      'department_name',
      'durable_role',
      'person_name',
      'office_phone',
      'mobile',
      'email',
      'helpline',
      'scope',
      'verification_status',
      'approval_status',
      'demo_routable',
      'production_routable',
      'source_as_of',
      'source_url',
      'notes',
    ],
  },
  {
    name: 'Complaint Routing',
    fileName: 'Complaint_Routing.csv',
    expectedRecordCount: 14,
    naturalKey: ['rule_code'],
    headers: [
      'rule_code',
      'category_code',
      'category_description',
      'asset_type',
      'primary_department_code',
      'first_scope',
      'first_recipient_role',
      'ward_fallback_role',
      'department_escalation_code',
      'final_fallback_channel',
      'priority',
      'asset_owner_required',
      'verification_status',
      'demo_active',
      'production_active',
      'notes',
    ],
  },
  {
    name: 'Source Registry',
    fileName: 'Source_Registry.csv',
    expectedRecordCount: 4,
    naturalKey: ['source_code'],
    headers: [
      'source_code',
      'source_name',
      'source_type',
      'source_url',
      'publisher',
      'data_scope',
      'source_as_of',
      'refresh_schedule',
      'trust_level',
      'notes',
    ],
  },
  {
    name: 'Activation Policy',
    fileName: 'Activation_Policy.csv',
    expectedRecordCount: 6,
    naturalKey: ['state_or_flag'],
    headers: ['state_or_flag', 'meaning', 'allowed_in_demo', 'allowed_in_production'],
  },
]);

const expectedWorkbookSheets = Object.freeze([
  'README',
  ...sheetDefinitions.map(({ name }) => name),
]);
const normalizedSheetNames = new Set([
  'Authority',
  'Senior Leadership',
  'Zones',
  'Ward Offices',
  'Ward Crosswalk',
  'Departments',
  'Complaint Routing',
]);

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const normalizeGovernanceKey = (value) =>
  value.normalize('NFKC').trim().toLocaleLowerCase('en-US').replaceAll(/\s+/gu, ' ');

const uuidBytes = (value) => Buffer.from(value.replaceAll('-', ''), 'hex');

const formatUuid = (value) => {
  const hex = value.toString('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)]
    .join('-')
    .toLowerCase();
};

const stableGovernanceUuid = (kind, naturalKey) => {
  const digest = createHash('sha1')
    .update(uuidBytes(stableUuidNamespace))
    .update(Buffer.from(`${kind}:${naturalKey}`, 'utf8'))
    .digest()
    .subarray(0, 16);

  digest[6] = ((digest[6] ?? 0) & 0x0f) | 0x50;
  digest[8] = ((digest[8] ?? 0) & 0x3f) | 0x80;
  return formatUuid(digest);
};

const repositoryPath = (absolutePath) =>
  relative(repositoryRoot, absolutePath).replaceAll('\\', '/');

const decodeXml = (value) =>
  value
    .replaceAll(/&#x([0-9a-f]+);/giu, (_, codePoint) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16)),
    )
    .replaceAll(/&#([0-9]+);/gu, (_, codePoint) =>
      String.fromCodePoint(Number.parseInt(codePoint, 10)),
    )
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');

const escapeRegularExpression = (value) => value.replaceAll(/[.*+?^${}()|[\]\\]/gu, '\\$&');

const xmlAttribute = (attributes, name) => {
  const match = new RegExp(`${escapeRegularExpression(name)}="([^"]*)"`, 'u').exec(attributes);
  return match === null ? null : decodeXml(match[1] ?? '');
};

const zipEntries = (archive) => {
  const endOfDirectorySignature = 0x06054b50;
  const centralDirectorySignature = 0x02014b50;
  const localFileSignature = 0x04034b50;
  const earliestEndOfDirectory = Math.max(0, archive.length - 65_557);
  let endOfDirectoryOffset = -1;
  for (let offset = archive.length - 22; offset >= earliestEndOfDirectory; offset -= 1) {
    if (archive.readUInt32LE(offset) === endOfDirectorySignature) {
      endOfDirectoryOffset = offset;
      break;
    }
  }
  if (endOfDirectoryOffset === -1) {
    throw new Error('Workbook is not a supported ZIP archive: end-of-directory record missing.');
  }

  const entryCount = archive.readUInt16LE(endOfDirectoryOffset + 10);
  let centralDirectoryOffset = archive.readUInt32LE(endOfDirectoryOffset + 16);
  const entries = new Map();
  for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
    if (archive.readUInt32LE(centralDirectoryOffset) !== centralDirectorySignature) {
      throw new Error(`Workbook ZIP central directory entry ${entryIndex} is malformed.`);
    }
    const flags = archive.readUInt16LE(centralDirectoryOffset + 8);
    const compressionMethod = archive.readUInt16LE(centralDirectoryOffset + 10);
    const compressedSize = archive.readUInt32LE(centralDirectoryOffset + 20);
    const uncompressedSize = archive.readUInt32LE(centralDirectoryOffset + 24);
    const fileNameLength = archive.readUInt16LE(centralDirectoryOffset + 28);
    const extraFieldLength = archive.readUInt16LE(centralDirectoryOffset + 30);
    const commentLength = archive.readUInt16LE(centralDirectoryOffset + 32);
    const localHeaderOffset = archive.readUInt32LE(centralDirectoryOffset + 42);
    const fileNameStart = centralDirectoryOffset + 46;
    const fileName = archive
      .subarray(fileNameStart, fileNameStart + fileNameLength)
      .toString((flags & 0x0800) === 0 ? 'latin1' : 'utf8');

    if ((flags & 0x0001) !== 0) {
      throw new Error(`Encrypted ZIP member ${fileName} is not supported.`);
    }
    if (archive.readUInt32LE(localHeaderOffset) !== localFileSignature) {
      throw new Error(`Workbook ZIP local header for ${fileName} is malformed.`);
    }
    const localFileNameLength = archive.readUInt16LE(localHeaderOffset + 26);
    const localExtraFieldLength = archive.readUInt16LE(localHeaderOffset + 28);
    const compressedDataStart =
      localHeaderOffset + 30 + localFileNameLength + localExtraFieldLength;
    const compressedData = archive.subarray(
      compressedDataStart,
      compressedDataStart + compressedSize,
    );
    let contents;
    if (compressionMethod === 0) {
      contents = Buffer.from(compressedData);
    } else if (compressionMethod === 8) {
      contents = inflateRawSync(compressedData);
    } else {
      throw new Error(
        `Workbook ZIP member ${fileName} uses unsupported compression method ${compressionMethod}.`,
      );
    }
    if (contents.length !== uncompressedSize) {
      throw new Error(
        `Workbook ZIP member ${fileName} expected ${uncompressedSize} bytes; received ${contents.length}.`,
      );
    }
    entries.set(fileName.replace(/^\/+/, ''), contents);
    centralDirectoryOffset += 46 + fileNameLength + extraFieldLength + commentLength;
  }
  return entries;
};

const zipMember = (entries, memberPath) => {
  const value = entries.get(memberPath);
  if (value === undefined) {
    throw new Error(`Workbook ZIP member ${memberPath} is missing.`);
  }
  return value.toString('utf8').replace(/^\uFEFF/u, '');
};

const parseSharedStrings = (xml) => {
  const values = [];
  for (const item of xml.matchAll(/<x:si\b[^>]*>([\s\S]*?)<\/x:si>/gu)) {
    const text = [...(item[1] ?? '').matchAll(/<x:t\b[^>]*>([\s\S]*?)<\/x:t>/gu)]
      .map((match) => decodeXml(match[1] ?? ''))
      .join('');
    values.push(text);
  }
  return values;
};

const spreadsheetColumnIndex = (reference) => {
  const columnName = /^[A-Z]+/u.exec(reference)?.[0];
  if (columnName === undefined) {
    throw new Error(`Invalid spreadsheet cell reference: ${reference}.`);
  }

  let value = 0;
  for (const character of columnName) {
    value = value * 26 + character.charCodeAt(0) - 64;
  }
  return value - 1;
};

const parseCellValue = (attributes, contents, sharedStrings) => {
  if (contents === undefined) {
    return '';
  }
  const cellType = xmlAttribute(attributes, 't');
  if (cellType === 'inlineStr') {
    return [...contents.matchAll(/<x:t\b[^>]*>([\s\S]*?)<\/x:t>/gu)]
      .map((match) => decodeXml(match[1] ?? ''))
      .join('');
  }

  const rawValue = /<x:v\b[^>]*>([\s\S]*?)<\/x:v>/u.exec(contents)?.[1] ?? '';
  const value = decodeXml(rawValue);
  if (cellType === 's') {
    const sharedValue = sharedStrings[Number.parseInt(value, 10)];
    if (sharedValue === undefined) {
      throw new Error(`Spreadsheet references an unknown shared string index: ${value}.`);
    }
    return sharedValue;
  }
  if (cellType === 'b') {
    return value === '1' ? 'true' : 'false';
  }
  return value;
};

const parseWorksheet = (xml, sharedStrings) => {
  if (/<x:f(?:\s[^>]*)?>/u.test(xml)) {
    throw new Error('Cell formulas are not allowed in the BMC bootstrap source tables.');
  }

  const rows = [];
  for (const rowMatch of xml.matchAll(/<x:row\b([^>]*)>([\s\S]*?)<\/x:row>/gu)) {
    const sourceRow = Number.parseInt(xmlAttribute(rowMatch[1] ?? '', 'r') ?? '', 10);
    if (!Number.isInteger(sourceRow)) {
      throw new Error('Spreadsheet row is missing its numeric row reference.');
    }
    const values = [];
    const rowContents = rowMatch[2] ?? '';
    for (const cellMatch of rowContents.matchAll(/<x:c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/x:c>)/gu)) {
      const attributes = cellMatch[1] ?? '';
      const reference = xmlAttribute(attributes, 'r');
      if (reference === null) {
        throw new Error(`Spreadsheet cell on row ${sourceRow} is missing its reference.`);
      }
      values[spreadsheetColumnIndex(reference)] = parseCellValue(
        attributes,
        cellMatch[2],
        sharedStrings,
      );
    }
    rows.push({ sourceRow, values });
  }
  return rows;
};

const parseWorkbook = (workbookBytes) => {
  const entries = zipEntries(workbookBytes);
  const workbookXml = zipMember(entries, 'xl/workbook.xml');
  const relationshipsXml = zipMember(entries, 'xl/_rels/workbook.xml.rels');
  const sharedStringsXml = zipMember(entries, 'xl/sharedStrings.xml');
  const relationships = new Map();
  for (const relationship of relationshipsXml.matchAll(/<Relationship\b([^>]*)\/>/gu)) {
    const attributes = relationship[1] ?? '';
    const id = xmlAttribute(attributes, 'Id');
    const target = xmlAttribute(attributes, 'Target');
    if (id !== null && target !== null) {
      relationships.set(id, target.replace(/^\/+/, ''));
    }
  }

  const sheets = [];
  for (const sheet of workbookXml.matchAll(/<x:sheet\b([^>]*)\/>/gu)) {
    const attributes = sheet[1] ?? '';
    const name = xmlAttribute(attributes, 'name');
    const relationshipId = xmlAttribute(attributes, 'r:id');
    const memberPath = relationshipId === null ? undefined : relationships.get(relationshipId);
    if (name === null || memberPath === undefined) {
      throw new Error('Workbook sheet relationship metadata is incomplete.');
    }
    sheets.push({ name, memberPath });
  }

  const sharedStrings = parseSharedStrings(sharedStringsXml);
  const tables = new Map();
  for (const definition of sheetDefinitions) {
    const sheet = sheets.find(({ name }) => name === definition.name);
    if (sheet === undefined) {
      continue;
    }
    const worksheetXml = zipMember(entries, sheet.memberPath);
    const worksheetRows = parseWorksheet(worksheetXml, sharedStrings);
    const headerRow = worksheetRows.find(({ sourceRow }) => sourceRow === 2);
    const rows = worksheetRows
      .filter(({ sourceRow, values }) => sourceRow > 2 && values.some((value) => value !== ''))
      .map(({ sourceRow, values }) => ({
        sourceRow,
        values: Object.fromEntries(
          definition.headers.map((header, index) => [header, values[index] ?? '']),
        ),
      }));
    tables.set(definition.name, {
      definition,
      headers: headerRow?.values.map((value) => value ?? '') ?? [],
      rows,
    });
  }

  return { sheetNames: sheets.map(({ name }) => name), tables };
};

const addDiagnostic = (diagnostics, severity, code, message, location = {}) => {
  diagnostics.push({ severity, code, message, ...location });
};

const strictIsoDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (match === null) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
};

const isHttpsUrl = (value) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const splitCodes = (value) =>
  value
    .split(/[;,]/u)
    .map((item) => item.trim())
    .filter(Boolean);

const geometryProperty = (feature, name) => {
  const properties = feature.properties ?? {};
  if (properties[name] !== undefined) {
    return properties[name];
  }
  const namespacedEntry = Object.entries(properties).find(([key]) => key.endsWith(`.${name}`));
  return namespacedEntry?.[1];
};

const validateRows = (workbook, geometry) => {
  const diagnostics = [];
  const actualSheets = [...workbook.sheetNames].sort();
  const expectedSheets = [...expectedWorkbookSheets].sort();
  if (JSON.stringify(actualSheets) !== JSON.stringify(expectedSheets)) {
    addDiagnostic(
      diagnostics,
      'error',
      'WORKBOOK_SHEETS_MISMATCH',
      `Expected sheets ${expectedSheets.join(', ')}; received ${actualSheets.join(', ')}.`,
    );
  }

  for (const definition of sheetDefinitions) {
    const table = workbook.tables.get(definition.name);
    if (table === undefined) {
      addDiagnostic(
        diagnostics,
        'error',
        'MISSING_SHEET',
        `Required sheet ${definition.name} is missing.`,
        { sheet: definition.name },
      );
      continue;
    }
    if (JSON.stringify(table.headers) !== JSON.stringify(definition.headers)) {
      addDiagnostic(
        diagnostics,
        'error',
        'HEADER_MISMATCH',
        `Sheet ${definition.name} does not match its pinned header schema.`,
        { sheet: definition.name, sourceRow: 2 },
      );
    }
    if (table.rows.length !== definition.expectedRecordCount) {
      addDiagnostic(
        diagnostics,
        'error',
        'RECORD_COUNT_MISMATCH',
        `Sheet ${definition.name} expected ${definition.expectedRecordCount} records; received ${table.rows.length}.`,
        { sheet: definition.name },
      );
    }

    const naturalKeys = new Map();
    for (const row of table.rows) {
      for (const [field, value] of Object.entries(row.values)) {
        if (value !== value.trim()) {
          addDiagnostic(
            diagnostics,
            'error',
            'UNTRIMMED_VALUE',
            `${definition.name}.${field} contains leading or trailing whitespace.`,
            { sheet: definition.name, sourceRow: row.sourceRow, field },
          );
        }
      }
      const naturalKey = definition.naturalKey.map((field) => row.values[field]).join(' | ');
      if (definition.naturalKey.some((field) => row.values[field] === '')) {
        addDiagnostic(
          diagnostics,
          'error',
          'MISSING_NATURAL_KEY',
          `Sheet ${definition.name} has an incomplete natural key.`,
          { sheet: definition.name, sourceRow: row.sourceRow },
        );
      } else if (naturalKeys.has(naturalKey)) {
        addDiagnostic(
          diagnostics,
          'error',
          'DUPLICATE_NATURAL_KEY',
          `Sheet ${definition.name} duplicates natural key ${naturalKey}.`,
          { sheet: definition.name, sourceRow: row.sourceRow },
        );
      } else {
        naturalKeys.set(naturalKey, row.sourceRow);
      }

      for (const field of ['source_as_of', 'last_checked']) {
        const value = row.values[field];
        if (value !== undefined && value !== '' && !strictIsoDate(value)) {
          addDiagnostic(
            diagnostics,
            'error',
            'INVALID_DATE',
            `${definition.name}.${field} must be a valid YYYY-MM-DD date.`,
            { sheet: definition.name, sourceRow: row.sourceRow, field },
          );
        }
      }
      for (const field of ['source_url', 'complaint_portal', 'official_website']) {
        const value = row.values[field];
        if (value !== undefined && value !== '' && !isHttpsUrl(value)) {
          addDiagnostic(
            diagnostics,
            'error',
            'INVALID_HTTPS_URL',
            `${definition.name}.${field} must be an HTTPS URL.`,
            { sheet: definition.name, sourceRow: row.sourceRow, field },
          );
        }
      }
      if (row.values.value?.startsWith('http') && !isHttpsUrl(row.values.value)) {
        addDiagnostic(
          diagnostics,
          'error',
          'INVALID_CHANNEL_URL',
          'Public channel URL values must use HTTPS.',
          { sheet: definition.name, sourceRow: row.sourceRow, field: 'value' },
        );
      }
      for (const [field, value] of Object.entries(row.values)) {
        if (/^(vacant|placeholder|unknown|tbd)$/iu.test(value)) {
          addDiagnostic(
            diagnostics,
            'warning',
            'PLACEHOLDER_VALUE_PRESERVED',
            `${definition.name}.${field} preserves the source value ${value}.`,
            { sheet: definition.name, sourceRow: row.sourceRow, field },
          );
        }
        if (field.includes('verification_status') && value.includes('malformed')) {
          addDiagnostic(
            diagnostics,
            'warning',
            'SOURCE_MALFORMED_VALUE_OMITTED',
            `${definition.name} explicitly records an omitted malformed source value.`,
            { sheet: definition.name, sourceRow: row.sourceRow, field },
          );
        }
      }
    }
  }

  const booleanContracts = [
    ['Authority', 'demo_routable', new Set(['true', 'false'])],
    ['Authority', 'production_routable', new Set(['true', 'false'])],
    ['Senior Leadership', 'demo_routable', new Set(['true', 'false'])],
    ['Senior Leadership', 'production_routable', new Set(['true', 'false'])],
    ['Zones', 'demo_routable', new Set(['true', 'false'])],
    ['Zones', 'production_routable', new Set(['true', 'false'])],
    ['Ward Offices', 'demo_routable', new Set(['true', 'false', 'conditional'])],
    ['Ward Offices', 'production_routable', new Set(['true', 'false'])],
    ['Ward Crosswalk', 'automatic_demo_route_allowed', new Set(['true', 'false'])],
    ['Departments', 'demo_routable', new Set(['true', 'false'])],
    ['Departments', 'production_routable', new Set(['true', 'false'])],
    ['Complaint Routing', 'asset_owner_required', new Set(['true', 'false'])],
    ['Complaint Routing', 'demo_active', new Set(['true', 'false'])],
    ['Complaint Routing', 'production_active', new Set(['true', 'false'])],
  ];
  for (const [sheetName, field, allowedValues] of booleanContracts) {
    for (const row of workbook.tables.get(sheetName)?.rows ?? []) {
      const value = row.values[field] ?? '';
      if (!allowedValues.has(value)) {
        addDiagnostic(
          diagnostics,
          'error',
          'INVALID_BOOLEAN_FLAG',
          `${sheetName}.${field} has unsupported value ${value || '<blank>'}.`,
          { sheet: sheetName, sourceRow: row.sourceRow, field },
        );
      }
    }
  }

  for (const [sheetName, field] of [
    ['Authority', 'production_routable'],
    ['Senior Leadership', 'production_routable'],
    ['Zones', 'production_routable'],
    ['Ward Offices', 'production_routable'],
    ['Departments', 'production_routable'],
    ['Complaint Routing', 'production_active'],
  ]) {
    for (const row of workbook.tables.get(sheetName)?.rows ?? []) {
      if (row.values[field] !== 'false') {
        addDiagnostic(
          diagnostics,
          'error',
          'PRODUCTION_ACTIVATION_FORBIDDEN',
          `${sheetName}.${field} must remain false in the demo bootstrap pack.`,
          { sheet: sheetName, sourceRow: row.sourceRow, field },
        );
      }
    }
  }

  const authorities = new Set(
    (workbook.tables.get('Authority')?.rows ?? []).map(({ values }) => values.authority_code),
  );
  const zones = new Set(
    (workbook.tables.get('Zones')?.rows ?? []).map(({ values }) => values.zone_code),
  );
  const wards = new Set(
    (workbook.tables.get('Ward Offices')?.rows ?? []).map(
      ({ values }) => values.operational_ward_code,
    ),
  );
  const departments = new Set(
    (workbook.tables.get('Departments')?.rows ?? []).map(({ values }) => values.department_code),
  );
  const channels = new Set(
    (workbook.tables.get('Public Channels')?.rows ?? []).map(({ values }) => values.channel_code),
  );
  const geometryWardCodes = new Set(
    geometry.features.map((feature) => geometryProperty(feature, 'NAME')),
  );

  for (const row of workbook.tables.get('Senior Leadership')?.rows ?? []) {
    if (!authorities.has(row.values.authority_code)) {
      addDiagnostic(diagnostics, 'error', 'UNKNOWN_AUTHORITY', 'Leadership authority is unknown.', {
        sheet: 'Senior Leadership',
        sourceRow: row.sourceRow,
        field: 'authority_code',
      });
    }
  }
  for (const row of workbook.tables.get('Ward Offices')?.rows ?? []) {
    if (!zones.has(row.values.zone_code)) {
      addDiagnostic(diagnostics, 'error', 'UNKNOWN_ZONE', 'Ward office zone is unknown.', {
        sheet: 'Ward Offices',
        sourceRow: row.sourceRow,
        field: 'zone_code',
      });
    }
    if (row.values.demo_routable === 'conditional') {
      addDiagnostic(
        diagnostics,
        'warning',
        'CONDITIONAL_WARD_ROUTING',
        `${row.values.operational_ward_code} requires a reviewed split-ward crosswalk before automatic routing.`,
        { sheet: 'Ward Offices', sourceRow: row.sourceRow, field: 'demo_routable' },
      );
    }
  }
  const zoneWardCoverage = new Set();
  for (const row of workbook.tables.get('Zones')?.rows ?? []) {
    for (const wardCode of splitCodes(row.values.operational_ward_codes ?? '')) {
      if (!wards.has(wardCode)) {
        addDiagnostic(
          diagnostics,
          'error',
          'UNKNOWN_ZONE_WARD',
          `Zone ${row.values.zone_code} references unknown ward ${wardCode}.`,
          { sheet: 'Zones', sourceRow: row.sourceRow, field: 'operational_ward_codes' },
        );
      }
      if (zoneWardCoverage.has(wardCode)) {
        addDiagnostic(
          diagnostics,
          'error',
          'DUPLICATE_ZONE_WARD',
          `Operational ward ${wardCode} appears in more than one zone.`,
          { sheet: 'Zones', sourceRow: row.sourceRow, field: 'operational_ward_codes' },
        );
      }
      zoneWardCoverage.add(wardCode);
    }
  }
  for (const wardCode of wards) {
    if (!zoneWardCoverage.has(wardCode)) {
      addDiagnostic(
        diagnostics,
        'error',
        'WARD_WITHOUT_ZONE',
        `Operational ward ${wardCode} is absent from zone coverage.`,
      );
    }
  }

  const crosswalkGeometryCodes = new Set();
  const crosswalkOperationalCodes = new Set();
  for (const row of workbook.tables.get('Ward Crosswalk')?.rows ?? []) {
    const geometryCode = row.values.geometry_ward_code;
    const operationalCode = row.values.operational_ward_code;
    crosswalkGeometryCodes.add(geometryCode);
    crosswalkOperationalCodes.add(operationalCode);
    if (!geometryWardCodes.has(geometryCode)) {
      addDiagnostic(
        diagnostics,
        'error',
        'UNKNOWN_GEOMETRY_WARD',
        `Crosswalk references geometry ward ${geometryCode}, which is absent from GeoJSON.`,
        { sheet: 'Ward Crosswalk', sourceRow: row.sourceRow, field: 'geometry_ward_code' },
      );
    }
    if (!wards.has(operationalCode)) {
      addDiagnostic(
        diagnostics,
        'error',
        'UNKNOWN_OPERATIONAL_WARD',
        `Crosswalk references unknown operational ward ${operationalCode}.`,
        { sheet: 'Ward Crosswalk', sourceRow: row.sourceRow, field: 'operational_ward_code' },
      );
    }
  }
  for (const geometryCode of geometryWardCodes) {
    if (!crosswalkGeometryCodes.has(geometryCode)) {
      addDiagnostic(
        diagnostics,
        'error',
        'GEOMETRY_WITHOUT_CROSSWALK',
        `Geometry ward ${geometryCode} has no operational crosswalk.`,
      );
    }
  }
  for (const wardCode of wards) {
    if (!crosswalkOperationalCodes.has(wardCode)) {
      addDiagnostic(
        diagnostics,
        'error',
        'WARD_WITHOUT_CROSSWALK',
        `Operational ward ${wardCode} has no geometry crosswalk.`,
      );
    }
  }

  for (const row of workbook.tables.get('Complaint Routing')?.rows ?? []) {
    for (const field of ['primary_department_code']) {
      if (!departments.has(row.values[field])) {
        addDiagnostic(
          diagnostics,
          'error',
          'UNKNOWN_ROUTING_DEPARTMENT',
          `Routing rule ${row.values.rule_code} references unknown department ${row.values[field]}.`,
          { sheet: 'Complaint Routing', sourceRow: row.sourceRow, field },
        );
      }
    }
    const escalationCode = row.values.department_escalation_code;
    if (!departments.has(escalationCode) && escalationCode !== 'regional_encroachment_contact') {
      addDiagnostic(
        diagnostics,
        'error',
        'UNKNOWN_ROUTING_ESCALATION',
        `Routing rule ${row.values.rule_code} references unknown escalation ${escalationCode}.`,
        {
          sheet: 'Complaint Routing',
          sourceRow: row.sourceRow,
          field: 'department_escalation_code',
        },
      );
    }
    if (!channels.has(row.values.final_fallback_channel)) {
      addDiagnostic(
        diagnostics,
        'error',
        'UNKNOWN_FALLBACK_CHANNEL',
        `Routing rule ${row.values.rule_code} references unknown fallback channel ${row.values.final_fallback_channel}.`,
        { sheet: 'Complaint Routing', sourceRow: row.sourceRow, field: 'final_fallback_channel' },
      );
    }
  }

  return diagnostics;
};

const validateGeometry = (geometry) => {
  const errors = [];
  if (geometry.type !== 'FeatureCollection' || !Array.isArray(geometry.features)) {
    throw new Error('BMC geometry must be a GeoJSON FeatureCollection.');
  }
  if (geometry.crs?.properties?.name !== 'EPSG:4326') {
    errors.push('BMC geometry CRS must be EPSG:4326.');
  }
  if (geometry.features.length !== 24) {
    errors.push(`BMC geometry expected 24 legacy wards; received ${geometry.features.length}.`);
  }

  const names = new Set();
  const bounds = { minLongitude: 180, minLatitude: 90, maxLongitude: -180, maxLatitude: -90 };
  const visitCoordinates = (coordinates) => {
    if (
      Array.isArray(coordinates) &&
      coordinates.length >= 2 &&
      typeof coordinates[0] === 'number' &&
      typeof coordinates[1] === 'number'
    ) {
      const [longitude, latitude] = coordinates;
      if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
        errors.push(`Coordinate ${longitude}, ${latitude} is outside EPSG:4326 bounds.`);
      }
      bounds.minLongitude = Math.min(bounds.minLongitude, longitude);
      bounds.minLatitude = Math.min(bounds.minLatitude, latitude);
      bounds.maxLongitude = Math.max(bounds.maxLongitude, longitude);
      bounds.maxLatitude = Math.max(bounds.maxLatitude, latitude);
      return;
    }
    if (!Array.isArray(coordinates)) {
      errors.push('Geometry coordinates contain a non-array member.');
      return;
    }
    for (const child of coordinates) {
      visitCoordinates(child);
    }
  };

  for (const feature of geometry.features) {
    const name = geometryProperty(feature, 'NAME');
    if (typeof name !== 'string' || name.trim() === '') {
      errors.push('Every geometry feature must have a non-empty NAME property.');
    } else if (names.has(name)) {
      errors.push(`Geometry ward ${name} is duplicated.`);
    } else {
      names.add(name);
    }
    if (!['Polygon', 'MultiPolygon'].includes(feature.geometry?.type)) {
      errors.push(`Geometry ward ${name ?? '<unknown>'} must be Polygon or MultiPolygon.`);
    } else {
      visitCoordinates(feature.geometry.coordinates);
    }
  }
  if (errors.length > 0) {
    throw new Error(`BMC geometry validation failed:\n- ${errors.join('\n- ')}`);
  }
  return bounds;
};

const csvCell = (value) => `"${value.replaceAll('"', '""')}"`;

const renderCsv = (table) =>
  [
    table.definition.headers.map(csvCell).join(','),
    ...table.rows.map(({ values }) =>
      table.definition.headers.map((header) => csvCell(values[header] ?? '')).join(','),
    ),
  ].join('\n') + '\n';

const sqlText = (value) => `'${value.replaceAll("'", "''")}'`;
const sqlJson = (value) => `${sqlText(JSON.stringify(value))}::jsonb`;

const sourceKey = (definition, values) =>
  definition.naturalKey.map((field) => values[field]).join(' | ');

const rowContainsPlaceholder = (values) =>
  Object.values(values).some((value) => /^(vacant|placeholder|unknown|tbd)$/iu.test(value));

const sqlNullableText = (value) => (value === null || value === '' ? 'null' : sqlText(value));
const sqlBoolean = (value) => (value ? 'true' : 'false');
const sqlTextArray = (values) =>
  values.length === 0
    ? `'{}'::text[]`
    : `array[${values.map((value) => sqlText(value)).join(', ')}]::text[]`;
const sourceReferenceSql = (url) =>
  `(select id from governance.reference_sources where url = ${sqlText(url)})`;

const renderInsert = (table, columns, rows, conflictClause) => {
  if (rows.length === 0) {
    return '';
  }
  return `insert into ${table} (
  ${columns.join(',\n  ')}
)
values
${rows.map((row) => `  (${row.join(', ')})`).join(',\n')}
${conflictClause};`;
};

const safeAssignmentKeyPart = (value) =>
  normalizeGovernanceKey(value)
    .replaceAll(/[^a-z0-9]+/gu, '_')
    .replaceAll(/^_+|_+$/gu, '');

const validOfficerName = (value) =>
  value !== '' &&
  !/^(vacant|placeholder|unknown|tbd)$/iu.test(value) &&
  normalizeGovernanceKey(value) !== 'bmc 1916 / complaint portal';

const contactEmail = (value) =>
  splitCodes(value)
    .find((part) => part.includes('@'))
    ?.toLocaleLowerCase('en-US') ?? '';

const contactPhone = (value) =>
  splitCodes(value).find((part) => !part.includes('@') && /\d/u.test(part)) ?? '';

const buildNormalizedGovernanceModel = ({ geometry, sourceRecords }) => {
  const sourceRecordByKey = new Map(
    sourceRecords.map((record) => [
      `${record.definition.name}:${sourceKey(record.definition, record.row.values)}`,
      record,
    ]),
  );
  const record = (sheetName, key) => {
    const value = sourceRecordByKey.get(`${sheetName}:${key}`);
    if (value === undefined) {
      throw new Error(`Missing parsed source record ${sheetName}:${key}.`);
    }
    return value;
  };
  const normalizationTargets = new Map();
  const normalizeTo = (sourceRecord, table, id) => {
    normalizationTargets.set(sourceRecord.id, { table, id });
  };

  const authorityRecord = record('Authority', 'BMC_MCGM');
  normalizeTo(authorityRecord, 'governance.authorities', bmcAuthorityId);

  const zoneIds = new Map();
  const zoneRows = [];
  for (const sourceRecord of sourceRecords.filter(
    ({ definition }) => definition.name === 'Zones',
  )) {
    const { values } = sourceRecord.row;
    const id = stableGovernanceUuid('administrative-unit', `bmc:${values.zone_code}`);
    zoneIds.set(values.zone_code, id);
    zoneRows.push({ id, sourceRecord });
    normalizeTo(sourceRecord, 'governance.administrative_units', id);
  }

  const wardIds = new Map();
  const operationalWardRows = [];
  for (const sourceRecord of sourceRecords.filter(
    ({ definition }) => definition.name === 'Ward Offices',
  )) {
    const { values } = sourceRecord.row;
    const id = stableGovernanceUuid(
      'ward',
      `brihanmumbai municipal corporation:${normalizeGovernanceKey(values.operational_ward_code)}`,
    );
    wardIds.set(values.operational_ward_code, id);
    operationalWardRows.push({ id, sourceRecord });
    normalizeTo(sourceRecord, 'governance.wards', id);
  }

  const crosswalkRecords = sourceRecords.filter(
    ({ definition }) => definition.name === 'Ward Crosswalk',
  );
  const legacyGeometryWardCodes = new Set(
    crosswalkRecords
      .filter(({ row }) => row.values.relationship_type === 'one_to_many_child')
      .map(({ row }) => row.values.geometry_ward_code),
  );
  const geometryAnchorWardIds = new Map(
    [...legacyGeometryWardCodes].map((code) => [
      code,
      stableGovernanceUuid('ward', `bmc:legacy-boundary:${normalizeGovernanceKey(code)}`),
    ]),
  );
  const boundaryIds = new Map(
    geometry.features.map((feature) => {
      const code = geometryProperty(feature, 'NAME');
      return [code, stableGovernanceUuid('jurisdiction-boundary', `bmc:${code}:1`)];
    }),
  );
  const localBodyBoundaryId = stableGovernanceUuid(
    'jurisdiction-boundary',
    'bmc:local-body-union:1',
  );

  const departmentIds = new Map();
  const authorityDepartmentIds = new Map();
  const departmentRows = [];
  for (const sourceRecord of sourceRecords.filter(
    ({ definition }) => definition.name === 'Departments',
  )) {
    const { values } = sourceRecord.row;
    const code = values.department_code.toLocaleLowerCase('en-US');
    const id = stableGovernanceUuid('department', code);
    const authorityDepartmentId = stableGovernanceUuid(
      'authority-department',
      `${bmcAuthorityId}:${id}`,
    );
    departmentIds.set(values.department_code, id);
    authorityDepartmentIds.set(values.department_code, authorityDepartmentId);
    departmentRows.push({ id, authorityDepartmentId, sourceRecord });
    normalizeTo(sourceRecord, 'governance.departments', id);
  }

  const headquartersOfficeId = stableGovernanceUuid('office', 'bmc:headquarters');
  const wardOfficeIds = new Map(
    operationalWardRows.map(({ sourceRecord }) => {
      const code = sourceRecord.row.values.operational_ward_code;
      return [code, stableGovernanceUuid('office', `bmc:ward:${normalizeGovernanceKey(code)}`)];
    }),
  );
  const departmentOfficeIds = new Map(
    departmentRows.map(({ sourceRecord }) => {
      const code = sourceRecord.row.values.department_code;
      return [
        code,
        stableGovernanceUuid('office', `bmc:department:${normalizeGovernanceKey(code)}`),
      ];
    }),
  );

  const roles = new Map();
  const registerRole = (code, name, sourceRecord, responsibility, coverage) => {
    const existing = roles.get(code);
    if (existing !== undefined) {
      return existing.id;
    }
    const id = stableGovernanceUuid('officer-role', code);
    roles.set(code, { id, code, name, sourceRecord, responsibility, coverage });
    return id;
  };
  const firstWardRecord = operationalWardRows[0]?.sourceRecord;
  const firstZoneRecord = zoneRows[0]?.sourceRecord;
  if (firstWardRecord === undefined || firstZoneRecord === undefined) {
    throw new Error('BMC role normalization requires ward and zone source records.');
  }
  const wardAssistantCommissionerRoleId = registerRole(
    'bmc_ward_assistant_commissioner',
    'Assistant Commissioner — Ward',
    firstWardRecord,
    'Durable administrative head for one BMC operational ward office.',
    'Operational ward',
  );
  const wardComplaintOfficerRoleId = registerRole(
    'bmc_ward_complaint_officer',
    'Complaint Officer — Ward',
    firstWardRecord,
    'Durable complaint coordination role for one BMC operational ward office.',
    'Operational ward',
  );
  const zoneDeputyCommissionerRoleId = registerRole(
    'bmc_zone_deputy_municipal_commissioner',
    'Deputy Municipal Commissioner — Zone',
    firstZoneRecord,
    'Durable administrative escalation role for one BMC zone.',
    'Administrative zone',
  );

  const leadershipRoleIds = new Map();
  for (const sourceRecord of sourceRecords.filter(
    ({ definition }) => definition.name === 'Senior Leadership',
  )) {
    const { values } = sourceRecord.row;
    leadershipRoleIds.set(
      values.assignment_code,
      registerRole(
        `bmc_leadership_${safeAssignmentKeyPart(values.assignment_code)}`,
        values.role_title,
        sourceRecord,
        `BMC senior leadership assignment for ${values.scope_code}.`,
        values.scope_code,
      ),
    );
  }

  const departmentRoleIds = new Map();
  for (const department of departmentRows) {
    const { values } = department.sourceRecord.row;
    departmentRoleIds.set(
      values.department_code,
      registerRole(
        `bmc_department_${safeAssignmentKeyPart(values.department_code)}_head`,
        values.durable_role,
        department.sourceRecord,
        `Durable lead role for BMC ${values.department_name}.`,
        values.scope,
      ),
    );
  }

  const officers = new Map();
  const registerOfficer = (name, phone, email, sourceRecord) => {
    if (!validOfficerName(name)) {
      return null;
    }
    const key = normalizeGovernanceKey(name);
    const existing = officers.get(key);
    if (existing !== undefined) {
      if (existing.phone === '' && phone !== '') {
        existing.phone = phone;
      }
      if (existing.email === '' && email !== '') {
        existing.email = email.toLocaleLowerCase('en-US');
      }
      return existing.id;
    }
    const id = stableGovernanceUuid('officer', `bmc:${key}`);
    officers.set(key, {
      id,
      name,
      phone,
      email: email.toLocaleLowerCase('en-US'),
      sourceRecord,
    });
    return id;
  };

  const assignments = [];
  const addAssignment = (assignment) => {
    const id = stableGovernanceUuid('officer-assignment', `${assignment.key}:1`);
    assignments.push({ ...assignment, id });
    return id;
  };
  for (const sourceRecord of sourceRecords.filter(
    ({ definition }) => definition.name === 'Senior Leadership',
  )) {
    const { values } = sourceRecord.row;
    const officerId = registerOfficer(
      values.person_name,
      values.mobile || values.office_phone,
      values.email,
      sourceRecord,
    );
    const assignmentId = addAssignment({
      key: `bmc:leadership:${safeAssignmentKeyPart(values.assignment_code)}`,
      roleId: leadershipRoleIds.get(values.assignment_code),
      officerId,
      officeId: headquartersOfficeId,
      authorityDepartmentId: null,
      wardId: null,
      responsibility: values.role_title,
      coverage: values.scope_code,
      status: 'active',
      sourceRecord,
      effectiveFrom: values.source_as_of,
    });
    normalizeTo(sourceRecord, 'governance.officer_assignments', assignmentId);
  }
  for (const zone of zoneRows) {
    const { values } = zone.sourceRecord.row;
    const officerId = registerOfficer(
      values.person_name,
      values.mobile || values.office_phone,
      values.email,
      zone.sourceRecord,
    );
    addAssignment({
      key: `bmc:zone:${safeAssignmentKeyPart(values.zone_code)}:deputy_commissioner`,
      roleId: zoneDeputyCommissionerRoleId,
      officerId,
      officeId: null,
      authorityDepartmentId: null,
      wardId: null,
      responsibility: values.role_title,
      coverage: `${values.zone_name}: ${values.operational_ward_codes}`,
      status: 'active',
      sourceRecord: zone.sourceRecord,
      effectiveFrom: values.source_as_of,
    });
  }
  for (const ward of operationalWardRows) {
    const { values } = ward.sourceRecord.row;
    const assistantCommissionerId = registerOfficer(
      values.assistant_commissioner_name,
      values.assistant_commissioner_mobile || values.assistant_commissioner_office_phone,
      values.assistant_commissioner_email,
      ward.sourceRecord,
    );
    addAssignment({
      key: `bmc:ward:${safeAssignmentKeyPart(values.operational_ward_code)}:assistant_commissioner`,
      roleId: wardAssistantCommissionerRoleId,
      officerId: assistantCommissionerId,
      officeId: wardOfficeIds.get(values.operational_ward_code),
      authorityDepartmentId: null,
      wardId: ward.id,
      responsibility: values.assistant_commissioner_role,
      coverage: `${values.operational_ward_code} operational ward`,
      status: 'active',
      sourceRecord: ward.sourceRecord,
      effectiveFrom: values.source_as_of,
    });
    if (validOfficerName(values.complaint_officer_name)) {
      const complaintOfficerId = registerOfficer(
        values.complaint_officer_name,
        contactPhone(values.complaint_officer_contact),
        contactEmail(values.complaint_officer_contact),
        ward.sourceRecord,
      );
      addAssignment({
        key: `bmc:ward:${safeAssignmentKeyPart(values.operational_ward_code)}:complaint_officer`,
        roleId: wardComplaintOfficerRoleId,
        officerId: complaintOfficerId,
        officeId: wardOfficeIds.get(values.operational_ward_code),
        authorityDepartmentId: null,
        wardId: ward.id,
        responsibility: values.complaint_officer_role,
        coverage: `${values.operational_ward_code} operational ward`,
        status: 'active',
        sourceRecord: ward.sourceRecord,
        effectiveFrom: values.source_as_of,
      });
    }
  }
  for (const department of departmentRows) {
    const { values } = department.sourceRecord.row;
    const officerId = registerOfficer(
      values.person_name,
      values.mobile || values.office_phone,
      values.email,
      department.sourceRecord,
    );
    addAssignment({
      key: `bmc:department:${safeAssignmentKeyPart(values.department_code)}:head`,
      roleId: departmentRoleIds.get(values.department_code),
      officerId,
      officeId: departmentOfficeIds.get(values.department_code),
      authorityDepartmentId: department.authorityDepartmentId,
      wardId: null,
      responsibility: values.durable_role,
      coverage: values.scope,
      status: officerId === null ? 'role_only' : 'active',
      sourceRecord: department.sourceRecord,
      effectiveFrom: values.source_as_of,
    });
  }

  const boundaryRows = geometry.features.map((feature) => {
    const geometryCode = geometryProperty(feature, 'NAME');
    const operationalWardId = wardIds.get(geometryCode);
    const wardId = operationalWardId ?? geometryAnchorWardIds.get(geometryCode);
    if (wardId === undefined) {
      throw new Error(`Geometry ward ${geometryCode} has no operational or legacy anchor ward.`);
    }
    const crosswalkRecord = crosswalkRecords.find(
      ({ row }) => row.values.geometry_ward_code === geometryCode,
    );
    if (crosswalkRecord === undefined) {
      throw new Error(`Geometry ward ${geometryCode} has no crosswalk source record.`);
    }
    return {
      id: boundaryIds.get(geometryCode),
      geometryCode,
      wardId,
      feature,
      sourceRecord: crosswalkRecord,
      isRoutingEligible: operationalWardId !== undefined,
    };
  });

  const zoneMembershipRows = operationalWardRows.map((ward) => {
    const { values } = ward.sourceRecord.row;
    return {
      id: stableGovernanceUuid(
        'ward-zone-membership',
        `bmc:${values.operational_ward_code}:${values.zone_code}:1`,
      ),
      wardId: ward.id,
      zoneId: zoneIds.get(values.zone_code),
      isRoutingEligible: values.demo_routable === 'true',
      sourceRecord: ward.sourceRecord,
    };
  });

  const crosswalkRows = crosswalkRecords.map((sourceRecord) => {
    const { values } = sourceRecord.row;
    const id = stableGovernanceUuid(
      'ward-boundary-crosswalk',
      `bmc:${values.operational_ward_code}:1`,
    );
    normalizeTo(sourceRecord, 'governance.ward_boundary_crosswalk_versions', id);
    return {
      id,
      wardId: wardIds.get(values.operational_ward_code),
      boundaryId: boundaryIds.get(values.geometry_ward_code),
      isRoutingEligible: values.automatic_demo_route_allowed === 'true',
      sourceRecord,
    };
  });

  const complaintRoutingRows = [];
  for (const sourceRecord of sourceRecords.filter(
    ({ definition }) => definition.name === 'Complaint Routing',
  )) {
    const { values } = sourceRecord.row;
    const id = stableGovernanceUuid(
      'routing-reference',
      `${normalizeGovernanceKey(values.rule_code)}:1`,
    );
    const roleId =
      values.category_code === 'fire_hazard'
        ? departmentRoleIds.get(values.primary_department_code)
        : wardAssistantCommissionerRoleId;
    complaintRoutingRows.push({ id, roleId, sourceRecord });
    normalizeTo(sourceRecord, 'governance.complaint_routing_references', id);
  }

  return {
    normalizationTargets,
    authorityRecord,
    zoneRows,
    operationalWardRows,
    geometryAnchorWardIds,
    crosswalkRecords,
    wardIds,
    departmentRows,
    departmentIds,
    authorityDepartmentIds,
    headquartersOfficeId,
    wardOfficeIds,
    departmentOfficeIds,
    wardAssistantCommissionerRoleId,
    roles: [...roles.values()],
    officers: [...officers.values()],
    assignments,
    boundaryRows,
    boundaryIds,
    localBodyBoundaryId,
    zoneMembershipRows,
    crosswalkRows,
    complaintRoutingRows,
  };
};

const renderNormalizedGovernanceSql = (model) => {
  const stagingVerificationNotes =
    'Official-source-backed record approved for Local Wellness staging/demo internal routing only; external BMC complaint delivery is not approved.';
  const sourceUrl = (sourceRecord) => sourceRecord.row.values.source_url || bmcConnectUrl;
  const lastVerified = (sourceRecord) =>
    sourceRecord.row.values.last_checked ||
    sourceRecord.row.values.source_as_of ||
    sourceLastCheckedOn;

  const zoneInserts = model.zoneRows.map(({ id, sourceRecord }) => {
    const { values } = sourceRecord.row;
    return [
      sqlText(id),
      'null',
      sqlText(maharashtraStateId),
      'null',
      'null',
      sqlText(bmcLocalBodyId),
      sqlText(values.zone_name),
      sqlText('zone'),
      'null',
      sqlText('active'),
      sqlText('verified'),
      sqlText(stagingVerificationNotes),
      'false',
      'true',
      `${sqlText(lastVerified(sourceRecord))}::date`,
      sourceReferenceSql(sourceUrl(sourceRecord)),
      sqlText(sourceRecord.id),
    ];
  });

  const wardInserts = model.operationalWardRows.map(({ id, sourceRecord }) => {
    const { values } = sourceRecord.row;
    const zoneName =
      model.zoneRows.find(
        ({ sourceRecord: zone }) => zone.row.values.zone_code === values.zone_code,
      )?.sourceRecord.row.values.zone_name ?? values.zone_code;
    return [
      sqlText(id),
      sqlText(bmcLocalBodyId),
      sqlText(`BMC-${values.operational_ward_code.replaceAll('/', '-')}`),
      'null',
      sqlText(`${values.display_name} Ward`),
      sqlText(values.operational_ward_code),
      sqlText(zoneName),
      sqlText('active'),
      sqlText('verified'),
      sqlText(
        values.demo_routable === 'true'
          ? stagingVerificationNotes
          : `${stagingVerificationNotes} Automatic location routing remains disabled because the operational ward shares a legacy parent polygon.`,
      ),
      'false',
      sqlBoolean(values.demo_routable === 'true'),
      `${sqlText(lastVerified(sourceRecord))}::date`,
      sourceReferenceSql(sourceUrl(sourceRecord)),
      sqlText(sourceRecord.id),
    ];
  });
  for (const [geometryCode, id] of model.geometryAnchorWardIds) {
    const sourceRecord = model.crosswalkRecords.find(
      ({ row }) => row.values.geometry_ward_code === geometryCode,
    );
    if (sourceRecord === undefined) {
      throw new Error(`Missing source record for legacy geometry ward ${geometryCode}.`);
    }
    const feature = model.boundaryRows.find((item) => item.geometryCode === geometryCode)?.feature;
    wardInserts.push([
      sqlText(id),
      sqlText(bmcLocalBodyId),
      sqlText(`BMC-LEGACY-GEOMETRY-${geometryCode.replaceAll('/', '-')}`),
      'null',
      sqlText(`${geometryCode} legacy boundary feature`),
      sqlText(`${geometryCode}-GEOMETRY`),
      sqlNullableText(
        feature === undefined ? null : `Legacy Zone ${geometryProperty(feature, 'ZONE')}`,
      ),
      sqlText('active'),
      sqlText('verified'),
      sqlText(
        'Official legacy boundary anchor retained only for versioned crosswalk evidence; it is not an operational routing ward.',
      ),
      'false',
      'false',
      `${sqlText(sourceLastCheckedOn)}::date`,
      sourceReferenceSql(bmcGeometrySourceUrl),
      sqlText(sourceRecord.id),
    ]);
  }

  const categoriesByDepartment = new Map();
  for (const { sourceRecord } of model.complaintRoutingRows) {
    const { values } = sourceRecord.row;
    const categories = categoriesByDepartment.get(values.primary_department_code) ?? [];
    categories.push(values.category_code);
    categoriesByDepartment.set(values.primary_department_code, categories);
  }
  const departmentInserts = model.departmentRows.map(({ id, sourceRecord }) => {
    const { values } = sourceRecord.row;
    return [
      sqlText(id),
      sqlText(values.department_code.toLocaleLowerCase('en-US')),
      sqlText(values.department_name),
      sqlTextArray(['municipal_corporation']),
      sqlTextArray(categoriesByDepartment.get(values.department_code) ?? []),
      sqlText(values.scope),
      sqlTextArray([]),
      sqlText(values.notes),
      sqlText('active'),
      sqlText('verified'),
      sqlText(stagingVerificationNotes),
      'false',
      sqlBoolean(values.demo_routable === 'true'),
      `${sqlText(lastVerified(sourceRecord))}::date`,
      sourceReferenceSql(sourceUrl(sourceRecord)),
      sqlText(sourceRecord.id),
    ];
  });
  const authorityDepartmentInserts = model.departmentRows.map(
    ({ id, authorityDepartmentId, sourceRecord }) => {
      const { values } = sourceRecord.row;
      return [
        sqlText(authorityDepartmentId),
        sqlText(bmcAuthorityId),
        sqlText(id),
        sqlText(values.department_name),
        sqlText('active'),
        sqlText('verified'),
        sqlText(stagingVerificationNotes),
        'false',
        sqlBoolean(values.demo_routable === 'true'),
        `${sqlText(lastVerified(sourceRecord))}::date`,
        sourceReferenceSql(sourceUrl(sourceRecord)),
        sqlText(sourceRecord.id),
      ];
    },
  );

  const authorityValues = model.authorityRecord.row.values;
  const officeInserts = [
    [
      sqlText(model.headquartersOfficeId),
      sqlText(bmcAuthorityId),
      'null',
      'null',
      'null',
      sqlText(bmcLocalBodyId),
      'null',
      sqlText('BMC Headquarters'),
      sqlText('municipal_headquarters'),
      sqlText('citywide'),
      sqlText('Brihanmumbai Municipal Corporation'),
      sqlText(authorityValues.head_office_address),
      sqlText(authorityValues.central_helpline),
      'null',
      sqlText('Brihanmumbai'),
      sqlText('active'),
      sqlText('verified'),
      sqlText(stagingVerificationNotes),
      'false',
      'true',
      `${sqlText(lastVerified(model.authorityRecord))}::date`,
      sourceReferenceSql(sourceUrl(model.authorityRecord)),
      sqlText(model.authorityRecord.id),
    ],
  ];
  for (const ward of model.operationalWardRows) {
    const { values } = ward.sourceRecord.row;
    officeInserts.push([
      sqlText(model.wardOfficeIds.get(values.operational_ward_code)),
      sqlText(bmcAuthorityId),
      'null',
      'null',
      'null',
      sqlText(bmcLocalBodyId),
      sqlText(ward.id),
      sqlText(`BMC ${values.operational_ward_code} Ward Office`),
      sqlText('ward_office'),
      sqlText('ward'),
      sqlText(`${values.operational_ward_code} operational ward`),
      sqlText(values.office_address),
      sqlNullableText(values.ward_office_phone),
      sqlNullableText(values.assistant_commissioner_email.toLocaleLowerCase('en-US')),
      sqlText(`${values.operational_ward_code} operational ward`),
      sqlText('active'),
      sqlText('verified'),
      sqlText(stagingVerificationNotes),
      'false',
      sqlBoolean(values.demo_routable === 'true'),
      `${sqlText(lastVerified(ward.sourceRecord))}::date`,
      sourceReferenceSql(sourceUrl(ward.sourceRecord)),
      sqlText(ward.sourceRecord.id),
    ]);
  }
  for (const department of model.departmentRows) {
    const { values } = department.sourceRecord.row;
    const phones = [values.office_phone, values.mobile, values.helpline].filter(Boolean).join('; ');
    officeInserts.push([
      sqlText(model.departmentOfficeIds.get(values.department_code)),
      sqlText(bmcAuthorityId),
      sqlText(department.authorityDepartmentId),
      'null',
      'null',
      sqlText(bmcLocalBodyId),
      'null',
      sqlText(`BMC ${values.department_name} Office`),
      sqlText('department_office'),
      sqlText('citywide'),
      sqlText(values.scope),
      'null',
      sqlNullableText(phones),
      sqlNullableText(values.email.toLocaleLowerCase('en-US')),
      sqlText(values.scope),
      sqlText('active'),
      sqlText('verified'),
      sqlText(stagingVerificationNotes),
      'false',
      sqlBoolean(values.demo_routable === 'true'),
      `${sqlText(lastVerified(department.sourceRecord))}::date`,
      sourceReferenceSql(sourceUrl(department.sourceRecord)),
      sqlText(department.sourceRecord.id),
    ]);
  }

  const roleInserts = model.roles.map((role) => [
    sqlText(role.id),
    sqlText(role.code),
    sqlText(role.name),
    sqlText(role.responsibility),
    'null',
    'null',
    'null',
    sqlText(role.coverage),
    sqlText('active'),
    sqlText('verified'),
    sqlText(stagingVerificationNotes),
    'false',
    'true',
    `${sqlText(lastVerified(role.sourceRecord))}::date`,
    sourceReferenceSql(sourceUrl(role.sourceRecord)),
    sqlText(role.sourceRecord.id),
  ]);
  const officerInserts = model.officers.map((officer) => [
    sqlText(officer.id),
    'null',
    sqlText(officer.name),
    sqlNullableText(officer.phone),
    sqlNullableText(officer.email),
    sqlText('active'),
    sqlText('verified'),
    sqlText(stagingVerificationNotes),
    'false',
    `${sqlText(lastVerified(officer.sourceRecord))}::date`,
    sourceReferenceSql(sourceUrl(officer.sourceRecord)),
    sqlText(officer.sourceRecord.id),
  ]);
  const assignmentInserts = model.assignments.map((assignment) => [
    sqlText(assignment.id),
    sqlText(assignment.key),
    '1',
    sqlText(bmcAuthorityId),
    sqlText(assignment.roleId),
    sqlNullableText(assignment.officerId),
    sqlNullableText(assignment.officeId),
    sqlNullableText(assignment.authorityDepartmentId),
    'null',
    'null',
    sqlText(bmcLocalBodyId),
    sqlNullableText(assignment.wardId),
    sqlText(assignment.responsibility),
    sqlText(assignment.coverage),
    sqlText(assignment.status),
    sqlText('verified'),
    sqlText(stagingVerificationNotes),
    'false',
    `${sqlText(`${assignment.effectiveFrom}T00:00:00Z`)}::timestamptz`,
    'null',
    `${sqlText(lastVerified(assignment.sourceRecord))}::date`,
    sourceReferenceSql(sourceUrl(assignment.sourceRecord)),
    sqlText(assignment.sourceRecord.id),
  ]);

  const boundaryInserts = model.boundaryRows.map((boundary) => [
    sqlText(boundary.id),
    'null',
    'null',
    'null',
    'null',
    sqlText(boundary.wardId),
    '1',
    `extensions.st_multi(extensions.st_setsrid(extensions.st_geomfromgeojson(${sqlText(JSON.stringify(boundary.feature.geometry))}), 4326))`,
    sqlText('active'),
    sqlText('verified'),
    sqlText(
      boundary.isRoutingEligible
        ? stagingVerificationNotes
        : 'Official legacy parent geometry retained for crosswalk evidence; automatic split-child routing is disabled.',
    ),
    'false',
    sqlBoolean(boundary.isRoutingEligible),
    `${sqlText('2026-06-18T00:00:00Z')}::timestamptz`,
    'null',
    `${sqlText(sourceLastCheckedOn)}::date`,
    sourceReferenceSql(bmcGeometrySourceUrl),
    sqlText(boundary.sourceRecord.id),
  ]);

  const membershipInserts = model.zoneMembershipRows.map((membership) => [
    sqlText(membership.id),
    sqlText(membership.wardId),
    sqlText(membership.zoneId),
    '1',
    sqlText('active'),
    sqlText('verified'),
    sqlText(stagingVerificationNotes),
    'false',
    sqlBoolean(membership.isRoutingEligible),
    `${sqlText('2026-06-18T00:00:00Z')}::timestamptz`,
    'null',
    `${sqlText(lastVerified(membership.sourceRecord))}::date`,
    sourceReferenceSql(sourceUrl(membership.sourceRecord)),
    sqlText(membership.sourceRecord.id),
  ]);
  const crosswalkInserts = model.crosswalkRows.map((crosswalk) => {
    const { values } = crosswalk.sourceRecord.row;
    return [
      sqlText(crosswalk.id),
      sqlText(crosswalk.wardId),
      sqlText(crosswalk.boundaryId),
      '1',
      sqlText(values.relationship_type),
      sqlText(values.routing_instruction),
      sqlBoolean(values.automatic_demo_route_allowed === 'true'),
      sqlNullableText(values.notes),
      sqlText('active'),
      sqlText('verified'),
      sqlText(
        crosswalk.isRoutingEligible
          ? stagingVerificationNotes
          : 'Verified crosswalk retained for review; automatic routing remains disabled for a shared legacy boundary.',
      ),
      'false',
      sqlBoolean(crosswalk.isRoutingEligible),
      `${sqlText('2026-06-18T00:00:00Z')}::timestamptz`,
      'null',
      `${sqlText(sourceLastCheckedOn)}::date`,
      sourceReferenceSql(bmcGeometrySourceUrl),
      sqlText(crosswalk.sourceRecord.id),
    ];
  });

  const departmentNameByCode = new Map(
    model.departmentRows.map(({ sourceRecord }) => [
      sourceRecord.row.values.department_code,
      sourceRecord.row.values.department_name,
    ]),
  );
  const routingReferenceInserts = model.complaintRoutingRows.map((routingReference) => {
    const { values } = routingReference.sourceRecord.row;
    return [
      sqlText(routingReference.id),
      sqlText(values.rule_code),
      '1',
      sqlText(values.category_description),
      sqlText(model.departmentIds.get(values.primary_department_code)),
      sqlText(routingReference.roleId),
      sqlText(departmentNameByCode.get(values.primary_department_code)),
      sqlText(values.first_recipient_role),
      sqlText(values.department_escalation_code),
      sqlText(values.final_fallback_channel),
      sqlText(
        `${values.asset_type || 'No asset type'}; asset owner required: ${values.asset_owner_required}.`,
      ),
      sqlText(values.priority),
      sqlBoolean(values.category_code === 'fire_hazard'),
      sqlText(
        `Resolve ${values.first_scope} scope to ${values.first_recipient_role}; fall back to ${values.ward_fallback_role}; escalate via ${values.department_escalation_code}; final reference channel ${values.final_fallback_channel}. ${values.notes}`,
      ),
      sqlText('resolved'),
      sqlText(stagingVerificationNotes),
      sqlText('active'),
      sqlText('verified'),
      sqlText(stagingVerificationNotes),
      'false',
      'true',
      `${sqlText('2026-06-18T00:00:00Z')}::timestamptz`,
      'null',
      `${sqlText(sourceLastCheckedOn)}::date`,
      sourceReferenceSql(bmcConnectUrl),
      sqlText(routingReference.sourceRecord.id),
    ];
  });

  const statements = [];
  statements.push(`update governance.authorities
set verification_status = 'verified',
    verification_notes = ${sqlText(stagingVerificationNotes)},
    is_placeholder = false,
    is_routing_eligible = true,
    last_verified_on = ${sqlText(sourceLastCheckedOn)}::date,
    reference_source_id = ${sourceReferenceSql(sourceUrl(model.authorityRecord))},
    import_record_id = ${sqlText(model.authorityRecord.id)}
where id = ${sqlText(bmcAuthorityId)};`);
  statements.push(`update governance.local_bodies
set verification_status = 'verified',
    verification_notes = ${sqlText(stagingVerificationNotes)},
    is_placeholder = false,
    is_routing_eligible = true,
    last_verified_on = ${sqlText(sourceLastCheckedOn)}::date,
    reference_source_id = ${sourceReferenceSql(sourceUrl(model.authorityRecord))},
    import_record_id = ${sqlText(model.authorityRecord.id)}
where id = ${sqlText(bmcLocalBodyId)};`);
  statements.push(`update governance.authorities
set is_routing_eligible = true
where id = ${sqlText(maharashtraAuthorityId)}
  and status = 'active'
  and verification_status = 'verified'
  and not is_placeholder;`);
  statements.push(`update governance.states
set is_routing_eligible = true
where id = ${sqlText(maharashtraStateId)}
  and status = 'active'
  and verification_status = 'verified'
  and not is_placeholder;`);
  statements.push(
    renderInsert(
      'governance.administrative_units',
      [
        'id',
        'parent_unit_id',
        'state_id',
        'district_id',
        'taluka_id',
        'local_body_id',
        'name',
        'unit_type',
        'lgd_code',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'is_routing_eligible',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
      zoneInserts,
      `on conflict (id) do update set
  name = excluded.name,
  status = excluded.status,
  verification_status = excluded.verification_status,
  verification_notes = excluded.verification_notes,
  is_placeholder = excluded.is_placeholder,
  is_routing_eligible = excluded.is_routing_eligible,
  last_verified_on = excluded.last_verified_on,
  reference_source_id = excluded.reference_source_id,
  import_record_id = excluded.import_record_id`,
    ),
  );
  statements.push(
    renderInsert(
      'governance.wards',
      [
        'id',
        'local_body_id',
        'source_ward_code',
        'lgd_code',
        'name',
        'ward_number',
        'zone_name',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'is_routing_eligible',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
      wardInserts,
      `on conflict (id) do update set
  name = excluded.name,
  ward_number = excluded.ward_number,
  zone_name = excluded.zone_name,
  status = excluded.status,
  verification_status = excluded.verification_status,
  verification_notes = excluded.verification_notes,
  is_placeholder = excluded.is_placeholder,
  is_routing_eligible = excluded.is_routing_eligible,
  last_verified_on = excluded.last_verified_on,
  reference_source_id = excluded.reference_source_id,
  import_record_id = excluded.import_record_id`,
    ),
  );
  statements.push(
    renderInsert(
      'governance.departments',
      [
        'id',
        'code',
        'name',
        'applicable_body_types',
        'complaint_types',
        'typical_coverage',
        'required_data',
        'priority_guidance',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'is_routing_eligible',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
      departmentInserts,
      `on conflict (code) do update set
  name = excluded.name,
  applicable_body_types = excluded.applicable_body_types,
  complaint_types = excluded.complaint_types,
  typical_coverage = excluded.typical_coverage,
  priority_guidance = excluded.priority_guidance,
  status = excluded.status,
  verification_status = excluded.verification_status,
  verification_notes = excluded.verification_notes,
  is_placeholder = excluded.is_placeholder,
  is_routing_eligible = excluded.is_routing_eligible,
  last_verified_on = excluded.last_verified_on,
  reference_source_id = excluded.reference_source_id,
  import_record_id = excluded.import_record_id`,
    ),
  );
  statements.push(
    renderInsert(
      'governance.authority_departments',
      [
        'id',
        'authority_id',
        'department_id',
        'local_name',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'is_routing_eligible',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
      authorityDepartmentInserts,
      `on conflict (authority_id, department_id) do update set
  local_name = excluded.local_name,
  status = excluded.status,
  verification_status = excluded.verification_status,
  verification_notes = excluded.verification_notes,
  is_placeholder = excluded.is_placeholder,
  is_routing_eligible = excluded.is_routing_eligible,
  last_verified_on = excluded.last_verified_on,
  reference_source_id = excluded.reference_source_id,
  import_record_id = excluded.import_record_id`,
    ),
  );
  statements.push(
    renderInsert(
      'governance.offices',
      [
        'id',
        'authority_id',
        'authority_department_id',
        'district_id',
        'taluka_id',
        'local_body_id',
        'ward_id',
        'name',
        'office_type',
        'level',
        'jurisdiction_description',
        'address',
        'official_phone',
        'official_email',
        'coverage',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'is_routing_eligible',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
      officeInserts,
      `on conflict (id) do update set
  authority_department_id = excluded.authority_department_id,
  ward_id = excluded.ward_id,
  name = excluded.name,
  address = excluded.address,
  official_phone = excluded.official_phone,
  official_email = excluded.official_email,
  coverage = excluded.coverage,
  status = excluded.status,
  verification_status = excluded.verification_status,
  verification_notes = excluded.verification_notes,
  is_placeholder = excluded.is_placeholder,
  is_routing_eligible = excluded.is_routing_eligible,
  last_verified_on = excluded.last_verified_on,
  reference_source_id = excluded.reference_source_id,
  import_record_id = excluded.import_record_id`,
    ),
  );
  statements.push(
    renderInsert(
      'governance.officer_roles',
      [
        'id',
        'code',
        'name',
        'core_responsibility',
        'people_or_units_under_role',
        'reports_to_role_id',
        'reports_to_description',
        'typical_coverage',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'is_routing_eligible',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
      roleInserts,
      `on conflict (code) do update set
  name = excluded.name,
  core_responsibility = excluded.core_responsibility,
  typical_coverage = excluded.typical_coverage,
  status = excluded.status,
  verification_status = excluded.verification_status,
  verification_notes = excluded.verification_notes,
  is_placeholder = excluded.is_placeholder,
  is_routing_eligible = excluded.is_routing_eligible,
  last_verified_on = excluded.last_verified_on,
  reference_source_id = excluded.reference_source_id,
  import_record_id = excluded.import_record_id`,
    ),
  );
  statements.push(
    renderInsert(
      'governance.officers',
      [
        'id',
        'profile_id',
        'full_name',
        'official_phone',
        'official_email',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
      officerInserts,
      `on conflict (id) do update set
  full_name = excluded.full_name,
  official_phone = excluded.official_phone,
  official_email = excluded.official_email,
  status = excluded.status,
  verification_status = excluded.verification_status,
  verification_notes = excluded.verification_notes,
  is_placeholder = excluded.is_placeholder,
  last_verified_on = excluded.last_verified_on,
  reference_source_id = excluded.reference_source_id,
  import_record_id = excluded.import_record_id`,
    ),
  );
  statements.push(
    renderInsert(
      'governance.officer_assignments',
      [
        'id',
        'assignment_key',
        'version',
        'authority_id',
        'officer_role_id',
        'officer_id',
        'office_id',
        'authority_department_id',
        'district_id',
        'taluka_id',
        'local_body_id',
        'ward_id',
        'responsibility',
        'coverage',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'effective_from',
        'effective_to',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
      assignmentInserts,
      'on conflict (assignment_key, version) do nothing',
    ),
  );
  statements.push(
    renderInsert(
      'governance.jurisdiction_boundary_versions',
      [
        'id',
        'state_id',
        'district_id',
        'taluka_id',
        'local_body_id',
        'ward_id',
        'version',
        'boundary',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'is_routing_eligible',
        'effective_from',
        'effective_to',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
      boundaryInserts,
      'on conflict (id) do nothing',
    ),
  );
  statements.push(`insert into governance.jurisdiction_boundary_versions (
  id,
  local_body_id,
  version,
  boundary,
  status,
  verification_status,
  verification_notes,
  is_placeholder,
  is_routing_eligible,
  effective_from,
  last_verified_on,
  reference_source_id
)
select
  ${sqlText(model.localBodyBoundaryId)},
  ${sqlText(bmcLocalBodyId)},
  1,
  extensions.st_multi(
    extensions.st_collectionextract(
      extensions.st_unaryunion(extensions.st_collect(boundary)),
      3
    )
  ),
  'active',
  'verified',
  ${sqlText(`${stagingVerificationNotes} The local-body boundary is the deterministic union of the 24 pinned official legacy ward features.`)},
  false,
  true,
  ${sqlText('2026-06-18T00:00:00Z')}::timestamptz,
  ${sqlText(sourceLastCheckedOn)}::date,
  ${sourceReferenceSql(bmcGeometrySourceUrl)}
from governance.jurisdiction_boundary_versions
where id in (${model.boundaryRows.map(({ id }) => sqlText(id)).join(', ')})
on conflict (id) do nothing;`);
  statements.push(
    renderInsert(
      'governance.ward_administrative_zone_membership_versions',
      [
        'id',
        'operational_ward_id',
        'administrative_zone_id',
        'version',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'is_routing_eligible',
        'effective_from',
        'effective_to',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
      membershipInserts,
      'on conflict (operational_ward_id, version) do nothing',
    ),
  );
  statements.push(
    renderInsert(
      'governance.ward_boundary_crosswalk_versions',
      [
        'id',
        'operational_ward_id',
        'official_boundary_version_id',
        'version',
        'relationship_type',
        'routing_instruction',
        'auto_route_allowed',
        'notes',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'is_routing_eligible',
        'effective_from',
        'effective_to',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
      crosswalkInserts,
      'on conflict (operational_ward_id, version) do nothing',
    ),
  );
  statements.push(
    renderInsert(
      'governance.complaint_routing_references',
      [
        'id',
        'rule_code',
        'version',
        'issue_name',
        'primary_department_id',
        'first_recipient_role_id',
        'primary_department_label',
        'first_recipient_role_label',
        'escalation_1_label',
        'escalation_2_label',
        'ownership_condition',
        'priority_or_emergency',
        'is_emergency',
        'routing_logic',
        'normalization_status',
        'normalization_notes',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'is_routing_eligible',
        'effective_from',
        'effective_to',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
      routingReferenceInserts,
      'on conflict (rule_code, version) do nothing',
    ),
  );

  return statements.filter(Boolean).join('\n\n');
};

const renderSql = ({ workbook, geometry, manifestSha256, csvFiles, diagnostics }) => {
  const batchId = stableGovernanceUuid('import-batch', `${datasetKey}:${datasetVersion}`);
  const referenceSourceRows = workbook.tables.get('Source Registry')?.rows ?? [];
  const sourceFileRows = sheetDefinitions.map((definition) => {
    const path = join(outputPaths.csvDirectory, definition.fileName);
    const csv = csvFiles.get(definition.name);
    if (csv === undefined) {
      throw new Error(`Missing generated CSV for ${definition.name}.`);
    }
    return {
      definition,
      path,
      sha256: sha256(csv),
      id: stableGovernanceUuid('import-file', `${batchId}:${repositoryPath(path)}:${sha256(csv)}`),
    };
  });

  const sourceInsertRows = referenceSourceRows.map(({ values }) => {
    const id = stableGovernanceUuid('reference-source', normalizeGovernanceKey(values.source_url));
    const purpose = [values.data_scope, values.notes].filter(Boolean).join(' — ');
    return `  (${sqlText(id)}, ${sqlText(values.source_name)}, ${sqlText(values.source_url)}, 'official', ${sqlText(purpose)}, ${sqlText(values.source_as_of)}::date, 'active')`;
  });
  sourceInsertRows.push(
    `  (${sqlText(stableGovernanceUuid('reference-source', normalizeGovernanceKey(bmcGeometrySourceUrl)))}, 'BMC ArcGIS legacy administrative ward boundaries', ${sqlText(bmcGeometrySourceUrl)}, 'official', ${sqlText(`Official BMC ArcGIS layer 238 queried in EPSG:4326; native source CRS is EPSG:32643. Layer metadata: ${bmcGeometryLayerMetadataUrl}`)}, ${sqlText(geometryLastCheckedOn)}::date, 'active')`,
  );
  const sourceInserts = sourceInsertRows.join(',\n');

  const sourceRecords = [];
  for (const sourceFile of sourceFileRows) {
    const table = workbook.tables.get(sourceFile.definition.name);
    if (table === undefined) {
      throw new Error(`Missing parsed table for ${sourceFile.definition.name}.`);
    }
    for (const [index, row] of table.rows.entries()) {
      const csvRowNumber = index + 2;
      const recordSha256 = sha256(JSON.stringify(row.values));
      const id = stableGovernanceUuid(
        'import-record',
        `${sourceFile.id}:${csvRowNumber}:${recordSha256}`,
      );
      sourceRecords.push({
        id,
        sourceFile,
        definition: sourceFile.definition,
        row,
        csvRowNumber,
        recordSha256,
      });
    }
  }
  const normalizedModel = buildNormalizedGovernanceModel({ geometry, sourceRecords });

  const fileInserts = sourceFileRows
    .map(({ definition, path, sha256: fileSha256, id }) => {
      const warningCount = diagnostics.filter(
        ({ severity, sheet }) => severity === 'warning' && sheet === definition.name,
      ).length;
      const normalizedCount = sourceRecords.filter(
        (sourceRecord) =>
          sourceRecord.definition.name === definition.name &&
          normalizedModel.normalizationTargets.has(sourceRecord.id),
      ).length;
      return `  (${sqlText(id)}, ${sqlText(batchId)}, ${sqlText(repositoryPath(path))}, ${sqlText(fileSha256)}, ${definition.expectedRecordCount}, ${definition.expectedRecordCount}, 0, ${warningCount}, ${sqlJson({ disposition: normalizedCount === 0 ? 'reference_only' : 'normalized', generatedFromSheet: definition.name, normalizedCount })})`;
    })
    .join(',\n');

  const importRecordInserts = sourceRecords.map((sourceRecord) => {
    const { id, sourceFile, definition, row, csvRowNumber, recordSha256 } = sourceRecord;
    const rowWarnings = diagnostics
      .filter(
        ({ severity, sheet, sourceRow }) =>
          severity === 'warning' && sheet === definition.name && sourceRow === row.sourceRow,
      )
      .map(({ code, field, message }) => ({
        code,
        ...(field === undefined ? {} : { field }),
        message,
      }));
    const target = normalizedModel.normalizationTargets.get(id);
    return `  (${sqlText(id)}, ${sqlText(sourceFile.id)}, ${csvRowNumber}, ${sqlText(sourceKey(definition, row.values))}, ${sqlText(recordSha256)}, ${sqlJson(row.values)}, ${sqlText(rowWarnings.length === 0 ? 'accepted' : 'accepted_with_warnings')}, ${sqlJson(rowWarnings)}, ${rowContainsPlaceholder(row.values)}, ${sqlText(target === undefined ? 'reference_only' : 'normalized')}, ${target === undefined ? 'null' : sqlText(target.table)}, ${target === undefined ? 'null' : sqlText(target.id)})`;
  });
  const normalizedSql = renderNormalizedGovernanceSql(normalizedModel);

  const errorCount = diagnostics.filter(({ severity }) => severity === 'error').length;
  const warningCount = diagnostics.filter(({ severity }) => severity === 'warning').length;
  const recordCount = sourceFileRows.reduce(
    (total, { definition }) => total + definition.expectedRecordCount,
    0,
  );

  const sql = `-- Generated by scripts/generate-bmc-demo-governance.mjs. Do not edit manually.
-- This staging/demo seed preserves BMC source rows, provenance, and versioned mappings.
-- Source-backed records are verified for the Local Wellness internal demo queue only.
-- It does not authorize external complaint delivery or claim official BMC submission.

begin;

insert into governance.reference_sources (
  id,
  title,
  url,
  source_type,
  purpose,
  last_checked_on,
  status
)
values
${sourceInserts}
on conflict (url) do update set
  title = excluded.title,
  source_type = excluded.source_type,
  purpose = excluded.purpose,
  last_checked_on = excluded.last_checked_on,
  status = excluded.status;

insert into governance.import_batches (
  id,
  dataset_key,
  dataset_version,
  canonical_root,
  manifest_sha256,
  workbook_sha256,
  generated_seed_sha256,
  status,
  validation_summary,
  started_at,
  completed_at
)
values (
  ${sqlText(batchId)},
  ${sqlText(datasetKey)},
  ${sqlText(datasetVersion)},
  'resources/governance',
  ${sqlText(manifestSha256)},
  ${sqlText(sourcePins.workbook)},
  null,
  'imported',
  ${sqlJson({ errors: errorCount, warnings: warningCount, rawSourceRecords: recordCount, normalizationDisposition: 'normalized_with_reference_only_records', externalDeliveryApproved: false })},
  ${sqlText(`${sourceLastCheckedOn}T00:00:00Z`)}::timestamptz,
  ${sqlText(`${sourceLastCheckedOn}T00:00:00Z`)}::timestamptz
)
on conflict (dataset_key, dataset_version) do nothing;

insert into governance.import_files (
  id,
  import_batch_id,
  file_name,
  sha256,
  source_row_count,
  accepted_row_count,
  rejected_row_count,
  warning_count,
  validation_summary
)
values
${fileInserts}
on conflict (import_batch_id, file_name) do nothing;

insert into governance.import_records (
  id,
  import_file_id,
  row_number,
  source_key,
  record_sha256,
  raw_payload,
  validation_status,
  validation_messages,
  is_placeholder,
  normalization_disposition,
  normalized_table,
  normalized_record_id
)
values
${importRecordInserts.join(',\n')}
on conflict (import_file_id, row_number) do nothing;

${normalizedSql}

commit;
`;

  return { sql, normalizedModel };
};

const orderedCodes = (values) => [...values].sort((left, right) => left.localeCompare(right));

const buildBmcInternalRoutingModel = (governanceModel) => {
  const expectedWardCodes = orderedCodes(bmcInternalRoutingConfiguration.operationalWardCodes);
  const sourceRoutableWardCodes = orderedCodes(
    governanceModel.operationalWardRows
      .filter(({ sourceRecord }) => sourceRecord.row.values.demo_routable === 'true')
      .map(({ sourceRecord }) => sourceRecord.row.values.operational_ward_code),
  );
  if (JSON.stringify(sourceRoutableWardCodes) !== JSON.stringify(expectedWardCodes)) {
    throw new Error(
      `BMC internal routing ward contract changed: expected ${expectedWardCodes.join(', ')}, received ${sourceRoutableWardCodes.join(', ')}.`,
    );
  }

  const wards = bmcInternalRoutingConfiguration.operationalWardCodes.map((code) => {
    const ward = governanceModel.operationalWardRows.find(
      ({ sourceRecord }) => sourceRecord.row.values.operational_ward_code === code,
    );
    const wardId = governanceModel.wardIds.get(code);
    const officeId = governanceModel.wardOfficeIds.get(code);
    const crosswalk = governanceModel.crosswalkRows.find((row) => row.wardId === wardId);
    if (
      ward === undefined ||
      wardId === undefined ||
      officeId === undefined ||
      crosswalk === undefined ||
      !crosswalk.isRoutingEligible ||
      crosswalk.sourceRecord.row.values.relationship_type !== 'one_to_one' ||
      crosswalk.sourceRecord.row.values.automatic_demo_route_allowed !== 'true' ||
      ward.sourceRecord.row.values.production_routable !== 'false'
    ) {
      throw new Error(`BMC operational ward ${code} is not safe for internal automatic routing.`);
    }
    return { code, id: wardId, officeId };
  });

  for (const code of bmcInternalRoutingConfiguration.excludedSplitWardCodes) {
    const wardId = governanceModel.wardIds.get(code);
    const crosswalk = governanceModel.crosswalkRows.find((row) => row.wardId === wardId);
    if (
      wardId === undefined ||
      crosswalk === undefined ||
      crosswalk.isRoutingEligible ||
      crosswalk.sourceRecord.row.values.relationship_type !== 'one_to_many_child'
    ) {
      throw new Error(`BMC split-child ward ${code} no longer satisfies the fail-closed contract.`);
    }
  }

  const categories = bmcInternalRoutingConfiguration.categories.map((configuration) => {
    const routingReference = governanceModel.complaintRoutingRows.find(
      ({ sourceRecord }) =>
        sourceRecord.row.values.rule_code === configuration.routingReferenceCode,
    );
    const departmentId = governanceModel.departmentIds.get(configuration.departmentCode);
    if (
      routingReference === undefined ||
      departmentId === undefined ||
      routingReference.roleId !== governanceModel.wardAssistantCommissionerRoleId
    ) {
      throw new Error(`BMC category ${configuration.code} is missing its reviewed routing target.`);
    }
    const { values } = routingReference.sourceRecord.row;
    if (
      values.category_code !== configuration.code ||
      values.primary_department_code !== configuration.departmentCode ||
      values.asset_type !== '' ||
      values.asset_owner_required !== 'false' ||
      values.demo_active !== 'true' ||
      values.production_active !== 'false'
    ) {
      throw new Error(`BMC category ${configuration.code} is not asset-independent and demo-only.`);
    }
    return {
      ...configuration,
      departmentId,
      routingReferenceId: routingReference.id,
    };
  });

  const confidencePolicyId = stableGovernanceUuid(
    'confidence-policy',
    'bmc:internal-demo:ward-routing',
  );
  const confidencePolicyVersionId = stableGovernanceUuid(
    'confidence-policy-version',
    `${confidencePolicyId}:1`,
  );
  const duplicatePolicies = categories.map((category) => {
    const id = stableGovernanceUuid(
      'duplicate-detection-policy',
      `bmc:internal-demo:${category.code}`,
    );
    return {
      category,
      id,
      versionId: stableGovernanceUuid('duplicate-detection-policy-version', `${id}:1`),
    };
  });
  const routes = categories.flatMap((category) =>
    wards.map((ward) => {
      const id = stableGovernanceUuid(
        'routing-rule',
        `bmc:internal-demo:${category.code}:${ward.code}`,
      );
      return {
        category,
        ward,
        id,
        versionId: stableGovernanceUuid('routing-rule-version', `${id}:1`),
        code: `BMC_INTERNAL_${category.code}_${ward.code}`
          .toLocaleUpperCase('en-US')
          .replaceAll('/', '_'),
      };
    }),
  );

  if (routes.length !== 66) {
    throw new Error(`Expected 66 BMC internal routing rules, received ${routes.length}.`);
  }

  return {
    wards,
    categories,
    wardAssistantCommissionerRoleId: governanceModel.wardAssistantCommissionerRoleId,
    confidencePolicyId,
    confidencePolicyVersionId,
    duplicatePolicies,
    routes,
  };
};

const renderBmcInternalRoutingSql = (model) => {
  const verificationNotes =
    'Verified for the Local Wellness BMC internal staging/demo queue only; external complaint delivery is not approved.';
  const categoryVerificationNotes =
    'Verified only for BMC internal staging/demo routing in 22 one-to-one operational wards; external complaint delivery is not approved.';
  const expectedWardCodesSql = sqlTextArray(model.wards.map(({ code }) => code));
  const excludedWardCodesSql = sqlTextArray(bmcInternalRoutingConfiguration.excludedSplitWardCodes);
  const legacyAnchorCodesSql = sqlTextArray(bmcInternalRoutingConfiguration.legacyAnchorCodes);
  const categoryCodesSql = sqlTextArray(model.categories.map(({ code }) => code));
  const routeIdsSql = model.routes.map(({ id }) => sqlText(id)).join(', ');
  const routeVersionIdsSql = model.routes.map(({ versionId }) => sqlText(versionId)).join(', ');

  const categoryUpdates = model.categories
    .map(
      (category) => `update routing.issue_categories
set
  source_routing_reference_id = ${sqlText(category.routingReferenceId)},
  status = 'active',
  verification_status = 'verified',
  verification_notes = ${sqlText(categoryVerificationNotes)},
  is_placeholder = false,
  is_routing_eligible = true,
  last_verified_on = ${sqlText(routingLastVerifiedOn)}::date,
  reference_source_id = ${sourceReferenceSql(bmcConnectUrl)}
where code = ${sqlText(category.code)};`,
    )
    .join('\n\n');

  const confidencePolicyInsert = renderInsert(
    'routing.confidence_policies',
    [
      'id',
      'code',
      'name',
      'status',
      'verification_status',
      'verification_notes',
      'is_placeholder',
      'is_routing_eligible',
      'last_verified_on',
      'reference_source_id',
    ],
    [
      [
        sqlText(model.confidencePolicyId),
        sqlText('bmc_internal_demo_ward_routing'),
        sqlText('BMC Internal Demo Ward Routing'),
        sqlText('active'),
        sqlText('verified'),
        sqlText(verificationNotes),
        'false',
        'true',
        `${sqlText(routingLastVerifiedOn)}::date`,
        sourceReferenceSql(bmcConnectUrl),
      ],
    ],
    'on conflict (id) do nothing',
  );
  const confidencePolicyVersionInsert = renderInsert(
    'routing.confidence_policy_versions',
    [
      'id',
      'confidence_policy_id',
      'version',
      'category_id',
      'automatic_threshold',
      'manual_review_threshold',
      'ambiguity_delta',
      'fallback_penalty_per_level',
      'factors',
      'status',
      'verification_status',
      'verification_notes',
      'is_placeholder',
      'is_routing_eligible',
      'effective_from',
      'last_verified_on',
      'reference_source_id',
    ],
    [
      [
        sqlText(model.confidencePolicyVersionId),
        sqlText(model.confidencePolicyId),
        '1',
        'null',
        '0.8',
        '0.5',
        '0.05',
        '0.1',
        sqlJson([
          { code: 'jurisdiction', weight: 0.25, required: true },
          { code: 'category', weight: 0.25, required: true },
          { code: 'department', weight: 0.25, required: true },
          { code: 'role', weight: 0.25, required: true },
        ]),
        sqlText('active'),
        sqlText('verified'),
        sqlText(verificationNotes),
        'false',
        'true',
        `${sqlText(routingEffectiveFrom)}::timestamptz`,
        `${sqlText(routingLastVerifiedOn)}::date`,
        sourceReferenceSql(bmcConnectUrl),
      ],
    ],
    'on conflict (confidence_policy_id, version) do nothing',
  );
  const duplicatePolicyInsert = renderInsert(
    'routing.duplicate_detection_policies',
    [
      'id',
      'code',
      'name',
      'status',
      'verification_status',
      'verification_notes',
      'is_placeholder',
      'is_routing_eligible',
      'last_verified_on',
      'reference_source_id',
    ],
    model.duplicatePolicies.map(({ category, id }) => [
      sqlText(id),
      sqlText(`bmc_internal_demo_${category.code}`),
      sqlText(`BMC Internal Demo ${category.code.replaceAll('_', ' ')} Duplicates`),
      sqlText('active'),
      sqlText('verified'),
      sqlText(verificationNotes),
      'false',
      'true',
      `${sqlText(routingLastVerifiedOn)}::date`,
      sourceReferenceSql(bmcConnectUrl),
    ]),
    'on conflict (id) do nothing',
  );
  const duplicatePolicyVersionInsert = renderInsert(
    'routing.duplicate_detection_policy_versions',
    [
      'id',
      'duplicate_detection_policy_id',
      'version',
      'category_id',
      'maximum_distance_meters',
      'maximum_age_seconds',
      'minimum_score',
      'maximum_results',
      'weights',
      'status',
      'verification_status',
      'verification_notes',
      'is_placeholder',
      'is_routing_eligible',
      'effective_from',
      'last_verified_on',
      'reference_source_id',
    ],
    model.duplicatePolicies.map(({ category, id, versionId }) => [
      sqlText(versionId),
      sqlText(id),
      '1',
      `(select id from routing.issue_categories where code = ${sqlText(category.code)})`,
      '50',
      '604800',
      '0.65',
      '20',
      sqlJson({ category: 3, location: 3, time: 1, description: 2, media: 1, asset: 0 }),
      sqlText('active'),
      sqlText('verified'),
      sqlText(verificationNotes),
      'false',
      'true',
      `${sqlText(routingEffectiveFrom)}::timestamptz`,
      `${sqlText(routingLastVerifiedOn)}::date`,
      sourceReferenceSql(bmcConnectUrl),
    ]),
    'on conflict (duplicate_detection_policy_id, version) do nothing',
  );
  const routeRuleInsert = renderInsert(
    'routing.route_rules',
    [
      'id',
      'category_id',
      'rule_code',
      'name',
      'status',
      'verification_status',
      'verification_notes',
      'is_placeholder',
      'is_routing_eligible',
      'last_verified_on',
      'reference_source_id',
    ],
    model.routes.map(({ category, ward, id, code }) => [
      sqlText(id),
      `(select id from routing.issue_categories where code = ${sqlText(category.code)})`,
      sqlText(code),
      sqlText(`BMC internal ${category.code.replaceAll('_', ' ')} — ${ward.code} Ward`),
      sqlText('active'),
      sqlText('verified'),
      sqlText(verificationNotes),
      'false',
      'true',
      `${sqlText(routingLastVerifiedOn)}::date`,
      sourceReferenceSql(bmcConnectUrl),
    ]),
    'on conflict (id) do nothing',
  );
  const routeRuleVersionInsert = renderInsert(
    'routing.route_rule_versions',
    [
      'id',
      'route_rule_id',
      'version',
      'scope_authority_id',
      'scope_local_body_id',
      'scope_ward_id',
      'target_authority_id',
      'target_department_id',
      'target_officer_role_id',
      'target_office_id',
      'confidence_policy_version_id',
      'asset_requirement',
      'requires_asset_owner',
      'priority',
      'fallback_depth',
      'fallback_path',
      'confidence_factor_codes',
      'explanation_code',
      'routing_notes',
      'status',
      'verification_status',
      'verification_notes',
      'is_placeholder',
      'is_routing_eligible',
      'effective_from',
      'last_verified_on',
      'reference_source_id',
      'source_routing_reference_id',
    ],
    model.routes.map(({ category, ward, id, versionId }) => [
      sqlText(versionId),
      sqlText(id),
      '1',
      sqlText(bmcAuthorityId),
      sqlText(bmcLocalBodyId),
      sqlText(ward.id),
      sqlText(bmcAuthorityId),
      sqlText(category.departmentId),
      sqlText(model.wardAssistantCommissionerRoleId),
      sqlText(ward.officeId),
      sqlText(model.confidencePolicyVersionId),
      sqlText('none'),
      'false',
      '100',
      '0',
      `'{}'::uuid[]`,
      sqlTextArray(['jurisdiction', 'category', 'department', 'role']),
      sqlText('bmc_internal_demo_ward_role'),
      sqlText(
        'Internal Local Wellness queue target only; this rule does not send email, phone, portal, or other external BMC delivery.',
      ),
      sqlText('active'),
      sqlText('verified'),
      sqlText(verificationNotes),
      'false',
      'true',
      `${sqlText(routingEffectiveFrom)}::timestamptz`,
      `${sqlText(routingLastVerifiedOn)}::date`,
      sourceReferenceSql(bmcConnectUrl),
      sqlText(category.routingReferenceId),
    ]),
    'on conflict (route_rule_id, version) do nothing',
  );

  return `-- Generated by scripts/generate-bmc-demo-governance.mjs. Do not edit manually.
-- Optional BMC staging/demo activation: 3 asset-independent categories x 22 unambiguous wards.
-- This creates internal queue targets only. It does not approve or perform external BMC delivery.

begin;

do $bmc_internal_routing_preflight$
declare
  expected_ward_codes constant text[] := ${expectedWardCodesSql};
  excluded_ward_codes constant text[] := ${excludedWardCodesSql};
  expected_category_codes constant text[] := ${categoryCodesSql};
begin
  if not exists (
    select 1
    from governance.local_bodies as local_body
    inner join governance.authorities as authority on authority.id = local_body.authority_id
    where local_body.id = ${sqlText(bmcLocalBodyId)}
      and authority.id = ${sqlText(bmcAuthorityId)}
      and local_body.status = 'active'
      and local_body.verification_status = 'verified'
      and not local_body.is_placeholder
      and local_body.is_routing_eligible
      and authority.status = 'active'
      and authority.verification_status = 'verified'
      and not authority.is_placeholder
      and authority.is_routing_eligible
  ) then
    raise exception using errcode = '55000', message = 'BMC_ROUTING_AUTHORITY_NOT_ELIGIBLE';
  end if;

  if (
    select count(*)
    from governance.wards as ward
    inner join governance.ward_boundary_crosswalk_versions as crosswalk
      on crosswalk.operational_ward_id = ward.id
    where ward.local_body_id = ${sqlText(bmcLocalBodyId)}
      and ward.ward_number = any(expected_ward_codes)
      and ward.status = 'active'
      and ward.verification_status = 'verified'
      and not ward.is_placeholder
      and ward.is_routing_eligible
      and crosswalk.status = 'active'
      and crosswalk.verification_status = 'verified'
      and not crosswalk.is_placeholder
      and crosswalk.is_routing_eligible
      and crosswalk.relationship_type = 'one_to_one'
      and crosswalk.auto_route_allowed
      and crosswalk.effective_to is null
  ) <> 22 then
    raise exception using errcode = '55000', message = 'BMC_ROUTING_WARD_PREFLIGHT_FAILED';
  end if;

  if exists (
    select 1
    from governance.wards as ward
    left join governance.ward_boundary_crosswalk_versions as crosswalk
      on crosswalk.operational_ward_id = ward.id and crosswalk.effective_to is null
    where ward.local_body_id = ${sqlText(bmcLocalBodyId)}
      and ward.ward_number = any(excluded_ward_codes)
      and (ward.is_routing_eligible or crosswalk.is_routing_eligible or crosswalk.auto_route_allowed)
  ) then
    raise exception using errcode = '55000', message = 'BMC_ROUTING_SPLIT_CHILD_BECAME_ELIGIBLE';
  end if;

  if (
    select count(*)
    from routing.issue_categories as category
    where category.code = any(expected_category_codes)
      and not category.requires_asset
      and not category.is_emergency
  ) <> 3 then
    raise exception using errcode = '55000', message = 'BMC_ROUTING_CATEGORY_PREFLIGHT_FAILED';
  end if;

  if (
    select count(*)
    from governance.complaint_routing_references as reference
    where reference.id in (${model.categories.map(({ routingReferenceId }) => sqlText(routingReferenceId)).join(', ')})
      and reference.status = 'active'
      and reference.verification_status = 'verified'
      and not reference.is_placeholder
      and reference.is_routing_eligible
      and reference.normalization_status = 'resolved'
      and not reference.is_emergency
  ) <> 3 then
    raise exception using errcode = '55000', message = 'BMC_ROUTING_REFERENCE_PREFLIGHT_FAILED';
  end if;
end;
$bmc_internal_routing_preflight$;

update routing.issue_domains
set
  status = 'active',
  verification_status = 'verified',
  verification_notes = ${sqlText(categoryVerificationNotes)},
  is_placeholder = false,
  is_routing_eligible = true,
  last_verified_on = ${sqlText(routingLastVerifiedOn)}::date,
  reference_source_id = ${sourceReferenceSql(bmcConnectUrl)}
where code = 'civic_wellness';

${categoryUpdates}

${confidencePolicyInsert}

${confidencePolicyVersionInsert}

${duplicatePolicyInsert}

${duplicatePolicyVersionInsert}

${routeRuleInsert}

${routeRuleVersionInsert}

do $bmc_internal_routing_postflight$
begin
  if (
    select count(*)
    from routing.route_rules as rule
    inner join routing.route_rule_versions as version on version.route_rule_id = rule.id
    inner join routing.issue_categories as category on category.id = rule.category_id
    inner join governance.wards as ward on ward.id = version.scope_ward_id
    inner join governance.offices as office on office.id = version.target_office_id
    inner join governance.complaint_routing_references as source_reference
      on source_reference.id = version.source_routing_reference_id
    where rule.id in (${routeIdsSql})
      and version.id in (${routeVersionIdsSql})
      and rule.rule_code like 'BMC_INTERNAL_%'
      and rule.status = 'active'
      and rule.verification_status = 'verified'
      and not rule.is_placeholder
      and rule.is_routing_eligible
      and version.version = 1
      and version.scope_authority_id = ${sqlText(bmcAuthorityId)}
      and version.scope_local_body_id = ${sqlText(bmcLocalBodyId)}
      and ward.ward_number = any(${expectedWardCodesSql})
      and version.target_authority_id = ${sqlText(bmcAuthorityId)}
      and version.target_department_id = source_reference.primary_department_id
      and version.target_officer_role_id = ${sqlText(model.wardAssistantCommissionerRoleId)}
      and version.target_officer_role_id = source_reference.first_recipient_role_id
      and office.ward_id = ward.id
      and version.asset_requirement = 'none'
      and not version.requires_asset_owner
      and version.fallback_depth = 0
      and version.fallback_path = '{}'::uuid[]
      and version.confidence_policy_version_id = ${sqlText(model.confidencePolicyVersionId)}
      and version.status = 'active'
      and version.verification_status = 'verified'
      and not version.is_placeholder
      and version.is_routing_eligible
  ) <> 66 then
    raise exception using errcode = '55000', message = 'BMC_ROUTING_POSTFLIGHT_FAILED';
  end if;

  if exists (
    select 1
    from routing.route_rule_versions as version
    inner join governance.wards as ward on ward.id = version.scope_ward_id
    where version.id in (${routeVersionIdsSql})
      and ward.ward_number = any(${excludedWardCodesSql})
  ) or exists (
    select 1
    from routing.route_rule_versions as version
    inner join governance.wards as ward on ward.id = version.scope_ward_id
    where version.id in (${routeVersionIdsSql})
      and ward.ward_number = any(${legacyAnchorCodesSql})
  ) then
    raise exception using errcode = '55000', message = 'BMC_ROUTING_FAIL_CLOSED_WARD_VIOLATION';
  end if;
end;
$bmc_internal_routing_postflight$;

commit;
`;
};

const renderBmcInternalRoutingVerificationSql = (
  model,
  routingSeedSha256,
) => `-- Generated by scripts/generate-bmc-demo-governance.mjs. Do not edit manually.
-- Verification companion for optional BMC internal routing seed SHA-256 ${routingSeedSha256}.

begin;

do $bmc_internal_routing_verification$
declare
  candidate_count integer;
  covered_case_count integer;
begin
  if (
    select count(*)
    from routing.issue_categories
    where code = any(${sqlTextArray(model.categories.map(({ code }) => code))})
      and status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and is_routing_eligible
  ) <> 3 then
    raise exception using errcode = '55000', message = 'BMC_ROUTING_OPERATIONAL_CATEGORY_COUNT_INVALID';
  end if;

  if (
    select count(*)
    from routing.route_rules as rule
    inner join routing.route_rule_versions as version on version.route_rule_id = rule.id
    where rule.rule_code like 'BMC_INTERNAL_%'
      and rule.status = 'active'
      and rule.verification_status = 'verified'
      and not rule.is_placeholder
      and rule.is_routing_eligible
      and version.status = 'active'
      and version.verification_status = 'verified'
      and not version.is_placeholder
      and version.is_routing_eligible
  ) <> 66 then
    raise exception using errcode = '55000', message = 'BMC_ROUTING_RULE_COUNT_INVALID';
  end if;

  if exists (
    select 1
    from governance.contact_channel_versions as version
    inner join governance.contact_channels as channel on channel.id = version.contact_channel_id
    where version.is_complaint_delivery_approved
      and (
        channel.authority_id = ${sqlText(bmcAuthorityId)}
        or channel.local_body_id = ${sqlText(bmcLocalBodyId)}
        or channel.ward_id in (
          select id from governance.wards where local_body_id = ${sqlText(bmcLocalBodyId)}
        )
        or channel.office_id in (
          select id from governance.offices where authority_id = ${sqlText(bmcAuthorityId)}
        )
        or channel.officer_assignment_id in (
          select id
          from governance.officer_assignments
          where authority_id = ${sqlText(bmcAuthorityId)}
        )
      )
  ) then
    raise exception using errcode = '55000', message = 'BMC_EXTERNAL_DELIVERY_APPROVAL_DETECTED';
  end if;

  with routing_cases as (
    select
      category.id as category_id,
      ward.id as ward_id,
      extensions.st_pointonsurface(boundary.boundary) as location
    from routing.issue_categories as category
    cross join governance.wards as ward
    inner join governance.ward_boundary_crosswalk_versions as crosswalk
      on crosswalk.operational_ward_id = ward.id
      and crosswalk.status = 'active'
      and crosswalk.is_routing_eligible
      and crosswalk.auto_route_allowed
      and crosswalk.relationship_type = 'one_to_one'
      and crosswalk.effective_to is null
    inner join governance.jurisdiction_boundary_versions as boundary
      on boundary.id = crosswalk.official_boundary_version_id
    where category.code = any(${sqlTextArray(model.categories.map(({ code }) => code))})
      and ward.local_body_id = ${sqlText(bmcLocalBodyId)}
      and ward.ward_number = any(${sqlTextArray(model.wards.map(({ code }) => code))})
  ), resolved as (
    select routing_case.category_id, routing_case.ward_id, candidate.candidate_id
    from routing_cases as routing_case
    cross join lateral public.resolve_routing_candidates(
      extensions.st_x(routing_case.location),
      extensions.st_y(routing_case.location),
      5,
      routing_case.category_id,
      null,
      ${sqlText('2026-07-17T00:00:00Z')}::timestamptz
    ) as candidate
    where candidate.ward_id = routing_case.ward_id
  )
  select count(*), count(distinct (category_id, ward_id))
  into candidate_count, covered_case_count
  from resolved;

  if candidate_count <> 66 or covered_case_count <> 66 then
    raise exception using errcode = '55000', message = 'BMC_ROUTING_POINT_RESOLUTION_FAILED';
  end if;

  if not exists (
    select 1
    from governance.import_batches
    where dataset_key = ${sqlText(datasetKey)}
      and dataset_version = ${sqlText(datasetVersion)}
      and status = 'imported'
      and validation_summary ->> 'externalDeliveryApproved' = 'false'
  ) then
    raise exception using errcode = '55000', message = 'BMC_ROUTING_IMPORT_BATCH_NOT_FOUND';
  end if;
end;
$bmc_internal_routing_verification$;

commit;
`;

const renderChecksumSql = (generatedSeedSha256) => {
  const batchId = stableGovernanceUuid('import-batch', `${datasetKey}:${datasetVersion}`);

  return `-- Generated companion for the hash-pinned BMC staging/demo governance seed.
-- Records the externally computed main-seed SHA-256 without creating a self-reference.
-- Do not edit this file manually; run \`pnpm governance:bmc:generate\`.
begin;
do $bmc_governance_seed_checksum$
declare
  affected_rows integer;
begin
  update governance.import_batches
  set generated_seed_sha256 = ${sqlText(generatedSeedSha256)}
  where id = ${sqlText(batchId)}
    and dataset_key = ${sqlText(datasetKey)}
    and dataset_version = ${sqlText(datasetVersion)}
    and (
      generated_seed_sha256 is null
      or generated_seed_sha256 = ${sqlText(generatedSeedSha256)}
    );

  get diagnostics affected_rows = row_count;

  if affected_rows <> 1 then
    raise exception using
      errcode = '55000',
      message = 'Expected exactly one matching BMC governance import batch while recording the generated seed checksum.';
  end if;
end
$bmc_governance_seed_checksum$;
commit;
`;
};

const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`;

const verifyPinnedSource = async (name, path) => {
  const bytes = await readFile(path);
  const actualSha256 = sha256(bytes);
  if (actualSha256 !== sourcePins[name]) {
    throw new Error(
      `${repositoryPath(path)} changed: expected SHA-256 ${sourcePins[name]}, received ${actualSha256}. Create a new dataset version instead of silently replacing the pinned source.`,
    );
  }
  return bytes;
};

export const buildBmcDemoGovernanceArtifacts = async () => {
  const [workbookBytes, guideBytes, geometryBytes] = await Promise.all([
    verifyPinnedSource('workbook', sourcePaths.workbook),
    verifyPinnedSource('guide', sourcePaths.guide),
    verifyPinnedSource('geometry', sourcePaths.geometry),
  ]);
  const geometry = JSON.parse(geometryBytes.toString('utf8'));
  const geometryBounds = validateGeometry(geometry);
  const workbook = parseWorkbook(workbookBytes);
  const diagnostics = validateRows(workbook, geometry);
  const errors = diagnostics.filter(({ severity }) => severity === 'error');
  if (errors.length > 0) {
    throw new Error(
      `BMC bootstrap validation failed:\n${errors.map(({ code, message }) => `- ${code}: ${message}`).join('\n')}`,
    );
  }

  const csvFiles = new Map();
  for (const definition of sheetDefinitions) {
    const table = workbook.tables.get(definition.name);
    if (table === undefined) {
      throw new Error(`Required table ${definition.name} is missing after validation.`);
    }
    csvFiles.set(definition.name, renderCsv(table));
  }

  const manifest = {
    schemaVersion: 1,
    datasetVersion,
    generatedFromLastCheckedOn: sourceLastCheckedOn,
    workbook: {
      path: repositoryPath(sourcePaths.workbook),
      sha256: sha256(workbookBytes),
      role: 'human_reference',
    },
    guide: {
      path: repositoryPath(sourcePaths.guide),
      sha256: sha256(guideBytes),
      role: 'activation_policy',
    },
    geometry: {
      path: repositoryPath(sourcePaths.geometry),
      sha256: sha256(geometryBytes),
      role: 'legacy_ward_boundary_reference',
      sourceUrl: bmcGeometrySourceUrl,
      layerMetadataUrl: bmcGeometryLayerMetadataUrl,
      nativeCrs: 'EPSG:32643',
      storedCrs: geometry.crs.properties.name,
      expectedFeatureCount: geometry.features.length,
      wardCodes: geometry.features.map((feature) => geometryProperty(feature, 'NAME')).sort(),
    },
    expectedRawRecordCount: sheetDefinitions.reduce(
      (total, { expectedRecordCount }) => total + expectedRecordCount,
      0,
    ),
    datasets: sheetDefinitions.map((definition) => {
      const csv = csvFiles.get(definition.name);
      if (csv === undefined) {
        throw new Error(`Generated CSV is missing for ${definition.name}.`);
      }
      return {
        id: definition.fileName.replace(/\.csv$/u, '').toLocaleLowerCase('en-US'),
        sheet: definition.name,
        path: repositoryPath(join(outputPaths.csvDirectory, definition.fileName)),
        sha256: sha256(csv),
        headers: definition.headers,
        expectedRecordCount: definition.expectedRecordCount,
        naturalKey: definition.naturalKey,
        disposition: normalizedSheetNames.has(definition.name) ? 'normalized' : 'reference_only',
      };
    }),
  };
  const manifestText = jsonText(manifest);
  const manifestSha256 = sha256(manifestText);
  const { sql, normalizedModel } = renderSql({
    workbook,
    geometry,
    manifestSha256,
    csvFiles,
    diagnostics,
  });
  const generatedSeedSha256 = sha256(sql);
  const checksumSql = renderChecksumSql(generatedSeedSha256);
  const internalRoutingModel = buildBmcInternalRoutingModel(normalizedModel);
  const routingSql = renderBmcInternalRoutingSql(internalRoutingModel);
  const routingSeedSha256 = sha256(routingSql);
  const routingVerificationSql = renderBmcInternalRoutingVerificationSql(
    internalRoutingModel,
    routingSeedSha256,
  );
  const routingVerificationSha256 = sha256(routingVerificationSql);
  const report = {
    schemaVersion: 1,
    datasetVersion,
    status: 'passed_with_warnings',
    manifest: {
      path: repositoryPath(outputPaths.manifest),
      sha256: manifestSha256,
    },
    counts: {
      tables: sheetDefinitions.length,
      rawSourceRecords: manifest.expectedRawRecordCount,
      geometryFeatures: geometry.features.length,
      errors: 0,
      warnings: diagnostics.filter(({ severity }) => severity === 'warning').length,
    },
    geometry: {
      nativeCrs: 'EPSG:32643',
      storedCrs: geometry.crs.properties.name,
      bounds: geometryBounds,
      operationalWardCount: workbook.tables.get('Ward Offices')?.rows.length ?? 0,
      legacyGeometryWardCount: geometry.features.length,
      unconditionalDemoWardCount:
        workbook.tables
          .get('Ward Offices')
          ?.rows.filter(({ values }) => values.demo_routable === 'true').length ?? 0,
      conditionalDemoWardCount:
        workbook.tables
          .get('Ward Offices')
          ?.rows.filter(({ values }) => values.demo_routable === 'conditional').length ?? 0,
    },
    generatedSeed: {
      path: repositoryPath(outputPaths.sql),
      sha256: generatedSeedSha256,
      checksumCompanionPath: repositoryPath(outputPaths.checksumSql),
      normalizationDisposition: 'normalized_with_reference_only_records',
      externalDeliveryApproved: false,
    },
    generatedRoutingSeed: {
      path: repositoryPath(outputPaths.routingSql),
      sha256: routingSeedSha256,
      verificationPath: repositoryPath(outputPaths.routingVerificationSql),
      verificationSha256: routingVerificationSha256,
      operationalCategoryCount: internalRoutingModel.categories.length,
      operationalWardCount: internalRoutingModel.wards.length,
      routeRuleCount: internalRoutingModel.routes.length,
      externalDeliveryApproved: false,
    },
    diagnostics,
  };
  const validationText = jsonText(report);

  const files = new Map([
    [outputPaths.manifest, manifestText],
    [outputPaths.validation, validationText],
    [outputPaths.sql, sql],
    [outputPaths.checksumSql, checksumSql],
    [outputPaths.routingSql, routingSql],
    [outputPaths.routingVerificationSql, routingVerificationSql],
  ]);
  for (const definition of sheetDefinitions) {
    files.set(join(outputPaths.csvDirectory, definition.fileName), csvFiles.get(definition.name));
  }

  return { files, manifest, report, workbook };
};

const checkArtifacts = async (files) => {
  const stale = [];
  for (const [path, expected] of files) {
    let actual;
    try {
      actual = await readFile(path, 'utf8');
    } catch {
      stale.push(`${repositoryPath(path)} is missing`);
      continue;
    }
    if (actual !== expected) {
      stale.push(`${repositoryPath(path)} is stale`);
    }
  }
  if (stale.length > 0) {
    throw new Error(`Generated BMC governance artifacts are not current:\n- ${stale.join('\n- ')}`);
  }
};

const writeArtifacts = async (files) => {
  for (const [path, contents] of files) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, contents, 'utf8');
  }
};

const main = async () => {
  const checkOnly = process.argv.includes('--check');
  const { files, report } = await buildBmcDemoGovernanceArtifacts();
  if (checkOnly) {
    await checkArtifacts(files);
  } else {
    await writeArtifacts(files);
  }
  process.stdout.write(
    `${checkOnly ? 'Checked' : 'Generated'} ${report.counts.rawSourceRecords} BMC source records across ${report.counts.tables} tables with ${report.counts.warnings} preserved warning(s).\n`,
  );
};

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  await main();
}
