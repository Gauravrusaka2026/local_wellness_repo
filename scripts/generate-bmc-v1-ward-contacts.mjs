import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const issueContactSourcePath = join(
  repositoryRoot,
  'resources/Mumbai_BMC_Ward_Issue_Contacts_CSV.zip',
);
const emailDirectorySourcePath = join(
  repositoryRoot,
  'resources/local_wellness_bmc_ward_directory_2026-07-20.zip',
);
const outputPath = join(
  repositoryRoot,
  'supabase/seed/54_bmc_v1_ward_issue_contacts.generated.sql',
);

const stableUuidNamespace = 'f4f74f8d-dfe5-5b1f-a5d2-64705c90d68c';
const bmcAuthorityId = '3fabe3b8-47cf-58fe-a59c-bb34bd02322a';
const bmcLocalBodyId = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd';
const bmcCentralDepartmentId = 'c3cb4f48-502e-572c-9c85-5d200b886ac8';
const bmcCentralOfficerRoleId = 'e64f33aa-2731-5a4a-85e6-eff09f7e6005';
const bmcCentralOfficeId = '25f5bf8f-d034-5bbd-976a-0be621edf148';
const bmcConfidencePolicyVersionId = '4235f4f1-d01d-5a40-93cb-5aa2a5537945';
const bmcConnectUrl =
  'https://dm.mcgm.gov.in/assets/pdf/Final%20updated%20Final%20Connect%20Diary%202021.07.07.2021.pdf';

const expectedIssueContactMembers = Object.freeze([
  'ward_directory.csv',
  'ward_issue_matrix.csv',
  'ward_issue_long_form.csv',
]);

const emailDirectoryPrefix = 'local_wellness_bmc_ward_directory_2026-07-20/';
const expectedEmailDirectoryMembers = Object.freeze(
  [
    '00_research_summary.md',
    'A_source_registry.csv',
    'B2_operational_subscopes.csv',
    'B_municipality_ward_coverage.csv',
    'C_departments.csv',
    'D2_officer_assignments.csv',
    'D_durable_officer_roles.csv',
    'E2_zonal_contacts.csv',
    'E3_central_controls.csv',
    'E_offices_contacts.csv',
    'F_category_routing_matrix.csv',
    'G_required_category_fields.csv',
    'H_data_conflicts_gaps.csv',
    'I_import_ready.json',
    'J_validation_report.csv',
    'K_promotion_recommendation.md',
    'L_access_log.csv',
    'MANIFEST.sha256',
    'evidence/README.md',
  ].map((fileName) => `${emailDirectoryPrefix}${fileName}`),
);

const emailOfficeMember = `${emailDirectoryPrefix}E_offices_contacts.csv`;
const emailOperationalScopeMember = `${emailDirectoryPrefix}B2_operational_subscopes.csv`;

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

const categories = Object.freeze([
  Object.freeze({ issue: 'Garbage dump', code: 'garbage_dump' }),
  Object.freeze({ issue: 'Missed sweeping', code: 'missed_sweeping' }),
  Object.freeze({ issue: 'Pothole', code: 'pothole' }),
  Object.freeze({ issue: 'Blocked drain', code: 'blocked_drain' }),
  Object.freeze({ issue: 'Sewage overflow', code: 'sewage_overflow' }),
  Object.freeze({ issue: 'Water leakage', code: 'water_leakage' }),
  Object.freeze({ issue: 'Broken streetlight', code: 'broken_streetlight' }),
  Object.freeze({ issue: 'Open manhole', code: 'open_manhole' }),
  Object.freeze({ issue: 'Mosquito breeding', code: 'mosquito_breeding' }),
  Object.freeze({ issue: 'Illegal construction', code: 'illegal_construction' }),
  Object.freeze({ issue: 'Encroachment', code: 'encroachment' }),
  Object.freeze({ issue: 'Fallen tree', code: 'fallen_tree' }),
]);

