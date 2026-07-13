import type {
  GovernanceAuthorityRecord,
  GovernanceBaselineModel,
  GovernanceDatasetId,
  GovernanceDepartmentRecord,
  GovernanceEmergencyContactRecord,
  GovernanceLocalBodyKind,
  GovernanceLocalBodyRecord,
  GovernanceNormalizationDisposition,
  GovernanceNormalizationTarget,
  GovernanceParsedDataset,
  GovernanceRecordProvenance,
  GovernanceReferenceLinkRecord,
  GovernanceSourceRecord,
} from '@local-wellness/types';
import {
  governanceSlug,
  isGovernancePlaceholder,
  isGovernancePlaceholderCode,
  isGovernancePlaceholderContact,
  normalizeGovernanceKey,
  normalizeGovernanceText,
  normalizeOptionalGovernanceText,
} from '@local-wellness/validation';

import type { LoadedGovernanceManifest } from './load-source.js';
import { sha256Hex, stableGovernanceUuid } from './stable-id.js';
import type { ValidatedGovernanceSources } from './validate-source.js';

const sourceUrlFields = ['Source URL', 'Official Source', 'URL'] as const;

const datasetById = (
  datasets: readonly GovernanceParsedDataset[],
  id: GovernanceDatasetId,
): GovernanceParsedDataset => {
  const dataset = datasets.find(({ manifest }) => manifest.id === id);
  if (dataset === undefined) {
    throw new Error(`Required governance dataset ${id} is unavailable.`);
  }
  return dataset;
};

const value = (record: GovernanceSourceRecord, field: string): string =>
  normalizeGovernanceText(record.values[field] ?? '');

const sourceUrl = (record: GovernanceSourceRecord): string | null => {
  for (const field of sourceUrlFields) {
    const candidate = value(record, field);
    if (candidate.startsWith('https://')) {
      return candidate;
    }
  }
  return null;
};

const recordDate = (record: GovernanceSourceRecord): string | null =>
  value(record, 'Last Verified') || value(record, 'Last Checked') || null;

const status = (record: GovernanceSourceRecord): string =>
  normalizeGovernanceKey(record.values['Status'] ?? 'active') || 'active';

const verification = (
  record: GovernanceSourceRecord,
  options: { placeholder?: boolean; defaultStatus?: string } = {},
): Pick<
  GovernanceRecordProvenance,
  'isPlaceholder' | 'isVerified' | 'verificationNotes' | 'verificationStatus'
> => {
  const rawStatus = value(record, 'Verification Status');
  const normalized = normalizeGovernanceKey(rawStatus);
  const placeholder = options.placeholder ?? false;

  if (placeholder) {
    return {
      verificationStatus: 'placeholder',
      verificationNotes: rawStatus || 'Canonical source marks this record as a placeholder.',
      isVerified: false,
      isPlaceholder: true,
    };
  }
  if (normalized === 'verified' || normalized === 'official') {
    return {
      verificationStatus: 'verified',
      verificationNotes: rawStatus || null,
      isVerified: true,
      isPlaceholder: false,
    };
  }
  if (normalized.includes('partially verified') || normalized.includes('official list')) {
    return {
      verificationStatus: 'partially_verified',
      verificationNotes: rawStatus,
      isVerified: false,
      isPlaceholder: false,
    };
  }
  if (normalized.includes('needs contact extraction')) {
    return {
      verificationStatus: 'partially_verified',
      verificationNotes: rawStatus,
      isVerified: false,
      isPlaceholder: false,
    };
  }

  const defaultStatus = options.defaultStatus ?? 'unverified';
  return {
    verificationStatus: defaultStatus,
    verificationNotes: rawStatus || 'No complete record-level verification status is present.',
    isVerified: defaultStatus === 'verified',
    isPlaceholder: false,
  };
};

const databaseCode = (prefix: string, name: string): string => {
  const candidate = `${prefix}-${governanceSlug(name).replaceAll('-', '_').toUpperCase()}`;
  if (candidate.length <= 80) {
    return candidate;
  }
  return `${candidate.slice(0, 70)}-${sha256Hex(candidate).slice(0, 9).toUpperCase()}`;
};

