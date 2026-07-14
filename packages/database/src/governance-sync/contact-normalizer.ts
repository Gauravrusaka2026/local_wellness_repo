import type {
  GovernanceContactChannelType,
  GovernanceContactNormalizationRequest,
  GovernanceContactNormalizationResult,
  GovernanceContactNormalizerVerificationStatus,
  GovernanceContactOwnerEntityType,
  GovernanceExtractedContactRecord,
  GovernanceNormalizedContactCandidate,
  GovernanceSyncValidationIssue,
} from './contracts.js';
import { governanceContactChannelTypes, governanceContactOwnerEntityTypes } from './contracts.js';

const placeholderTokens = new Set([
  '-',
  '--',
  'dummy',
  'n/a',
  'na',
  'nil',
  'none',
  'not applicable',
  'not available',
  'not provided',
  'placeholder',
  'tba',
  'tbd',
  'to be announced',
  'to be confirmed',
  'to be extracted',
  'to be updated',
  'unknown',
  'xxx',
]);

const placeholderDomains = new Set([
  'example.com',
  'example.net',
  'example.org',
  'invalid',
  'localhost',
]);

const placeholderPhoneNumbers = new Set(['0000000000', '1111111111', '1234567890', '9999999999']);

const acceptedVerificationClaims = new Set(['placeholder', 'source_verified', 'unverified']);

const issue = (
  code: string,
  severity: GovernanceSyncValidationIssue['severity'],
  message: string,
  field: string | null,
): GovernanceSyncValidationIssue => ({ code, severity, message, field });

const normalizeWhitespace = (value: string): string =>
  value.normalize('NFKC').replace(/\s+/gu, ' ').trim();

const normalizeKey = (value: string): string =>
  normalizeWhitespace(value).toLocaleLowerCase('en-IN');

const normalizeClaim = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = normalizeKey(value).replace(/[\s-]+/gu, '_');
  return normalized.length === 0 ? null : normalized;
};

const isPlaceholderText = (value: string): boolean => placeholderTokens.has(normalizeKey(value));

const isPlaceholderEmailOrUrl = (value: string): boolean => {
  try {
    const hostname = value.includes('@')
      ? value.slice(value.lastIndexOf('@') + 1).toLocaleLowerCase('en-IN')
      : new URL(value).hostname.toLocaleLowerCase('en-IN');
    return (
      placeholderDomains.has(hostname) ||
      hostname.endsWith('.example.com') ||
      hostname.endsWith('.invalid')
    );
  } catch {
    return false;
  }
};

const isPlaceholderPhone = (value: string): boolean => {
  const digits = value.replace(/\D/gu, '');
  return placeholderPhoneNumbers.has(digits) || (/^(\d)\1+$/u.test(digits) && digits.length >= 6);
};

const normalizeEmail = (value: string): string | null => {
  const normalized = normalizeWhitespace(value)
    .replace(/^mailto:/iu, '')
    .toLocaleLowerCase('en-IN');
  if (normalized.length > 320 || normalized.includes('..')) {
    return null;
  }

  const match = /^([^\s@]+)@([^\s@]+)$/u.exec(normalized);
  if (match === null) {
    return null;
  }

  const localPart = match[1];
  const domain = match[2];
  if (
    localPart === undefined ||
    domain === undefined ||
    localPart.length > 64 ||
    localPart.startsWith('.') ||
    localPart.endsWith('.') ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/u.test(localPart)
  ) {
    return null;
  }

  const labels = domain.split('.');
  if (
    labels.length < 2 ||
    labels.some(
      (label) =>
        label.length === 0 ||
        label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(label),
    )
  ) {
    return null;
  }

  return normalized;
};