const expectedHeaders = Object.freeze({
  'ward_directory.csv': Object.freeze([
    'Ward',
    'Region',
    'Ward Control Room',
    'BMC Central',
    'Official WhatsApp',
    'Source As Of',
    'Last Checked',
    'Source URL',
  ]),
  'ward_issue_matrix.csv': Object.freeze([
    'Ward',
    'Region',
    'Ward Control Room',
    ...categories.map(({ issue }) =>
      issue
        .split(' ')
        .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
        .join(' '),
    ),
    'Official WhatsApp',
    'Central Fallback',
    'WhatsApp Note',
    'Ward Source URL',
    'Issue-Control Source URL',
  ]),
  'ward_issue_long_form.csv': Object.freeze([
    'Ward',
    'Region',
    'Issue',
    'Primary Ward Control Room',
    'Secondary Issue/Regional Contact',
    'BMC Central Fallback',
    'Official WhatsApp',
    'Recommended Durable Role',
    'Usage Note',
    'Verification Status',
    'Production Auto-Contact Approved?',
    'Source As Of',
    'Last Checked',
    'Ward Source URL',
    'Issue-Control Source URL',
  ]),
  [emailOfficeMember]: Object.freeze([
    'contact_id',
    'municipality',
    'department_code',
    'ward_code',
    'operational_scope_code',
    'office_name',
    'address_raw',
    'address_normalized',
    'main_office_phone_raw',
    'ward_control_phone_raw',
    'assistant_commissioner_office_phone_raw',
    'assistant_commissioner_mobile_raw',
    'assistant_commissioner_email_raw',
    'email_normalized',
    'website',
    'contact_type',
    'complaint_intake_supported',
    'automated_delivery_approved',
    'delivery_approval_basis',
    'official_source_url',
    'source_ids',
    'source_page',
    'source_as_of',
    'verification_status',
    'last_verified',
    'retrieved_at',
    'notes',
  ]),
  [emailOperationalScopeMember]: Object.freeze([
    'municipality',
    'scope_code',
    'scope_name',
    'scope_type',
    'parent_ward_code',
    'address',
    'office_phone',
    'control_room_phone',
    'assistant_commissioner_email',
    'official_source_url',
    'source_page',
    'source_as_of',
    'last_verified',
    'retrieved_at',
    'verification_status',
    'routable',
    'notes',
  ]),
});

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const sqlText = (value) => `'${value.replaceAll("'", "''")}'`;
const sqlNullableText = (value) => (value === '' ? 'null' : sqlText(value));
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

const isSafeArchiveMember = (fileName) => {
  if (
    fileName.length === 0 ||
    fileName.includes('\0') ||
    fileName.includes('\\') ||
    fileName.startsWith('/') ||
    /^[a-z]:/iu.test(fileName)
  ) {
    return false;
  }
  const normalized = posix.normalize(fileName);
  return normalized === fileName && normalized !== '..' && !normalized.startsWith('../');
};

const readZipEntries = (archive, maximumUncompressedBytes) => {
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
  assert(endOfDirectoryOffset >= 0, 'Source bundle is not a supported ZIP archive.');
  assert(
    archive.readUInt16LE(endOfDirectoryOffset + 4) === 0 &&
      archive.readUInt16LE(endOfDirectoryOffset + 6) === 0,
    'Multi-disk ZIP archives are not supported.',
  );
  const entryCount = archive.readUInt16LE(endOfDirectoryOffset + 10);
  assert(
    entryCount === archive.readUInt16LE(endOfDirectoryOffset + 8),
    'ZIP entry counts disagree.',
  );
  let centralDirectoryOffset = archive.readUInt32LE(endOfDirectoryOffset + 16);
  const entries = new Map();
  let expandedBytes = 0;

  for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
    assert(
      archive.readUInt32LE(centralDirectoryOffset) === centralDirectorySignature,
      `ZIP central-directory entry ${entryIndex} is malformed.`,
    );
    const flags = archive.readUInt16LE(centralDirectoryOffset + 8);
    const compressionMethod = archive.readUInt16LE(centralDirectoryOffset + 10);
    const compressedSize = archive.readUInt32LE(centralDirectoryOffset + 20);
    const uncompressedSize = archive.readUInt32LE(centralDirectoryOffset + 24);
    const fileNameLength = archive.readUInt16LE(centralDirectoryOffset + 28);
    const extraFieldLength = archive.readUInt16LE(centralDirectoryOffset + 30);
    const commentLength = archive.readUInt16LE(centralDirectoryOffset + 32);
    const externalAttributes = archive.readUInt32LE(centralDirectoryOffset + 38);
    const localHeaderOffset = archive.readUInt32LE(centralDirectoryOffset + 42);
    const fileNameStart = centralDirectoryOffset + 46;
    const fileName = archive
      .subarray(fileNameStart, fileNameStart + fileNameLength)
      .toString((flags & 0x0800) === 0 ? 'latin1' : 'utf8');
    const unixMode = externalAttributes >>> 16;

    assert(isSafeArchiveMember(fileName), `Unsafe ZIP member path: ${fileName}.`);
    assert(!entries.has(fileName), `Duplicate ZIP member path: ${fileName}.`);
    assert((flags & 0x0001) === 0, `Encrypted ZIP member is not supported: ${fileName}.`);
    assert((unixMode & 0o170000) !== 0o120000, `Symbolic-link ZIP member rejected: ${fileName}.`);
    assert(
      compressionMethod === 0 || compressionMethod === 8,
      `Unsupported compression method ${compressionMethod} for ${fileName}.`,
    );
    expandedBytes += uncompressedSize;
    assert(
      expandedBytes <= maximumUncompressedBytes,
      `ZIP expansion exceeds ${maximumUncompressedBytes} bytes.`,
    );
    assert(
      compressedSize === 0 || uncompressedSize / compressedSize <= 200,
      `Suspicious compression ratio for ${fileName}.`,
    );
    assert(
      archive.readUInt32LE(localHeaderOffset) === localFileSignature,
      `ZIP local header is malformed for ${fileName}.`,
    );
    const localFileNameLength = archive.readUInt16LE(localHeaderOffset + 26);
    const localExtraFieldLength = archive.readUInt16LE(localHeaderOffset + 28);
    const compressedDataStart =
      localHeaderOffset + 30 + localFileNameLength + localExtraFieldLength;
    const compressedData = archive.subarray(
      compressedDataStart,
      compressedDataStart + compressedSize,
    );
    const contents =
      compressionMethod === 0 ? Buffer.from(compressedData) : inflateRawSync(compressedData);
    assert(
      contents.length === uncompressedSize,
      `ZIP member ${fileName} expanded to an unexpected size.`,
    );
    entries.set(fileName, contents);
    centralDirectoryOffset += 46 + fileNameLength + extraFieldLength + commentLength;
  }
  return entries;
};

