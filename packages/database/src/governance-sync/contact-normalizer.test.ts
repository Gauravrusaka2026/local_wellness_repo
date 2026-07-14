import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  GovernanceContactNormalizationRequest,
  GovernanceExtractedContactRecord,
} from './contracts.js';
import { normalizeGovernanceContactRecords } from './contact-normalizer.js';

const record = (
  overrides: Partial<GovernanceExtractedContactRecord> = {},
): GovernanceExtractedContactRecord => ({
  ownerEntityType: 'office',
  ownerSourceEntityKey: 'pmc:ward-office:15',
  channelType: 'email',
  purpose: 'General enquiry',
  extractedValue: ' Ward.Office@PMC.GOV.IN ',
  sourceRecordLocator: 'table#ward-offices/row[15]/email',
  recordSpecificSourceUrl: null,
  claimedVerificationStatus: 'source_verified',
  ...overrides,
});

const request = (
  records: readonly GovernanceExtractedContactRecord[],
  overrides: Partial<GovernanceContactNormalizationRequest> = {},
): GovernanceContactNormalizationRequest => ({
  records,
  sourceTrust: 'official',
  sourceContractApproved: true,
  registeredSourceUrl: 'https://www.pmc.gov.in/en/contact-us',
  approvedSourceHosts: ['www.pmc.gov.in'],
  expectations: {
    minimumRecords: 1,
    maximumRecords: 100,
    expectedLayoutFingerprint: 'contact-table:v1',
    observedLayoutFingerprint: 'contact-table:v1',
  },
  ...overrides,
});

