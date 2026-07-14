export const governanceDatasetIds = [
  'complaint_routing',
  'current_officers',
  'departments',
  'districts',
  'emergency_contacts',
  'gram_panchayats',
  'municipal_corporations',
  'municipal_councils',
  'nagar_panchayats',
  'officer_roles',
  'offices',
  'readme',
  'reference_links',
  'state_overview',
  'talukas',
  'utilities',
  'villages',
  'wards',
] as const;

export type GovernanceDatasetId = (typeof governanceDatasetIds)[number];

export const governanceDatasetDispositions = [
  'metadata',
  'operational',
  'operational_placeholder',
  'operational_reference',
  'raw_only',
  'template_only',
] as const;

export type GovernanceDatasetDisposition = (typeof governanceDatasetDispositions)[number];

export const governanceDiagnosticSeverities = ['error', 'warning'] as const;
export type GovernanceDiagnosticSeverity = (typeof governanceDiagnosticSeverities)[number];

export const governanceDiagnosticCodes = [
  'CSV_PARSE',
  'DATASET_COVERAGE',
  'DUPLICATE_KEY',
  'HASH_MISMATCH',
  'HEADER_MISMATCH',
  'INVALID_DATE',
  'INVALID_URL',
  'MISSING_PARENT',
  'PLACEHOLDER_VALUE',
  'RECORD_COUNT_MISMATCH',
  'REQUIRED_MISSING',
  'ROW_WIDTH',
  'TITLE_MISMATCH',
  'UNRESOLVED_REFERENCE',
  'UNVERIFIED_VALUE',
  'WORKBOOK_MISSING',
] as const;

export type GovernanceDiagnosticCode = (typeof governanceDiagnosticCodes)[number];

export interface GovernanceManifestDataset {
  id: GovernanceDatasetId;
  path: string;
  sha256: string;
  title: string;
  headers: string[];
  expectedRecordCount: number;
  naturalKey: string[];
  disposition: GovernanceDatasetDisposition;
}

export interface GovernanceImportManifest {
  schemaVersion: 1;
  datasetVersion: string;
  generatedOn: string;
  workbook: {
    path: string;
    sha256: string;
    role: 'human_reference';
  };
  expectedRawRecordCount: number;
  expectedMetadataRecordCount: number;
  aliases: {
    localBodies: Record<string, string>;
  };
  multiDistrictLocalBodies: Record<string, string[]>;
  datasets: GovernanceManifestDataset[];
}

export interface GovernanceDiagnostic {
  severity: GovernanceDiagnosticSeverity;
  code: GovernanceDiagnosticCode;
  message: string;
  path: string;
  datasetId?: GovernanceDatasetId;
  row?: number;
  field?: string;
}

export interface GovernanceSourceRecord {
  id: string;
  datasetId: GovernanceDatasetId;
  disposition: GovernanceDatasetDisposition;
  sourcePath: string;
  sourceSha256: string;
  sourceRowNumber: number;
  recordSha256: string;
  values: Record<string, string>;
}

export interface GovernanceMetadataRecord {
  id: string;
  sourcePath: string;
  sourceSha256: string;
  sourceRowNumber: number;
  key: string;
  value: string;
}

export interface GovernanceParsedDataset {
  manifest: GovernanceManifestDataset;
  records: GovernanceSourceRecord[];
  metadata: GovernanceMetadataRecord[];
}

export interface GovernanceSourceFileReport {
  id: GovernanceDatasetId | 'workbook';
  path: string;
  sha256: string;
  recordCount: number;
  disposition: GovernanceDatasetDisposition | 'human_reference';
}

export interface GovernanceRecordClassificationCounts {
  sourceRecords: number;
  accepted: number;
  unverified: number;
  quarantined: number;
  rejected: number;
  reconciled: boolean;
}

export interface GovernanceFileRecordClassification extends GovernanceRecordClassificationCounts {
  id: GovernanceDatasetId | 'workbook';
  path: string;
}

export interface GovernanceValidationReport {
  schemaVersion: 2;
  datasetVersion: string;
  manifestPath: string;
  manifestSha256: string;
  safeToGenerate: boolean;
  counts: {
    sourceFiles: number;
    rawSourceRecords: number;
    metadataRecords: number;
    operationalRecords: number;
    quarantinedRecords: number;
    errors: number;
    warnings: number;
  };
  sourceFiles: GovernanceSourceFileReport[];
  recordClassification: {
    files: GovernanceFileRecordClassification[];
    totals: GovernanceRecordClassificationCounts;
  };
  diagnostics: GovernanceDiagnostic[];
  normalizedRecords: {
    referenceSources: number;
    importRecords: number;
    authorities: number;
    states: number;
    districts: number;
    talukas: number;
    localBodies: number;
    localBodyDistricts: number;
    wards: number;
    departments: number;
    offices: number;
    officerRoles: number;
    officers: 0;
    officerAssignments: 0;
    utilities: number;
    emergencyContacts: number;
    routingReferences: number;
  };
  generatedSeed: {
    path: string;
    sha256: string;
  } | null;
  databaseGeneratedSeedSha256: {
    value: string | null;
    companionPath: string | null;
    reason: string;
  };
}

export interface GovernanceRecordProvenance {
  rawSourceRecordId: string;
  sourceUrl: string | null;
  referenceSourceId: string | null;
  verificationStatus: string;
  verificationNotes: string | null;
  lastVerified: string | null;
  isVerified: boolean;
  isPlaceholder: boolean;
}