const parseCsv = (bytes, fileName) => {
  const contents = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/u, '');
  assert(!contents.includes('\u0000'), `${fileName} contains a NUL byte.`);
  const records = [];
  let record = [];
  let field = '';
  let quoted = false;
  let index = 0;
  while (index < contents.length) {
    const character = contents[index];
    if (quoted) {
      if (character === '"') {
        if (contents[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        quoted = false;
        index += 1;
        continue;
      }
      field += character;
      index += 1;
      continue;
    }
    if (character === '"') {
      assert(field.length === 0, `${fileName} has a quote inside an unquoted field.`);
      quoted = true;
      index += 1;
      continue;
    }
    if (character === ',') {
      record.push(field);
      field = '';
      index += 1;
      continue;
    }
    if (character === '\n' || character === '\r') {
      record.push(field);
      records.push(record);
      record = [];
      field = '';
      index += character === '\r' && contents[index + 1] === '\n' ? 2 : 1;
      continue;
    }
    field += character;
    index += 1;
  }
  assert(!quoted, `${fileName} ends inside a quoted field.`);
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  assert(records.length > 0, `${fileName} is missing its header row.`);
  const headers = records[0];
  assert(headers.every(Boolean), `${fileName} has a blank header.`);
  assert(new Set(headers).size === headers.length, `${fileName} has duplicate headers.`);
  const rows = records.slice(1).map((values, rowIndex) => {
    assert(
      values.length === headers.length,
      `${fileName}:${rowIndex + 2} has ${values.length} columns; expected ${headers.length}.`,
    );
    assert(
      values.every((value) => !/^[=@]/u.test(value)),
      `${fileName}:${rowIndex + 2} contains a spreadsheet-formula prefix.`,
    );
    return Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex]]));
  });
  return { headers, rows };
};

const assertHeaders = (fileName, headers) => {
  const expected = expectedHeaders[fileName];
  assert(
    JSON.stringify(headers) === JSON.stringify(expected),
    `${fileName} headers differ from the expected contract.`,
  );
};

const validateUrl = (value, context) => {
  const url = new URL(value);
  assert(url.protocol === 'https:', `${context} must use HTTPS.`);
};

const validateDate = (value, context) => {
  assert(/^\d{4}-\d{2}-\d{2}$/u.test(value), `${context} must be an ISO date.`);
};

const validateEmail = (value, context) => {
  assert(value === value.trim().toLowerCase(), `${context} must be normalized.`);
  assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value), `${context} is invalid.`);
  assert(value.endsWith('@mcgm.gov.in'), `${context} must use the official BMC domain.`);
};