const normalizedCode = (name: string): string => {
  const candidate = governanceSlug(name).replaceAll('-', '_');
  if (candidate.length <= 80) {
    return candidate;
  }
  return `${candidate.slice(0, 70)}_${sha256Hex(candidate).slice(0, 9)}`;
};

const list = (source: string, separator: RegExp = /\s*,\s*/u): string[] =>
  normalizeGovernanceText(source)
    .split(separator)
    .map(normalizeGovernanceText)
    .filter((item) => item.length > 0);

const createReferenceSources = (
  records: readonly GovernanceSourceRecord[],
  referenceRecords: readonly GovernanceSourceRecord[],
): GovernanceReferenceLinkRecord[] => {
  const references = new Map<string, GovernanceReferenceLinkRecord>();

  for (const record of referenceRecords) {
    const url = value(record, 'URL');
    references.set(url, {
      id: stableGovernanceUuid('reference-source', normalizeGovernanceKey(url)),
      name: value(record, 'Reference'),
      purpose: value(record, 'Purpose'),
      url,
      sourceType: normalizeGovernanceKey(value(record, 'Source Type')) || 'official',
      usedIn: value(record, 'Used In'),
      rawSourceRecordId: record.id,
      sourceUrl: url,
      referenceSourceId: null,
      verificationStatus: 'verified',
      verificationNotes: 'Catalogued by Reference_Links.csv.',
      lastVerified: recordDate(record),
      isVerified: true,
      isPlaceholder: false,
    });
  }

  for (const record of records) {
    const url = sourceUrl(record);
    if (url === null || references.has(url)) {
      continue;
    }
    const datasetName = record.datasetId.replaceAll('_', ' ');
    references.set(url, {
      id: stableGovernanceUuid('reference-source', normalizeGovernanceKey(url)),
      name: `Canonical source for ${datasetName}: ${new URL(url).hostname}`,
      purpose: `Referenced by ${record.sourcePath} row ${record.sourceRowNumber}.`,
      url,
      sourceType: 'official',
      usedIn: datasetName,
      rawSourceRecordId: record.id,
      sourceUrl: url,
      referenceSourceId: null,
      verificationStatus: 'partially_verified',
      verificationNotes: 'Derived from a canonical row because Reference_Links.csv omits this URL.',
      lastVerified: recordDate(record),
      isVerified: false,
      isPlaceholder: false,
    });
  }

  return [...references.values()].sort((left, right) => left.url.localeCompare(right.url, 'en'));
};

const provenance = (
  record: GovernanceSourceRecord,
  referenceIds: ReadonlyMap<string, string>,
  options: { placeholder?: boolean; defaultStatus?: string } = {},
): GovernanceRecordProvenance => {
  const url = sourceUrl(record);
  return {
    rawSourceRecordId: record.id,
    sourceUrl: url,
    referenceSourceId: url === null ? null : (referenceIds.get(url) ?? null),
    lastVerified: recordDate(record),
    ...verification(record, options),
  };
};

const target = (
  importRecordId: string,
  disposition: GovernanceNormalizationDisposition,
  table: string | null,
  recordId: string | null,
): GovernanceNormalizationTarget => ({ importRecordId, disposition, table, recordId });

