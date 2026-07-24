import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type {
  ComplaintListItem,
  ComplaintListResult,
  ComplaintStatus,
} from '@local-wellness/types';

import {
  COMMUNITY_OWNED_REPORT_PREVIEW_LIMIT,
  createCommunityOwnedReportsPreview,
} from '../src/transparency/community-owned-reports';

const complaint = (
  suffix: string,
  updatedAt: string,
  status: ComplaintStatus = 'submitted',
): ComplaintListItem => ({
  categoryId: '11111111-1111-4111-8111-111111111111',
  categoryName: 'Road maintenance',
  complaintNumber: `JS-${suffix}`,
  id: `22222222-2222-4222-8222-${suffix.padStart(12, '0')}`,
  status,
  submittedAt: '2026-07-23T08:00:00.000Z',
  updatedAt,
  visibility: 'private',
});

describe('Community owned-report preview', () => {
  it('shows the newest private owner reports without mutating or promoting them', () => {
    const items = [
      complaint('1', '2026-07-23T08:01:00.000Z'),
      complaint('2', '2026-07-23T08:04:00.000Z'),
      complaint('3', '2026-07-23T08:03:00.000Z'),
      complaint('4', '2026-07-23T08:02:00.000Z'),
    ];
    const result: ComplaintListResult = { hasMore: false, items, nextCursor: null };

    const preview = createCommunityOwnedReportsPreview(result);

    assert.equal(preview.items.length, COMMUNITY_OWNED_REPORT_PREVIEW_LIMIT);
    assert.deepEqual(
      preview.items.map(({ complaintNumber }) => complaintNumber),
      ['JS-2', 'JS-3', 'JS-4'],
    );
    assert.equal(preview.hasMore, true);
    assert.ok(preview.items.every(({ visibility }) => visibility === 'private'));
    assert.ok(preview.items.every((item) => !('publicId' in item)));
    assert.deepEqual(
      items.map(({ complaintNumber }) => complaintNumber),
      ['JS-1', 'JS-2', 'JS-3', 'JS-4'],
    );
  });

  it('preserves server pagination and handles an empty owner result', () => {
    assert.deepEqual(
      createCommunityOwnedReportsPreview({ hasMore: false, items: [], nextCursor: null }),
      { hasMore: false, items: [] },
    );

    const preview = createCommunityOwnedReportsPreview({
      hasMore: true,
      items: [complaint('1', '2026-07-23T08:01:00.000Z')],
      nextCursor: 'opaque',
    });
    assert.equal(preview.hasMore, true);
    assert.equal(preview.items.length, 1);
  });
});