const buildEmailDirectory = ({ offices, operationalScopes }) => {
  assert(offices.length === 24, `E_offices_contacts.csv has ${offices.length} rows; expected 24.`);
  assert(
    operationalScopes.length === 4,
    `B2_operational_subscopes.csv has ${operationalScopes.length} rows; expected 4.`,
  );

  const expectedWardSet = new Set(wards);
  const expectedStatuses = new Set(['source_verified', 'conflicting', 'unverified']);
  const contacts = new Map();
  const addContact = ({ ward, email, sourceUrl, sourceAsOf, lastCheckedOn, locator, status }) => {
    assert(expectedWardSet.has(ward), `${locator} maps to unsupported ward ${ward}.`);
    validateEmail(email, `${locator} email`);
    validateUrl(sourceUrl, `${locator} source URL`);
    validateDate(sourceAsOf, `${locator} source-as-of`);
    validateDate(lastCheckedOn, `${locator} last-checked date`);
    assert(sourceAsOf <= lastCheckedOn, `${locator} was checked before its source date.`);
    assert(expectedStatuses.has(status), `${locator} has unsupported source status ${status}.`);
    contacts.set(ward, {
      email,
      sourceUrl,
      sourceAsOf,
      lastCheckedOn,
      locator,
      sourceReportedStatus: status,
    });
  };

  const officeIds = new Set();
  for (const [rowIndex, row] of offices.entries()) {
    const context = `E_offices_contacts.csv:${rowIndex + 2}`;
    assert(row.municipality === 'BMC', `${context} is not a BMC record.`);
    assert(row.contact_id !== '', `${context} is missing contact_id.`);
    assert(!officeIds.has(row.contact_id), `${context} duplicates ${row.contact_id}.`);
    officeIds.add(row.contact_id);
    assert(
      row.email_normalized === row.assistant_commissioner_email_raw,
      `${context} email fields disagree.`,
    );
    assert(
      row.complaint_intake_supported === 'false',
      `${context} changed the source intake flag.`,
    );
    assert(
      row.automated_delivery_approved === 'false',
      `${context} changed the source delivery flag.`,
    );
    const ward = row.operational_scope_code || row.ward_code;
    addContact({
      ward,
      email: row.email_normalized,
      sourceUrl: row.official_source_url,
      sourceAsOf: row.source_as_of,
      lastCheckedOn: row.last_verified,
      locator: `E_offices_contacts.csv:${row.contact_id}:page-${row.source_page}`,
      status: row.verification_status,
    });
  }

  assert(contacts.size === 24, 'Ward office email records must map to 24 operational wards.');

  const expectedParentByScope = new Map([
    ['K/S', 'K/E'],
    ['K/N', 'K/E'],
    ['P/E', 'P/N'],
    ['P/W', 'P/N'],
  ]);
  const observedScopes = new Set();
  for (const [rowIndex, row] of operationalScopes.entries()) {
    const context = `B2_operational_subscopes.csv:${rowIndex + 2}`;
    assert(row.municipality === 'BMC', `${context} is not a BMC record.`);
    assert(
      row.scope_type === 'operational_ward_label',
      `${context} has an unsupported scope type.`,
    );
    assert(row.routable === 'false', `${context} changed the source routable flag.`);
    assert(
      expectedParentByScope.get(row.scope_code) === row.parent_ward_code,
      `${context} has an unexpected parent ward mapping.`,
    );
    assert(!observedScopes.has(row.scope_code), `${context} duplicates ${row.scope_code}.`);
    observedScopes.add(row.scope_code);
    addContact({
      ward: row.scope_code,
      email: row.assistant_commissioner_email,
      sourceUrl: row.official_source_url,
      sourceAsOf: row.source_as_of,
      lastCheckedOn: row.last_verified,
      locator: `B2_operational_subscopes.csv:${row.scope_code}:page-${row.source_page}`,
      status: row.verification_status,
    });
  }

  assert(observedScopes.size === 4, 'Operational email coverage is incomplete.');
  assert(contacts.size === 26, `Email directory maps ${contacts.size} wards; expected 26.`);
  assert(
    wards.every((ward) => contacts.has(ward)),
    'Email directory does not cover every V1 operational ward.',
  );
  assert(
    new Set([...contacts.values()].map(({ email }) => email)).size === 26,
    'Each V1 operational ward must resolve to a distinct recipient email.',
  );
  return contacts;
};