describe('governance contact normalization', () => {
  it('normalizes official email, phone, HTTPS URL, and address evidence into staged candidates', () => {
    const result = normalizeGovernanceContactRecords(
      request([
        record(),
        record({
          channelType: 'phone',
          purpose: 'Switchboard',
          extractedValue: '+91 (20) 2550-1000',
          sourceRecordLocator: 'table#ward-offices/row[15]/phone',
        }),
        record({
          channelType: 'website',
          purpose: 'Official website',
          extractedValue: 'https://WWW.PMC.GOV.IN/contact?lang=en',
          sourceRecordLocator: 'table#ward-offices/row[15]/website',
        }),
        record({
          channelType: 'address',
          purpose: 'Office address',
          extractedValue: '  Main Building,\n  Shivajinagar,   Pune  ',
          sourceRecordLocator: 'table#ward-offices/row[15]/address',
        }),
      ]),
    );

    assert.deepEqual(
      result.candidates.map(({ normalizedValue }) => normalizedValue),
      [
        'ward.office@pmc.gov.in',
        '+912025501000',
        'https://www.pmc.gov.in/contact?lang=en',
        'Main Building, Shivajinagar, Pune',
      ],
    );
    assert.deepEqual(
      result.candidates.map(({ verificationStatus, status }) => ({ verificationStatus, status })),
      Array.from({ length: 4 }, () => ({
        verificationStatus: 'source_verified',
        status: 'staged',
      })),
    );
    assert.equal(result.runIssues.length, 0);
  });

  it('quarantines missing, malformed, unsupported, and placeholder contact values', () => {
    const result = normalizeGovernanceContactRecords(
      request([
        record({ extractedValue: '', sourceRecordLocator: 'row[1]' }),
        record({ extractedValue: 'person at pmc dot gov dot in', sourceRecordLocator: 'row[2]' }),
        record({
          channelType: 'fax',
          extractedValue: '02025501000',
          sourceRecordLocator: 'row[3]',
        }),
        record({
          channelType: 'phone',
          extractedValue: '0000000000',
          sourceRecordLocator: 'row[4]',
        }),
        record({
          channelType: 'website',
          extractedValue: 'https://example.com/contact',
          sourceRecordLocator: 'row[5]',
        }),
        record({ extractedValue: 'To be extracted', sourceRecordLocator: 'row[6]' }),
      ]),
    );

    assert.deepEqual(
      result.candidates.map(({ verificationStatus }) => verificationStatus),
      ['unverified', 'unverified', 'unverified', 'placeholder', 'placeholder', 'placeholder'],
    );
    assert.deepEqual(
      result.candidates.map(({ normalizedValue }) => normalizedValue),
      [null, null, null, '0000000000', 'https://example.com/contact', null],
    );
    assert.ok(
      result.candidates[0]?.validationIssues.some(({ code }) => code === 'CONTACT_VALUE_MISSING'),
    );
    assert.ok(
      result.candidates[1]?.validationIssues.some(({ code }) => code === 'MALFORMED_EMAIL'),
    );
    assert.ok(
      result.candidates[2]?.validationIssues.some(
        ({ code }) => code === 'UNKNOWN_CONTACT_CHANNEL_TYPE',
      ),
    );
    assert.ok(
      result.candidates[3]?.validationIssues.some(
        ({ code }) => code === 'PLACEHOLDER_CONTACT_VALUE',
      ),
    );
  });

  it('detects duplicate normalized records and downgrades every duplicate', () => {
    const result = normalizeGovernanceContactRecords(
      request([
        record({ extractedValue: 'ward.office@pmc.gov.in', sourceRecordLocator: 'row[1]' }),
        record({ extractedValue: 'WARD.OFFICE@PMC.GOV.IN', sourceRecordLocator: 'row[2]' }),
      ]),
    );

    assert.deepEqual(
      result.runIssues.map(({ code }) => code),
      ['DUPLICATE_CONTACT_RECORDS'],
    );
    for (const candidate of result.candidates) {
      assert.equal(candidate.verificationStatus, 'unverified');
      assert.ok(candidate.validationIssues.some(({ code }) => code === 'DUPLICATE_CONTACT_RECORD'));
    }
  });

  it('detects empty extraction, parser layout drift, and cardinality failure independently', () => {
    const result = normalizeGovernanceContactRecords(
      request([], {
        expectations: {
          minimumRecords: 10,
          maximumRecords: 30,
          expectedLayoutFingerprint: 'contact-table:v2',
          observedLayoutFingerprint: 'unexpected-page:v1',
        },
      }),
    );

    assert.deepEqual(
      result.runIssues.map(({ code }) => code),
      ['ZERO_CONTACT_RESULTS', 'CONTACT_CARDINALITY_OUT_OF_RANGE', 'SOURCE_LAYOUT_DRIFT'],
    );
  });

  it('never accepts parser claims as manual verification or publication authority', () => {
    const result = normalizeGovernanceContactRecords(
      request([record({ claimedVerificationStatus: 'manually_verified' })]),
    );
    const candidate = result.candidates[0];

    assert.ok(candidate);
    assert.equal(candidate.claimedVerificationStatus, 'manually_verified');
    assert.equal(candidate.verificationStatus, 'source_verified');
    assert.equal(candidate.status, 'staged');
    assert.equal(candidate.eligibleForAutomaticPublication, false);
    assert.equal(candidate.eligibleForComplaintDelivery, false);
    assert.equal(candidate.reviewRequired, true);
    assert.ok(
      candidate.validationIssues.some(
        ({ code }) => code === 'MANUAL_VERIFICATION_CLAIM_DOWNGRADED',
      ),
    );
  });

  it('downgrades well-formed contacts from an unverified source', () => {
    const result = normalizeGovernanceContactRecords(
      request([record()], { sourceTrust: 'unverified' }),
    );

    assert.equal(result.candidates[0]?.verificationStatus, 'unverified');
    assert.equal(result.candidates[0]?.normalizedValue, 'ward.office@pmc.gov.in');
  });

  it('rejects record provenance outside the approved host set', () => {
    const result = normalizeGovernanceContactRecords(
      request([
        record({
          recordSpecificSourceUrl: 'https://unofficial.example/officer-directory',
        }),
      ]),
    );

    assert.equal(result.candidates[0]?.verificationStatus, 'unverified');
    assert.ok(
      result.candidates[0]?.validationIssues.some(({ code }) => code === 'SOURCE_URL_NOT_APPROVED'),
    );
  });

  it('does not source-verify data from an unapproved official retrieval contract', () => {
    const result = normalizeGovernanceContactRecords(
      request([record()], { sourceContractApproved: false }),
    );

    assert.equal(result.candidates[0]?.verificationStatus, 'unverified');
    assert.ok(
      result.candidates[0]?.validationIssues.some(
        ({ code }) => code === 'SOURCE_CONTRACT_UNAPPROVED',
      ),
    );
  });

  it('fails clearly when parser cardinality configuration is invalid', () => {
    assert.throws(
      () =>
        normalizeGovernanceContactRecords(
          request([record()], {
            expectations: {
              minimumRecords: 3,
              maximumRecords: 2,
              expectedLayoutFingerprint: null,
              observedLayoutFingerprint: null,
            },
          }),
        ),
      /maximumRecords must be null or a safe integer not below minimumRecords/u,
    );
  });
});