export const buildGovernanceBaselineModel = (
  loaded: LoadedGovernanceManifest,
  validated: ValidatedGovernanceSources,
): GovernanceBaselineModel => {
  if (validated.diagnostics.some(({ severity }) => severity === 'error')) {
    throw new Error('Governance seed generation is blocked by validation errors.');
  }

  const rawSourceRecords = validated.datasets
    .flatMap(({ records }) => records)
    .sort((left, right) =>
      `${left.sourcePath}:${String(left.sourceRowNumber).padStart(8, '0')}`.localeCompare(
        `${right.sourcePath}:${String(right.sourceRowNumber).padStart(8, '0')}`,
        'en',
      ),
    );
  const metadataRecords = validated.datasets
    .flatMap(({ metadata }) => metadata)
    .sort((left, right) => left.sourceRowNumber - right.sourceRowNumber);
  const referenceDataset = datasetById(validated.datasets, 'reference_links');
  const referenceLinks = createReferenceSources(rawSourceRecords, referenceDataset.records);
  const referenceIds = new Map(referenceLinks.map((reference) => [reference.url, reference.id]));
  const normalizationTargets: GovernanceNormalizationTarget[] = [];

  const stateRecord = datasetById(validated.datasets, 'state_overview').records[0];
  if (stateRecord === undefined) {
    throw new Error('State overview must contain exactly one record.');
  }
  const stateId = stableGovernanceUuid(
    'state',
    normalizeGovernanceKey(value(stateRecord, 'ISO/Code')),
  );
  const stateAuthorityId = stableGovernanceUuid('authority', 'state:mh');
  const stateProvenance = provenance(stateRecord, referenceIds, { defaultStatus: 'verified' });
  const stateAuthority: GovernanceAuthorityRecord = {
    id: stateAuthorityId,
    parentAuthorityId: null,
    code: 'MH-STATE',
    name: value(stateRecord, 'State'),
    authorityType: 'state',
    status: status(stateRecord),
    isRoutable: false,
    ...stateProvenance,
  };
  const states = [
    {
      id: stateId,
      authorityId: stateAuthorityId,
      name: value(stateRecord, 'State'),
      code: value(stateRecord, 'ISO/Code'),
      capital: value(stateRecord, 'Capital'),
      status: status(stateRecord),
      ...stateProvenance,
    },
  ];
  normalizationTargets.push(target(stateRecord.id, 'normalized', 'governance.states', stateId));

  const authorities: GovernanceAuthorityRecord[] = [stateAuthority];
  const districts = datasetById(validated.datasets, 'districts').records.map((record) => {
    const name = value(record, 'District');
    const id = stableGovernanceUuid('district', normalizeGovernanceKey(name));
    const authorityId = stableGovernanceUuid(
      'authority',
      `district:${normalizeGovernanceKey(name)}`,
    );
    const recordProvenance = provenance(record, referenceIds);
    authorities.push({
      id: authorityId,
      parentAuthorityId: stateAuthorityId,
      code: databaseCode('MH-DISTRICT', name),
      name,
      authorityType: 'district',
      status: status(record),
      isRoutable: false,
      ...recordProvenance,
    });
    normalizationTargets.push(target(record.id, 'normalized', 'governance.districts', id));
    return {
      id,
      authorityId,
      stateId,
      name,
      code: null,
      revenueDivision: value(record, 'Revenue Division'),
      status: status(record),
      ...recordProvenance,
    };
  });
  const districtsByName = new Map(
    districts.map((district) => [normalizeGovernanceKey(district.name), district]),
  );

  const talukas = datasetById(validated.datasets, 'talukas').records.map((record) => {
    const district = districtsByName.get(normalizeGovernanceKey(value(record, 'District')));
    if (district === undefined) {
      throw new Error(`Validated taluka parent is unavailable for row ${record.sourceRowNumber}.`);
    }
    const name = value(record, 'Taluka/Tehsil');
    const id = stableGovernanceUuid(
      'taluka',
      `${normalizeGovernanceKey(district.name)}:${normalizeGovernanceKey(name)}`,
    );
    normalizationTargets.push(target(record.id, 'normalized', 'governance.talukas', id));
    return {
      id,
      districtId: district.id,
      name,
      code: normalizeOptionalGovernanceText(value(record, 'LGD Code'), isGovernancePlaceholderCode),
      revenueDivision: value(record, 'Revenue Division'),
      status: status(record),
      ...provenance(record, referenceIds),
    };
  });

  const localBodyDatasets: Array<{
    datasetId: GovernanceDatasetId;
    kind: GovernanceLocalBodyKind;
    nameField: string;
    phoneField: string;
  }> = [
    {
      datasetId: 'municipal_corporations',
      kind: 'municipal_corporation',
      nameField: 'Corporation',
      phoneField: 'Official Helpline',
    },
    {
      datasetId: 'municipal_councils',
      kind: 'municipal_council',
      nameField: 'Municipal Council',
      phoneField: 'Official Phone',
    },
    {
      datasetId: 'nagar_panchayats',
      kind: 'nagar_panchayat',
      nameField: 'Nagar Panchayat',
      phoneField: 'Official Phone',
    },
  ];
  const localBodies: GovernanceLocalBodyRecord[] = [];
  const localBodyDistricts: GovernanceBaselineModel['localBodyDistricts'] = [];

  for (const descriptor of localBodyDatasets) {
    for (const record of datasetById(validated.datasets, descriptor.datasetId).records) {
      const name = value(record, descriptor.nameField);
      const sourceDistrictKey = value(record, 'District');
      const stableLocalBodyKey =
        descriptor.kind === 'municipal_corporation'
          ? `${descriptor.kind}:${normalizeGovernanceKey(name)}`
          : `${descriptor.kind}:${normalizeGovernanceKey(sourceDistrictKey)}:${normalizeGovernanceKey(name)}`;
      const id = stableGovernanceUuid('local-body', stableLocalBodyKey);
      const authorityId = stableGovernanceUuid('authority', `local-body:${stableLocalBodyKey}`);
      const recordProvenance = provenance(record, referenceIds);
      authorities.push({
        id: authorityId,
        parentAuthorityId: stateAuthorityId,
        code: databaseCode('MH-ULB', `${stableLocalBodyKey}-${name}`),
        name,
        authorityType: 'local_body',
        status: status(record),
        isRoutable: false,
        ...recordProvenance,
      });
      localBodies.push({
        id,
        authorityId,
        stateId,
        kind: descriptor.kind,
        name,
        code: null,
        revenueDivision: value(record, 'Division'),
        administrativeHeadRole: value(record, 'Administrative Head'),
        officialPhone: normalizeOptionalGovernanceText(
          value(record, descriptor.phoneField),
          isGovernancePlaceholderContact,
        ),
        officialEmail: normalizeOptionalGovernanceText(
          value(record, 'Official Email'),
          isGovernancePlaceholderContact,
        ),
        officialWebsite: normalizeOptionalGovernanceText(
          value(record, 'Official Website'),
          isGovernancePlaceholderContact,
        ),
        status: status(record),
        ...recordProvenance,
      });
      const districtNames = loaded.manifest.multiDistrictLocalBodies[name] ?? [
        value(record, 'District'),
      ];
      districtNames.forEach((districtName) => {
        const district = districtsByName.get(normalizeGovernanceKey(districtName));
        if (district === undefined) {
          throw new Error(`Validated local-body district ${districtName} is unavailable.`);
        }
        localBodyDistricts.push({
          localBodyId: id,
          districtId: district.id,
          rawSourceRecordId: record.id,
          referenceSourceId: recordProvenance.referenceSourceId,
          isPrimary: districtNames.length === 1,
        });
      });
      normalizationTargets.push(target(record.id, 'normalized', 'governance.local_bodies', id));
    }
  }

  const localBodiesByName = new Map(
    localBodies.map((localBody) => [normalizeGovernanceKey(localBody.name), localBody]),
  );
  const wards = datasetById(validated.datasets, 'wards').records.map((record) => {
    const sourceName = value(record, 'Local Body');
    const localBodyName = loaded.manifest.aliases.localBodies[sourceName] ?? sourceName;
    const localBody = localBodiesByName.get(normalizeGovernanceKey(localBodyName));
    if (localBody === undefined) {
      throw new Error(`Validated ward local body ${localBodyName} is unavailable.`);
    }
    const sourceWardId = value(record, 'Ward ID');
    const id = stableGovernanceUuid(
      'ward',
      `${normalizeGovernanceKey(localBody.name)}:${normalizeGovernanceKey(sourceWardId)}`,
    );
    normalizationTargets.push(target(record.id, 'placeholder_preserved', 'governance.wards', id));
    return {
      id,
      localBodyId: localBody.id,
      sourceWardId,
      name: value(record, 'Ward Name'),
      number: value(record, 'Ward Number'),
      zone: normalizeOptionalGovernanceText(value(record, 'Zone/Borough'), isGovernancePlaceholder),
      administrativeHeadRole: value(record, 'Administrative Head Role'),
      officePhone: normalizeOptionalGovernanceText(
        value(record, 'Ward Office Phone'),
        isGovernancePlaceholderContact,
      ),
      officeEmail: normalizeOptionalGovernanceText(
        value(record, 'Ward Office Email'),
        isGovernancePlaceholderContact,
      ),
      boundaryStatus: value(record, 'GIS Boundary Status'),
      status: status(record),
      version: 1 as const,
      isRoutable: false as const,
      ...provenance(record, referenceIds, { placeholder: true }),
    };
  });

  const departments: GovernanceDepartmentRecord[] = datasetById(
    validated.datasets,
    'departments',
  ).records.map((record) => {
    const name = value(record, 'Department');
    const id = stableGovernanceUuid('department', normalizeGovernanceKey(name));
    normalizationTargets.push(target(record.id, 'normalized', 'governance.departments', id));
    return {
      id,
      code: normalizedCode(name),
      name,
      applicableBodyTypes: list(value(record, 'Applicable Body'), /\s*\/\s*/u),
      complaintTypes: list(value(record, 'Complaint Types')),
      coverage: value(record, 'Typical Coverage'),
      requiredData: list(value(record, 'Required Data')),
      priority: value(record, 'Priority'),
      ...provenance(record, referenceIds),
    };
  });

  const officerRoles = datasetById(validated.datasets, 'officer_roles').records.map((record) => {
    const name = value(record, 'Officer Role');
    const id = stableGovernanceUuid('officer-role', normalizeGovernanceKey(name));
    normalizationTargets.push(target(record.id, 'normalized', 'governance.officer_roles', id));
    return {
      id,
      code: normalizedCode(name),
      name,
      responsibility: value(record, 'Core Responsibility'),
      managedUnits: value(record, 'People/Units Under Role'),
      reportsTo: value(record, 'Reports To'),
      reportsToRoleId: null,
      coverage: value(record, 'Typical Coverage'),
      ...provenance(record, referenceIds),
    };
  });

  const offices = datasetById(validated.datasets, 'offices').records.map((record) => {
    const name = value(record, 'Office Name');
    const level = value(record, 'Level');
    const jurisdiction = value(record, 'Jurisdiction');
    const district =
      normalizeGovernanceKey(level) === 'district'
        ? (districtsByName.get(normalizeGovernanceKey(jurisdiction)) ?? null)
        : null;
    let authorityId: string;
    if (district !== null) {
      authorityId = district.authorityId;
    } else {
      authorityId = stableGovernanceUuid(
        'authority',
        `state-agency:${normalizeGovernanceKey(name)}`,
      );
      authorities.push({
        id: authorityId,
        parentAuthorityId: stateAuthorityId,
        code: databaseCode('MH-AGENCY', name),
        name,
        authorityType: 'state_agency',
        status: status(record),
        isRoutable: false,
        ...provenance(record, referenceIds),
      });
    }
    const id = stableGovernanceUuid(
      'office',
      `${normalizeGovernanceKey(name)}:${normalizeGovernanceKey(jurisdiction)}`,
    );
    normalizationTargets.push(target(record.id, 'normalized', 'governance.offices', id));
    return {
      id,
      authorityId,
      districtId: district?.id ?? null,
      name,
      officeType: value(record, 'Office Type'),
      level,
      jurisdiction,
      address: normalizeOptionalGovernanceText(value(record, 'Address'), isGovernancePlaceholder),
      officialPhone: normalizeOptionalGovernanceText(
        value(record, 'Official Phone'),
        isGovernancePlaceholderContact,
      ),
      officialEmail:
        normalizeOptionalGovernanceText(
          value(record, 'Official Email'),
          isGovernancePlaceholderContact,
        )?.toLocaleLowerCase('en-US') ?? null,
      coverage: value(record, 'Coverage'),
      status: status(record),
      ...provenance(record, referenceIds),
    };
  });

  const utilities = datasetById(validated.datasets, 'utilities').records.map((record) => {
    const name = value(record, 'Utility/Agency');
    const id = stableGovernanceUuid('utility', normalizeGovernanceKey(name));
    const authorityId = stableGovernanceUuid(
      'authority',
      `utility:${normalizeGovernanceKey(name)}`,
    );
    const recordProvenance = provenance(record, referenceIds, {
      defaultStatus: 'partially_verified',
    });
    authorities.push({
      id: authorityId,
      parentAuthorityId: stateAuthorityId,
      code: databaseCode('MH-UTILITY', name),
      name,
      authorityType: 'utility',
      status: 'active',
      isRoutable: false,
      ...recordProvenance,
    });
    normalizationTargets.push(target(record.id, 'normalized', 'governance.utilities', id));
    return {
      id,
      authorityId,
      name,
      function: value(record, 'Function'),
      jurisdiction: value(record, 'Jurisdiction'),
      complaintTypes: list(value(record, 'Complaint Types')),
      reportingChannel: value(record, 'Where to Report'),
      localOffice: value(record, 'Local Office'),
      escalationRole: value(record, 'Escalation Role'),
      escalationRoleId: null,
      routingNotes: value(record, 'Routing Notes'),
      isRoutable: false as const,
      ...recordProvenance,
    };
  });

  const emergencyContacts: GovernanceEmergencyContactRecord[] = [];
  for (const record of datasetById(validated.datasets, 'emergency_contacts').records) {
    const service = value(record, 'Service');
    const issueType = value(record, 'Issue Type');
    const jurisdiction = value(record, 'Jurisdiction');
    const rawContact = value(record, 'Contact');
    const placeholderContact = isGovernancePlaceholderContact(rawContact);
    const normalizedContacts = placeholderContact
      ? [null]
      : rawContact
          .split('/')
          .map(normalizeGovernanceText)
          .filter((contact) => contact.length > 0);
    const firstId = stableGovernanceUuid(
      'emergency-contact',
      `${normalizeGovernanceKey(service)}:${normalizeGovernanceKey(issueType)}:${normalizeGovernanceKey(jurisdiction)}:${normalizeGovernanceKey(normalizedContacts[0] ?? 'placeholder')}`,
    );
    normalizationTargets.push(
      target(
        record.id,
        placeholderContact ? 'placeholder_preserved' : 'normalized',
        'governance.emergency_contacts',
        firstId,
      ),
    );
    normalizedContacts.forEach((contact, index) => {
      const id =
        index === 0
          ? firstId
          : stableGovernanceUuid(
              'emergency-contact',
              `${normalizeGovernanceKey(service)}:${normalizeGovernanceKey(issueType)}:${normalizeGovernanceKey(jurisdiction)}:${normalizeGovernanceKey(contact ?? 'placeholder')}`,
            );
      emergencyContacts.push({
        id,
        authorityId: null,
        stateId,
        districtId: null,
        localBodyId: null,
        service,
        issueType,
        jurisdiction,
        contact,
        contactType: 'helpline',
        availability: value(record, 'Availability'),
        action: value(record, 'Action'),
        isRoutable: false,
        ...provenance(record, referenceIds, { placeholder: placeholderContact }),
      });
    });
  }

  const routingReferences = datasetById(validated.datasets, 'complaint_routing').records.map(
    (record) => {
      const ruleCode = value(record, 'Rule ID');
      const id = stableGovernanceUuid('routing-reference', `${normalizeGovernanceKey(ruleCode)}:1`);
      normalizationTargets.push(
        target(record.id, 'reference_only', 'governance.complaint_routing_references', id),
      );
      return {
        id,
        ruleCode,
        issue: value(record, 'Issue'),
        primaryAgency: value(record, 'Primary Department/Agency'),
        firstRecipientRole: value(record, 'First Recipient Role'),
        escalationOne: value(record, 'Escalation 1'),
        escalationTwo: value(record, 'Escalation 2'),
        ownershipCondition: value(record, 'Ownership Condition'),
        priority: value(record, 'Priority/Emergency'),
        isEmergency: normalizeGovernanceKey(value(record, 'Priority/Emergency')).includes(
          'emergency',
        ),
        routingLogic: value(record, 'Routing Logic'),
        status: 'draft',
        notes: value(record, 'Notes'),
        version: 1 as const,
        resolutionStatus: 'unresolved' as const,
        isRoutable: false as const,
        ...provenance(record, referenceIds),
      };
    },
  );

  for (const record of referenceDataset.records) {
    const reference = referenceLinks.find((candidate) => candidate.rawSourceRecordId === record.id);
    if (reference === undefined) {
      throw new Error(`Reference source target is unavailable for row ${record.sourceRowNumber}.`);
    }
    normalizationTargets.push(
      target(record.id, 'normalized', 'governance.reference_sources', reference.id),
    );
  }

  for (const record of rawSourceRecords) {
    if (normalizationTargets.some(({ importRecordId }) => importRecordId === record.id)) {
      continue;
    }
    const disposition: GovernanceNormalizationDisposition =
      record.disposition === 'template_only' ? 'placeholder_preserved' : 'reference_only';
    normalizationTargets.push(target(record.id, disposition, null, null));
  }
  for (const record of metadataRecords) {
    normalizationTargets.push(target(record.id, 'reference_only', null, null));
  }

  return {
    datasetVersion: loaded.manifest.datasetVersion,
    sourceDate: loaded.manifest.generatedOn,
    manifestSha256: loaded.manifestSha256,
    workbookPath: loaded.manifest.workbook.path,
    workbookSha256: loaded.manifest.workbook.sha256,
    rawSourceRecords,
    metadataRecords,
    authorities: authorities.sort((left, right) => left.code.localeCompare(right.code, 'en')),
    states,
    districts: districts.sort((left, right) => left.name.localeCompare(right.name, 'en')),
    talukas: talukas.sort((left, right) =>
      `${left.districtId}:${left.name}`.localeCompare(`${right.districtId}:${right.name}`, 'en'),
    ),
    localBodies: localBodies.sort((left, right) =>
      `${left.kind}:${left.name}:${left.id}`.localeCompare(
        `${right.kind}:${right.name}:${right.id}`,
        'en',
      ),
    ),
    localBodyDistricts: localBodyDistricts.sort((left, right) =>
      `${left.localBodyId}:${left.districtId}`.localeCompare(
        `${right.localBodyId}:${right.districtId}`,
        'en',
      ),
    ),
    wards: wards.sort((left, right) => left.sourceWardId.localeCompare(right.sourceWardId, 'en')),
    departments: departments.sort((left, right) => left.code.localeCompare(right.code, 'en')),
    offices: offices.sort((left, right) => left.name.localeCompare(right.name, 'en')),
    officerRoles: officerRoles.sort((left, right) => left.code.localeCompare(right.code, 'en')),
    utilities: utilities.sort((left, right) => left.name.localeCompare(right.name, 'en')),
    emergencyContacts: emergencyContacts.sort((left, right) =>
      `${left.service}:${left.issueType}`.localeCompare(
        `${right.service}:${right.issueType}`,
        'en',
      ),
    ),
    routingReferences: routingReferences.sort((left, right) =>
      left.ruleCode.localeCompare(right.ruleCode, 'en'),
    ),
    referenceLinks,
    normalizationTargets: normalizationTargets.sort((left, right) =>
      left.importRecordId.localeCompare(right.importRecordId, 'en'),
    ),
  };
};