const verifyEmailDirectoryManifest = (entries) => {
  const manifestMember = `${emailDirectoryPrefix}MANIFEST.sha256`;
  const manifest = new TextDecoder('utf-8', { fatal: true })
    .decode(entries.get(manifestMember))
    .trim();
  const expectedPayloadMembers = expectedEmailDirectoryMembers.filter(
    (member) => member !== manifestMember,
  );
  const observedMembers = new Set();
  for (const [lineIndex, line] of manifest.split(/\r?\n/u).entries()) {
    const match = /^([a-f0-9]{64}) {2}(.+)$/u.exec(line);
    assert(match !== null, `MANIFEST.sha256:${lineIndex + 1} is malformed.`);
    const [, expectedHash, relativeMember] = match;
    const member = `${emailDirectoryPrefix}${relativeMember}`;
    assert(
      expectedPayloadMembers.includes(member),
      `MANIFEST.sha256:${lineIndex + 1} references an unexpected member.`,
    );
    assert(!observedMembers.has(member), `MANIFEST.sha256 duplicates ${relativeMember}.`);
    observedMembers.add(member);
    const actualHash = createHash('sha256').update(entries.get(member)).digest('hex');
    assert(actualHash === expectedHash, `${relativeMember} does not match MANIFEST.sha256.`);
  }
  assert(
    observedMembers.size === expectedPayloadMembers.length,
    'MANIFEST.sha256 does not cover every email-directory payload.',
  );
};

const validateSource = ({ directory, matrix, longForm, emailDirectory }) => {
  assert(directory.length === 26, `ward_directory.csv has ${directory.length} rows; expected 26.`);
  assert(matrix.length === 26, `ward_issue_matrix.csv has ${matrix.length} rows; expected 26.`);
  assert(
    longForm.length === 312,
    `ward_issue_long_form.csv has ${longForm.length} rows; expected 312.`,
  );
  assert(emailDirectory.size === 26, 'Recipient email directory must contain 26 wards.');

  const expectedWardSet = new Set(wards);
  const expectedIssueSet = new Set(categories.map(({ issue }) => issue));
  for (const [fileName, rows] of [
    ['ward_directory.csv', directory],
    ['ward_issue_matrix.csv', matrix],
  ]) {
    assert(
      new Set(rows.map((row) => row.Ward)).size === 26,
      `${fileName} contains duplicate wards.`,
    );
    assert(
      rows.every((row) => expectedWardSet.has(row.Ward)),
      `${fileName} contains an unsupported ward.`,
    );
  }

  const directoryByWard = new Map(directory.map((row) => [row.Ward, row]));
  const matrixByWard = new Map(matrix.map((row) => [row.Ward, row]));
  const longKeys = new Set();
  for (const [rowIndex, row] of longForm.entries()) {
    const context = `ward_issue_long_form.csv:${rowIndex + 2}`;
    assert(expectedWardSet.has(row.Ward), `${context} has unsupported ward ${row.Ward}.`);
    assert(expectedIssueSet.has(row.Issue), `${context} has unsupported issue ${row.Issue}.`);
    const key = `${row.Ward}\u0000${row.Issue}`;
    assert(!longKeys.has(key), `${context} duplicates ${row.Ward}/${row.Issue}.`);
    longKeys.add(key);

    for (const fieldName of [
      'Region',
      'Primary Ward Control Room',
      'BMC Central Fallback',
      'Official WhatsApp',
      'Recommended Durable Role',
      'Usage Note',
      'Verification Status',
      'Production Auto-Contact Approved?',
      'Source As Of',
      'Last Checked',
      'Ward Source URL',
      'Issue-Control Source URL',
    ]) {
      assert(row[fieldName] !== '', `${context} is missing ${fieldName}.`);
    }
    assert(
      /^\d{4}-\d{2}-\d{2}$/u.test(row['Source As Of']),
      `${context} has invalid Source As Of.`,
    );
    assert(
      /^\d{4}-\d{2}-\d{2}$/u.test(row['Last Checked']),
      `${context} has invalid Last Checked.`,
    );
    assert(
      row['Source As Of'] <= row['Last Checked'],
      `${context} was checked before its source date.`,
    );
    validateUrl(row['Ward Source URL'], `${context} Ward Source URL`);
    validateUrl(row['Issue-Control Source URL'], `${context} Issue-Control Source URL`);
    assert(
      row['Production Auto-Contact Approved?'] === 'false',
      `${context} changed the source auto-contact approval flag.`,
    );

    const directoryRow = directoryByWard.get(row.Ward);
    const matrixRow = matrixByWard.get(row.Ward);
    assert(
      directoryRow !== undefined && matrixRow !== undefined,
      `${context} has no ward summary row.`,
    );
    assert(
      directoryRow['Ward Control Room'] === row['Primary Ward Control Room'] &&
        directoryRow['BMC Central'] === row['BMC Central Fallback'] &&
        directoryRow['Official WhatsApp'] === row['Official WhatsApp'],
      `${context} disagrees with ward_directory.csv.`,
    );
    const matrixHeader = row.Issue.replace(/(^|\s)\p{Ll}/gu, (match) => match.toUpperCase());
    const normalizeContactSequence = (value) => value.replaceAll(/\s*[|;]\s*/gu, '|');
    const matrixValue = normalizeContactSequence(matrixRow[matrixHeader]);
    const primaryValue = normalizeContactSequence(row['Primary Ward Control Room']);
    const secondaryValue = normalizeContactSequence(row['Secondary Issue/Regional Contact']);
    const fallbackValue = normalizeContactSequence(row['BMC Central Fallback']);
    assert(
      matrixValue.startsWith(primaryValue) &&
        matrixValue.includes(fallbackValue) &&
        (secondaryValue === '' || matrixValue.includes(secondaryValue)),
      `${context} disagrees with the issue matrix.`,
    );
    assert(emailDirectory.has(row.Ward), `${context} has no valid recipient email mapping.`);
  }
  assert(
    longKeys.size === wards.length * categories.length,
    'Ward/category coverage is incomplete.',
  );
};