const normalizeHttpsUrl = (value: string): string | null => {
  const normalized = normalizeWhitespace(value);
  try {
    const url = new URL(normalized);
    if (
      url.protocol !== 'https:' ||
      url.hostname.length === 0 ||
      url.username.length > 0 ||
      url.password.length > 0
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
};

const normalizePhone = (value: string): string | null => {
  const normalized = normalizeWhitespace(value).replace(/^tel:/iu, '');
  if (!/^(?:\+|00)?[0-9().\s-]+$/u.test(normalized)) {
    return null;
  }

  const withInternationalPrefix = /^00[1-9]/u.test(normalized)
    ? `+${normalized.slice(2)}`
    : normalized;
  const compact = withInternationalPrefix.replace(/[().\s-]/gu, '');
  if (!/^\+?[0-9]{3,15}$/u.test(compact)) {
    return null;
  }
  return compact;
};

const normalizeAddress = (value: string): string | null => {
  const normalized = normalizeWhitespace(value).replace(/\s*,\s*/gu, ', ');
  return normalized.length <= 1000 ? normalized : null;
};

const isContactChannelType = (value: string): value is GovernanceContactChannelType =>
  governanceContactChannelTypes.some((type) => type === value);

const isContactOwnerEntityType = (value: string): value is GovernanceContactOwnerEntityType =>
  governanceContactOwnerEntityTypes.some((type) => type === value);

const normalizeContactValue = (
  channelType: GovernanceContactChannelType,
  value: string,
): string | null => {
  switch (channelType) {
    case 'email':
      return normalizeEmail(value);
    case 'phone':
    case 'helpline':
      return normalizePhone(value);
    case 'website':
    case 'contact_directory':
      return normalizeHttpsUrl(value);
    case 'address':
      return normalizeAddress(value);
  }
};

const invalidValueIssue = (
  channelType: GovernanceContactChannelType,
): GovernanceSyncValidationIssue => {
  switch (channelType) {
    case 'email':
      return issue(
        'MALFORMED_EMAIL',
        'error',
        'Expected one syntactically valid email address.',
        'extractedValue',
      );
    case 'phone':
    case 'helpline':
      return issue(
        'MALFORMED_PHONE',
        'error',
        'Expected one phone number containing between 3 and 15 digits.',
        'extractedValue',
      );
    case 'website':
    case 'contact_directory':
      return issue(
        'MALFORMED_HTTPS_URL',
        'error',
        'Expected an HTTPS URL without embedded credentials.',
        'extractedValue',
      );
    case 'address':
      return issue(
        'MALFORMED_ADDRESS',
        'error',
        'Expected an address no longer than 1,000 characters.',
        'extractedValue',
      );
  }
};

const containsPlaceholderValue = (
  channelType: GovernanceContactChannelType | null,
  value: string,
): boolean => {
  if (isPlaceholderText(value)) {
    return true;
  }
  if (channelType === 'email' || channelType === 'website' || channelType === 'contact_directory') {
    return isPlaceholderEmailOrUrl(value);
  }
  if (channelType === 'phone' || channelType === 'helpline') {
    return isPlaceholderPhone(value);
  }
  return false;
};

const cleanRequiredText = (
  value: unknown,
  field: string,
  issues: GovernanceSyncValidationIssue[],
): string | null => {
  if (typeof value !== 'string') {
    issues.push(issue('MALFORMED_FIELD_TYPE', 'error', 'Expected a string value.', field));
    return null;
  }

  const normalized = normalizeWhitespace(value);
  if (normalized.length === 0) {
    issues.push(issue('REQUIRED_FIELD_MISSING', 'error', 'A required value is missing.', field));
    return null;
  }
  return normalized;
};

const normalizeRecord = (
  record: GovernanceExtractedContactRecord,
  request: GovernanceContactNormalizationRequest,
  sourceHosts: ReadonlySet<string>,
): GovernanceNormalizedContactCandidate => {
  const validationIssues: GovernanceSyncValidationIssue[] = [];
  const ownerTypeText = cleanRequiredText(
    record.ownerEntityType,
    'ownerEntityType',
    validationIssues,
  );
  const ownerEntityType =
    ownerTypeText !== null && isContactOwnerEntityType(ownerTypeText) ? ownerTypeText : null;
  if (ownerTypeText !== null && ownerEntityType === null) {
    validationIssues.push(
      issue(
        'UNKNOWN_OWNER_ENTITY_TYPE',
        'error',
        'The contact owner type is not supported.',
        'ownerEntityType',
      ),
    );
  }

  const ownerSourceEntityKey = cleanRequiredText(
    record.ownerSourceEntityKey,
    'ownerSourceEntityKey',
    validationIssues,
  );
  const channelTypeText = cleanRequiredText(record.channelType, 'channelType', validationIssues);
  const channelType =
    channelTypeText !== null && isContactChannelType(channelTypeText) ? channelTypeText : null;
  if (channelTypeText !== null && channelType === null) {
    validationIssues.push(
      issue(
        'UNKNOWN_CONTACT_CHANNEL_TYPE',
        'error',
        'The contact channel type is not supported.',
        'channelType',
      ),
    );
  }

  const purpose =
    typeof record.purpose === 'string' && normalizeWhitespace(record.purpose).length > 0
      ? normalizeWhitespace(record.purpose)
      : null;
  if (record.purpose !== null && typeof record.purpose !== 'string') {
    validationIssues.push(
      issue('MALFORMED_FIELD_TYPE', 'error', 'Expected a string or null.', 'purpose'),
    );
  }

  const sourceRecordLocator = cleanRequiredText(
    record.sourceRecordLocator,
    'sourceRecordLocator',
    validationIssues,
  );
  const extractedValue =
    typeof record.extractedValue === 'string'
      ? record.extractedValue.normalize('NFKC').trim()
      : null;
  if (typeof record.extractedValue !== 'string') {
    validationIssues.push(
      issue(
        'MALFORMED_CONTACT_VALUE_TYPE',
        'error',
        'Expected the contact value to be a string.',
        'extractedValue',
      ),
    );
  } else if (extractedValue === '') {
    validationIssues.push(
      issue(
        'CONTACT_VALUE_MISSING',
        'error',
        'The extracted contact value is empty.',
        'extractedValue',
      ),
    );
  }

  const claimedVerificationStatus = normalizeClaim(record.claimedVerificationStatus);
  if (
    claimedVerificationStatus !== null &&
    !acceptedVerificationClaims.has(claimedVerificationStatus)
  ) {
    validationIssues.push(
      issue(
        claimedVerificationStatus === 'manually_verified'
          ? 'MANUAL_VERIFICATION_CLAIM_DOWNGRADED'
          : 'UNRECOGNIZED_VERIFICATION_CLAIM',
        'warning',
        'Parser claims cannot manually verify or publish contact data; the claim was downgraded.',
        'claimedVerificationStatus',
      ),
    );
  }

  const claimedPlaceholder = claimedVerificationStatus === 'placeholder';
  const valuePlaceholder =
    extractedValue !== null && extractedValue.length > 0
      ? containsPlaceholderValue(channelType, extractedValue)
      : false;
  const isPlaceholder = claimedPlaceholder || valuePlaceholder;
  if (isPlaceholder) {
    validationIssues.push(
      issue(
        'PLACEHOLDER_CONTACT_VALUE',
        'warning',
        'Placeholder contact data must remain staged, non-routable, and unverified.',
        'extractedValue',
      ),
    );
  }
  if (claimedPlaceholder !== valuePlaceholder) {
    validationIssues.push(
      issue(
        'PLACEHOLDER_MARKER_MISMATCH',
        'warning',
        'The source verification claim and extracted value disagree about placeholder status.',
        'claimedVerificationStatus',
      ),
    );
  }

  let normalizedValue: string | null = null;
  if (channelType !== null && extractedValue !== null && extractedValue.length > 0) {
    normalizedValue = normalizeContactValue(channelType, extractedValue);
    if (normalizedValue === null && !isPlaceholder) {
      validationIssues.push(invalidValueIssue(channelType));
    }
  }

  const recordSourceUrl =
    typeof record.recordSpecificSourceUrl === 'string' &&
    normalizeWhitespace(record.recordSpecificSourceUrl).length > 0
      ? record.recordSpecificSourceUrl
      : request.registeredSourceUrl;
  const sourceUrl = typeof recordSourceUrl === 'string' ? normalizeHttpsUrl(recordSourceUrl) : null;
  if (sourceUrl === null) {
    validationIssues.push(
      issue(
        'MALFORMED_SOURCE_URL',
        'error',
        'Every staged contact requires a record-specific or registered HTTPS source URL.',
        'recordSpecificSourceUrl',
      ),
    );
  } else if (!sourceHosts.has(new URL(sourceUrl).hostname.toLocaleLowerCase('en-IN'))) {
    validationIssues.push(
      issue(
        'SOURCE_URL_NOT_APPROVED',
        'error',
        'The record source URL is outside the approved source contract host set.',
        'recordSpecificSourceUrl',
      ),
    );
  }
  if (request.sourceTrust === 'official' && !request.sourceContractApproved) {
    validationIssues.push(
      issue(
        'SOURCE_CONTRACT_UNAPPROVED',
        'warning',
        'Official-source trust requires a currently approved retrieval contract.',
        null,
      ),
    );
  }

  const hasErrors = validationIssues.some(({ severity }) => severity === 'error');
  const verificationStatus: GovernanceContactNormalizerVerificationStatus = isPlaceholder
    ? 'placeholder'
    : request.sourceTrust === 'official' && request.sourceContractApproved && !hasErrors
      ? 'source_verified'
      : 'unverified';
  const deduplicationKey =
    ownerEntityType !== null &&
    ownerSourceEntityKey !== null &&
    channelType !== null &&
    normalizedValue !== null
      ? [
          ownerEntityType,
          normalizeKey(ownerSourceEntityKey),
          channelType,
          normalizeKey(purpose ?? ''),
          normalizedValue,
        ].join('\u001f')
      : null;

  return {
    ownerEntityType,
    ownerSourceEntityKey,
    channelType,
    purpose,
    extractedValue,
    normalizedValue,
    sourceRecordLocator,
    sourceUrl,
    claimedVerificationStatus,
    verificationStatus,
    status: 'staged',
    isPlaceholder,
    deduplicationKey,
    reviewRequired: true,
    eligibleForAutomaticPublication: false,
    eligibleForComplaintDelivery: false,
    validationIssues,
  };
};

const validateExpectations = (request: GovernanceContactNormalizationRequest): void => {
  const { minimumRecords, maximumRecords } = request.expectations;
  if (!Number.isSafeInteger(minimumRecords) || minimumRecords < 0) {
    throw new RangeError('minimumRecords must be a non-negative safe integer.');
  }
  if (
    maximumRecords !== null &&
    (!Number.isSafeInteger(maximumRecords) || maximumRecords < minimumRecords)
  ) {
    throw new RangeError('maximumRecords must be null or a safe integer not below minimumRecords.');
  }
  if (
    !Array.isArray(request.approvedSourceHosts) ||
    request.approvedSourceHosts.length === 0 ||
    request.approvedSourceHosts.length > 20 ||
    request.approvedSourceHosts.some(
      (host) =>
        typeof host !== 'string' ||
        host !== host.toLocaleLowerCase('en-IN').trim() ||
        !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/u.test(
          host,
        ),
    ) ||
    new Set(request.approvedSourceHosts).size !== request.approvedSourceHosts.length
  ) {
    throw new RangeError('approvedSourceHosts must contain 1 to 20 unique normalized hostnames.');
  }
  if (typeof request.sourceContractApproved !== 'boolean') {
    throw new TypeError('sourceContractApproved must be a boolean.');
  }
};

const detectDuplicateCandidates = (
  candidates: GovernanceNormalizedContactCandidate[],
): GovernanceSyncValidationIssue[] => {
  const positionsByKey = new Map<string, number[]>();
  for (const [position, candidate] of candidates.entries()) {
    if (candidate.deduplicationKey === null) {
      continue;
    }
    const positions = positionsByKey.get(candidate.deduplicationKey) ?? [];
    positions.push(position);
    positionsByKey.set(candidate.deduplicationKey, positions);
  }

  let duplicateGroups = 0;
  for (const positions of positionsByKey.values()) {
    if (positions.length < 2) {
      continue;
    }
    duplicateGroups += 1;
    for (const position of positions) {
      const candidate = candidates[position];
      if (candidate === undefined) {
        continue;
      }
      candidate.validationIssues.push(
        issue(
          'DUPLICATE_CONTACT_RECORD',
          'error',
          'The same owner, contact channel, purpose, and normalized value appears more than once.',
          'extractedValue',
        ),
      );
      candidate.verificationStatus = candidate.isPlaceholder ? 'placeholder' : 'unverified';
    }
  }

  return duplicateGroups === 0
    ? []
    : [
        issue(
          'DUPLICATE_CONTACT_RECORDS',
          'error',
          `${duplicateGroups} duplicate contact group${duplicateGroups === 1 ? '' : 's'} detected.`,
          null,
        ),
      ];
};

export const normalizeGovernanceContactRecords = (
  request: GovernanceContactNormalizationRequest,
): GovernanceContactNormalizationResult => {
  validateExpectations(request);

  const runIssues: GovernanceSyncValidationIssue[] = [];
  const recordCount = request.records.length;
  if (recordCount === 0) {
    runIssues.push(
      issue(
        'ZERO_CONTACT_RESULTS',
        'error',
        'The parser returned no contact records; the source may be empty or its layout may have changed.',
        null,
      ),
    );
  }

  const { minimumRecords, maximumRecords, expectedLayoutFingerprint, observedLayoutFingerprint } =
    request.expectations;
  if (recordCount < minimumRecords || (maximumRecords !== null && recordCount > maximumRecords)) {
    const maximumDescription = maximumRecords === null ? 'no upper bound' : String(maximumRecords);
    runIssues.push(
      issue(
        'CONTACT_CARDINALITY_OUT_OF_RANGE',
        'error',
        `Expected ${minimumRecords}..${maximumDescription} contact records but received ${recordCount}.`,
        null,
      ),
    );
  }

  if (
    expectedLayoutFingerprint !== null &&
    expectedLayoutFingerprint !== observedLayoutFingerprint
  ) {
    runIssues.push(
      issue(
        'SOURCE_LAYOUT_DRIFT',
        'error',
        'The observed source layout does not match the parser contract fingerprint.',
        null,
      ),
    );
  }

  const sourceHosts = new Set(request.approvedSourceHosts);
  const candidates = request.records.map((record) => normalizeRecord(record, request, sourceHosts));
  runIssues.push(...detectDuplicateCandidates(candidates));

  return { candidates, runIssues };
};
