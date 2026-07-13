import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { GovernanceManifestDataset, GovernanceSourceRecord } from '@local-wellness/types';

import {
  findGovernanceDuplicateKeys,
  governanceDateSchema,
  governanceHttpsUrlSchema,
  isGovernancePlaceholder,
  isGovernancePlaceholderCode,
  isGovernancePlaceholderContact,
  normalizeGovernanceText,
} from './index.js';

const manifest: GovernanceManifestDataset = {
  id: 'municipal_councils',
  path: 'resources/governance/csv/Municipal_Councils.csv',
  sha256: '0'.repeat(64),
  title: 'Municipal Councils',
  headers: ['Municipal Council', 'District'],
  expectedRecordCount: 3,
  naturalKey: ['District', 'Municipal Council'],
  disposition: 'operational',
};

const record = (row: number, district: string): GovernanceSourceRecord => ({
  id: `00000000-0000-5000-8000-${String(row).padStart(12, '0')}`,
  datasetId: 'municipal_councils',
  disposition: 'operational',
  sourcePath: manifest.path,
  sourceSha256: manifest.sha256,
  sourceRowNumber: row,
  recordSha256: String(row).padStart(64, '0'),
  values: { 'Municipal Council': 'Karjat', District: district },
});

describe('governance validation helpers', () => {
  it('normalizes Unicode and whitespace without changing source files', () => {
    assert.equal(normalizeGovernanceText('  Cafe\u0301   Road  '), 'Café Road');
  });

  it('recognizes narrow placeholder values and preserves legitimate required-data text', () => {
    assert.equal(isGovernancePlaceholder('Mumbai / official address to verify'), true);
    assert.equal(isGovernancePlaceholderContact('1077 / district-specific'), true);
    assert.equal(isGovernancePlaceholderCode('Needs official LGD code'), true);
    assert.equal(isGovernancePlaceholder('Asset owner required'), false);
    assert.equal(isGovernancePlaceholder('Official department/local-body mapping required'), false);
  });

  it('uses composite keys so legitimate repeated names remain distinct', () => {
    const distinct = [record(3, 'Raigad'), record(4, 'Ahilyanagar')];
    assert.deepEqual(findGovernanceDuplicateKeys(manifest, distinct), []);

    const duplicate = [...distinct, record(5, 'Raigad')];
    assert.equal(findGovernanceDuplicateKeys(manifest, duplicate)[0]?.code, 'DUPLICATE_KEY');
  });

  it('accepts only ISO dates and HTTPS governance sources', () => {
    assert.equal(governanceDateSchema.safeParse('2026-07-13').success, true);
    assert.equal(governanceDateSchema.safeParse('13/07/2026').success, false);
    assert.equal(governanceHttpsUrlSchema.safeParse('https://example.gov.in/path').success, true);
    assert.equal(governanceHttpsUrlSchema.safeParse('http://example.gov.in/path').success, false);
  });
});