const renderSeed = (rows, issueContactSourceSha256, emailDirectorySourceSha256, emailDirectory) => {
  const categoryCodes = categories.map(({ code }) => sqlText(code)).join(', ');
  const rules = categories.map(({ issue, code }) => ({
    issue,
    code,
    ruleCode: `V1_WARD_${code.toUpperCase()}`,
    ruleId: stableUuid('v1-ward-route-rule', code),
    versionId: stableUuid('v1-ward-route-rule-version', code),
  }));
  const ruleCodes = rules.map(({ ruleCode }) => sqlText(ruleCode)).join(', ');
  const contactValues = rows.map((row) => {
    const code = categories.find(({ issue }) => issue === row.Issue)?.code;
    assert(code !== undefined, `No routing code exists for ${row.Issue}.`);
    const emailContact = emailDirectory.get(row.Ward);
    assert(emailContact !== undefined, `No recipient email exists for ${row.Ward}.`);
    return `  (${[
      sqlText(stableUuid('v1-ward-issue-contact', `${row.Ward}:${code}`)),
      sqlText(row.Ward),
      sqlText(code),
      sqlText(emailContact.email),
      sqlText(row['Primary Ward Control Room']),
      sqlNullableText(row['Secondary Issue/Regional Contact']),
      sqlText(row['BMC Central Fallback']),
      sqlText(row['Official WhatsApp']),
      sqlText(row['Recommended Durable Role']),
      sqlText(row['Usage Note']),
      `${sqlText(row['Source As Of'])}::date`,
      `${sqlText(row['Last Checked'])}::date`,
      sqlText(row['Ward Source URL']),
      sqlText(row['Issue-Control Source URL']),
      sqlText(emailContact.sourceUrl),
      `${sqlText(emailContact.sourceAsOf)}::date`,
      `${sqlText(emailContact.lastCheckedOn)}::date`,
      sqlText(emailContact.locator),
      sqlText(emailContact.sourceReportedStatus),
      'true',
    ].join(', ')})`;
  });

  return `-- Generated by scripts/generate-bmc-v1-ward-contacts.mjs. Do not edit manually.
-- Immutable issue-contact input: resources/Mumbai_BMC_Ward_Issue_Contacts_CSV.zip
-- Issue-contact input SHA-256: ${issueContactSourceSha256}
-- Immutable ward-email input: resources/local_wellness_bmc_ward_directory_2026-07-20.zip
-- Ward-email input SHA-256: ${emailDirectorySourceSha256}
-- Owner-approved staging configuration: 26 BMC wards x 12 complaint categories.

begin;

do $v1_bmc_contact_prerequisites$
begin
  if to_regclass('routing.ward_issue_contacts') is null then
    raise exception using errcode = '42P01', message = 'V1_WARD_ISSUE_CONTACTS_MIGRATION_REQUIRED';
  end if;

  if not exists (
    select 1 from governance.local_bodies where id = '${bmcLocalBodyId}'
  ) or not exists (
    select 1 from governance.authorities where id = '${bmcAuthorityId}'
  ) then
    raise exception using errcode = '55000', message = 'BMC_GOVERNANCE_SEED_REQUIRED';
  end if;

  if (
    select count(*)
    from governance.wards
    where local_body_id = '${bmcLocalBodyId}'
      and ward_number = any(array[${wards.map((ward) => sqlText(ward)).join(', ')}]::text[])
  ) <> 26 then
    raise exception using errcode = '55000', message = 'BMC_OPERATIONAL_WARD_COUNT_INVALID';
  end if;

  if (
    select count(*) from routing.issue_categories where code = any(array[${categoryCodes}]::text[])
  ) <> 12 then
    raise exception using errcode = '55000', message = 'V1_COMPLAINT_CATEGORY_COUNT_INVALID';
  end if;

  if not exists (
    select 1 from governance.departments where id = '${bmcCentralDepartmentId}'
  ) or not exists (
    select 1 from governance.officer_roles where id = '${bmcCentralOfficerRoleId}'
  ) or not exists (
    select 1 from governance.offices where id = '${bmcCentralOfficeId}'
  ) or not exists (
    select 1 from routing.confidence_policy_versions where id = '${bmcConfidencePolicyVersionId}'
  ) then
    raise exception using errcode = '55000', message = 'BMC_V1_ROUTE_TARGET_PREREQUISITE_MISSING';
  end if;
end;
$v1_bmc_contact_prerequisites$;

update routing.issue_categories
set
  requires_asset = false,
  required_attributes = '{}'::text[],
  status = 'active',
  verification_status = 'verified',
  verification_notes = 'Owner-approved V1 staging category. Routing is ward-based and remains data-driven.',
  is_placeholder = false,
  is_routing_eligible = true,
  last_verified_on = '2026-07-20'::date,
  reference_source_id = (
    select id from governance.reference_sources where url = ${sqlText(bmcConnectUrl)}
  ),
  updated_at = now()
where code = any(array[${categoryCodes}]::text[]);

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
values
${rules
  .map(
    (rule) =>
      `  (${sqlText(rule.ruleId)}, (select id from routing.issue_categories where code = ${sqlText(rule.code)}), ${sqlText(rule.ruleCode)}, ${sqlText(`V1 BMC ward route — ${rule.issue}`)}, 'active', 'verified', 'Owner-approved V1 staging route used by the ward-routing facade.', false, true, '2026-07-20'::date, (select id from governance.reference_sources where url = ${sqlText(bmcConnectUrl)}))`,
  )
  .join(',\n')}
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
values
${rules
  .map(
    (rule) =>
      `  (${sqlText(rule.versionId)}, (select id from routing.route_rules where rule_code = ${sqlText(rule.ruleCode)}), 1, '${bmcAuthorityId}', '${bmcLocalBodyId}', null, '${bmcAuthorityId}', '${bmcCentralDepartmentId}', '${bmcCentralOfficerRoleId}', '${bmcCentralOfficeId}', '${bmcConfidencePolicyVersionId}', 'none', false, 100, 0, '{}'::uuid[], array['jurisdiction', 'category', 'department', 'role']::text[], 'v1_ward_contact_route', 'Resolve the complaint location to an operational ward, then use routing.ward_issue_contacts for recipient delivery.', 'active', 'verified', 'Owner-approved V1 staging route used by the ward-routing facade.', false, true, '2026-07-20T00:00:00Z'::timestamptz, '2026-07-20'::date, (select id from governance.reference_sources where url = ${sqlText(bmcConnectUrl)}))`,
  )
  .join(',\n')}
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

with source_rows (
  id,
  ward_number,
  category_code,
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
  email_owner_approved_for_routing
) as (
values
${contactValues.join(',\n')}
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
  source.id::uuid,
  ward.id,
  category.id,
  source.recipient_email,
  source.primary_contact,
  source.secondary_contact,
  source.central_fallback,
  source.whatsapp_contact,
  source.durable_role,
  source.usage_note,
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
from source_rows as source
inner join governance.wards as ward
  on ward.local_body_id = '${bmcLocalBodyId}'
 and ward.ward_number = source.ward_number
inner join routing.issue_categories as category on category.code = source.category_code
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

alter table routing.ward_issue_contacts
  validate constraint ward_issue_contacts_active_email_provenance_check;

do $v1_bmc_contact_verification$
begin
  if (
    select count(*)
    from routing.ward_issue_contacts as contact
    inner join governance.wards as ward on ward.id = contact.ward_id
    where ward.local_body_id = '${bmcLocalBodyId}'
      and contact.is_active
  ) <> 312 then
    raise exception using errcode = '55000', message = 'BMC_V1_WARD_CONTACT_COUNT_INVALID';
  end if;

  if (
    select count(distinct contact.recipient_email)
    from routing.ward_issue_contacts as contact
    inner join governance.wards as ward on ward.id = contact.ward_id
    where ward.local_body_id = '${bmcLocalBodyId}'
      and contact.is_active
      and contact.email_owner_approved_for_routing
      and contact.email_source_url is not null
      and contact.email_source_locator is not null
  ) <> 26 then
    raise exception using errcode = '55000', message = 'BMC_V1_WARD_EMAIL_COVERAGE_INVALID';
  end if;

  if (
    select count(*)
    from routing.route_rules as rule
    inner join routing.route_rule_versions as version on version.route_rule_id = rule.id
    where rule.rule_code = any(array[${ruleCodes}]::text[])
      and rule.status = 'active'
      and version.version = 1
      and version.status = 'active'
  ) <> 12 then
    raise exception using errcode = '55000', message = 'BMC_V1_ROUTE_RULE_COUNT_INVALID';
  end if;
end;
$v1_bmc_contact_verification$;

commit;
`;
};

