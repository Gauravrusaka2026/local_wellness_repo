import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ComplaintListItem, ComplaintStatus } from '@local-wellness/types';

import {
  buildComplaintDashboardSummary,
  formatComplaintStatus,
  getComplaintStatusGroup,
  getRecentComplaints,
} from '../src/dashboard/complaint-summary';

const complaint = (id: string, status: ComplaintStatus, updatedAt: string): ComplaintListItem => ({
  categoryId: '11111111-1111-4111-8111-111111111111',
  categoryName: 'Road maintenance',
  complaintNumber: `LW-${id}`,
  id: `22222222-2222-4222-8222-${id.padStart(12, '0')}`,
  status,
  submittedAt: '2026-07-15T10:00:00.000Z',
  updatedAt,
  visibility: 'private',
});

describe('mobile complaint dashboard summary', () => {
  it('groups operational, attention, and completed complaint states', () => {
    const complaints = [
      complaint('1', 'assigned', '2026-07-15T10:00:00.000Z'),
      complaint('2', 'reopened', '2026-07-15T11:00:00.000Z'),
      complaint('3', 'resolved', '2026-07-15T12:00:00.000Z'),
      complaint('4', 'cancelled', '2026-07-15T13:00:00.000Z'),
    ];

    assert.deepEqual(buildComplaintDashboardSummary(complaints), {
      active: 1,
      attention: 1,
      resolved: 2,
      total: 4,
    });
    assert.equal(getComplaintStatusGroup('citizen_verification_pending'), 'attention');
    assert.equal(getComplaintStatusGroup('work_in_progress'), 'active');
    assert.equal(getComplaintStatusGroup('closed'), 'resolved');
  });

  it('orders recent complaints without mutating the API result', () => {
    const complaints = [
      complaint('1', 'submitted', '2026-07-15T10:00:00.000Z'),
      complaint('2', 'assigned', '2026-07-15T12:00:00.000Z'),
      complaint('3', 'resolved', '2026-07-15T11:00:00.000Z'),
    ];

    assert.deepEqual(
      getRecentComplaints(complaints, 2).map(({ complaintNumber }) => complaintNumber),
      ['LW-2', 'LW-3'],
    );
    assert.deepEqual(
      complaints.map(({ complaintNumber }) => complaintNumber),
      ['LW-1', 'LW-2', 'LW-3'],
    );
    assert.equal(formatComplaintStatus('inspection_scheduled'), 'Inspection Scheduled');
  });
});