export interface GovernanceAuthorityRecord extends GovernanceRecordProvenance {
  id: string;
  parentAuthorityId: string | null;
  code: string;
  name: string;
  authorityType:
    | 'state'
    | 'state_agency'
    | 'district'
    | 'local_body'
    | 'utility'
    | 'emergency_service'
    | 'other';
  status: string;
  isRoutable: false;
}

export interface GovernanceStateRecord extends GovernanceRecordProvenance {
  id: string;
  authorityId: string;
  name: string;
  code: string;
  capital: string;
  status: string;
}

export interface GovernanceDistrictRecord extends GovernanceRecordProvenance {
  id: string;
  authorityId: string;
  stateId: string;
  name: string;
  code: null;
  revenueDivision: string;
  status: string;
}

export interface GovernanceTalukaRecord extends GovernanceRecordProvenance {
  id: string;
  districtId: string;
  name: string;
  code: string | null;
  revenueDivision: string;
  status: string;
}

export type GovernanceLocalBodyKind =
  'municipal_corporation' | 'municipal_council' | 'nagar_panchayat';

export interface GovernanceLocalBodyRecord extends GovernanceRecordProvenance {
  id: string;
  authorityId: string;
  stateId: string;
  kind: GovernanceLocalBodyKind;
  name: string;
  code: null;
  revenueDivision: string;
  administrativeHeadRole: string;
  officialPhone: string | null;
  officialEmail: string | null;
  officialWebsite: string | null;
  status: string;
}

export interface GovernanceLocalBodyDistrictRecord {
  localBodyId: string;
  districtId: string;
  rawSourceRecordId: string;
  referenceSourceId: string | null;
  isPrimary: boolean;
}

export interface GovernanceWardRecord extends GovernanceRecordProvenance {
  id: string;
  localBodyId: string;
  sourceWardId: string;
  name: string;
  number: string;
  zone: string | null;
  administrativeHeadRole: string;
  officePhone: string | null;
  officeEmail: string | null;
  boundaryStatus: string;
  status: string;
  version: 1;
  isRoutable: false;
}

export interface GovernanceDepartmentRecord extends GovernanceRecordProvenance {
  id: string;
  code: string;
  name: string;
  applicableBodyTypes: string[];
  complaintTypes: string[];
  coverage: string;
  requiredData: string[];
  priority: string;
}

export interface GovernanceOfficeRecord extends GovernanceRecordProvenance {
  id: string;
  authorityId: string;
  districtId: string | null;
  name: string;
  officeType: string;
  level: string;
  jurisdiction: string;
  address: string | null;
  officialPhone: string | null;
  officialEmail: string | null;
  coverage: string;
  status: string;
}

export interface GovernanceOfficerRoleRecord extends GovernanceRecordProvenance {
  id: string;
  code: string;
  name: string;
  responsibility: string;
  managedUnits: string;
  reportsTo: string;
  reportsToRoleId: null;
  coverage: string;
}

export interface GovernanceUtilityRecord extends GovernanceRecordProvenance {
  id: string;
  authorityId: string;
  name: string;
  function: string;
  jurisdiction: string;
  complaintTypes: string[];
  reportingChannel: string;
  localOffice: string;
  escalationRole: string;
  escalationRoleId: null;
  routingNotes: string;
  isRoutable: false;
}

export interface GovernanceEmergencyContactRecord extends GovernanceRecordProvenance {
  id: string;
  authorityId: null;
  stateId: string;
  districtId: null;
  localBodyId: null;
  service: string;
  issueType: string;
  jurisdiction: string;
  contact: string | null;
  contactType: 'helpline';
  availability: string;
  action: string;
  isRoutable: false;
}

export interface GovernanceRoutingReferenceRecord extends GovernanceRecordProvenance {
  id: string;
  ruleCode: string;
  issue: string;
  primaryAgency: string;
  firstRecipientRole: string;
  escalationOne: string;
  escalationTwo: string;
  ownershipCondition: string;
  priority: string;
  isEmergency: boolean;
  routingLogic: string;
  status: string;
  notes: string;
  version: 1;
  resolutionStatus: 'unresolved';
  isRoutable: false;
}

export interface GovernanceReferenceLinkRecord extends GovernanceRecordProvenance {
  id: string;
  name: string;
  purpose: string;
  url: string;
  sourceType: string;
  usedIn: string;
}

export interface GovernanceBaselineModel {
  datasetVersion: string;
  sourceDate: string;
  manifestSha256: string;
  workbookPath: string;
  workbookSha256: string;
  rawSourceRecords: GovernanceSourceRecord[];
  metadataRecords: GovernanceMetadataRecord[];
  authorities: GovernanceAuthorityRecord[];
  states: GovernanceStateRecord[];
  districts: GovernanceDistrictRecord[];
  talukas: GovernanceTalukaRecord[];
  localBodies: GovernanceLocalBodyRecord[];
  localBodyDistricts: GovernanceLocalBodyDistrictRecord[];
  wards: GovernanceWardRecord[];
  departments: GovernanceDepartmentRecord[];
  offices: GovernanceOfficeRecord[];
  officerRoles: GovernanceOfficerRoleRecord[];
  utilities: GovernanceUtilityRecord[];
  emergencyContacts: GovernanceEmergencyContactRecord[];
  routingReferences: GovernanceRoutingReferenceRecord[];
  referenceLinks: GovernanceReferenceLinkRecord[];
  normalizationTargets: GovernanceNormalizationTarget[];
}

export type GovernanceNormalizationDisposition =
  'normalized' | 'placeholder_preserved' | 'reference_only' | 'rejected';

export interface GovernanceNormalizationTarget {
  importRecordId: string;
  disposition: GovernanceNormalizationDisposition;
  table: string | null;
  recordId: string | null;
}