const main = async () => {
  const [issueContactArchive, emailDirectoryArchive] = await Promise.all([
    readFile(issueContactSourcePath),
    readFile(emailDirectorySourcePath),
  ]);
  const issueContactEntries = readZipEntries(issueContactArchive, 2_000_000);
  assert(
    issueContactEntries.size === expectedIssueContactMembers.length,
    'Issue-contact archive contains unexpected members.',
  );
  assert(
    expectedIssueContactMembers.every((fileName) => issueContactEntries.has(fileName)),
    'Issue-contact archive is missing a required CSV.',
  );

  const parsed = Object.fromEntries(
    expectedIssueContactMembers.map((fileName) => {
      const table = parseCsv(issueContactEntries.get(fileName), fileName);
      assertHeaders(fileName, table.headers);
      return [fileName, table.rows];
    }),
  );

  const emailDirectoryEntries = readZipEntries(emailDirectoryArchive, 4_000_000);
  assert(
    emailDirectoryEntries.size === expectedEmailDirectoryMembers.length,
    'Email-directory archive contains unexpected members.',
  );
  assert(
    expectedEmailDirectoryMembers.every((fileName) => emailDirectoryEntries.has(fileName)),
    'Email-directory archive is missing a required member.',
  );
  verifyEmailDirectoryManifest(emailDirectoryEntries);
  const emailOfficeTable = parseCsv(
    emailDirectoryEntries.get(emailOfficeMember),
    emailOfficeMember,
  );
  assertHeaders(emailOfficeMember, emailOfficeTable.headers);
  const emailOperationalScopeTable = parseCsv(
    emailDirectoryEntries.get(emailOperationalScopeMember),
    emailOperationalScopeMember,
  );
  assertHeaders(emailOperationalScopeMember, emailOperationalScopeTable.headers);
  const emailDirectory = buildEmailDirectory({
    offices: emailOfficeTable.rows,
    operationalScopes: emailOperationalScopeTable.rows,
  });

  validateSource({
    directory: parsed['ward_directory.csv'],
    matrix: parsed['ward_issue_matrix.csv'],
    longForm: parsed['ward_issue_long_form.csv'],
    emailDirectory,
  });

  const issueContactSourceSha256 = createHash('sha256').update(issueContactArchive).digest('hex');
  const emailDirectorySourceSha256 = createHash('sha256')
    .update(emailDirectoryArchive)
    .digest('hex');
  const output = renderSeed(
    parsed['ward_issue_long_form.csv'],
    issueContactSourceSha256,
    emailDirectorySourceSha256,
    emailDirectory,
  );
  if (process.argv.includes('--check')) {
    const existing = await readFile(outputPath, 'utf8');
    assert(existing === output, 'Generated BMC V1 ward-contact seed is stale.');
  } else {
    await writeFile(outputPath, output, 'utf8');
  }

  process.stdout.write(
    `${process.argv.includes('--check') ? 'Checked' : 'Generated'} 26 ward emails, 12 categories, and 312 BMC ward-contact routes.\n`,
  );
};

await main();
