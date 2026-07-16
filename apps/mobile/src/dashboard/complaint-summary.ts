import type { ComplaintListItem, ComplaintStatus } from '@local-wellness/types';

export type ComplaintStatusGroup = 'active' | 'attention' | 'resolved';

const resolvedStatuses = new Set<ComplaintStatus>(['cancelled', 'closed', 'rejected', 'resolved']);
const attentionStatuses = new Set<ComplaintStatus>([
  'citizen_verification_pending',
  'escalated',
  'reopened',
]);

export const getComplaintStatusGroup = (status: ComplaintStatus): ComplaintStatusGroup => {
  if (resolvedStatuses.has(status)) return 'resolved';
  if (attentionStatuses.has(status)) return 'attention';
  return 'active';
};

export const formatComplaintStatus = (status: ComplaintStatus): string =>
  status
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');

export type ComplaintDashboardSummary = Readonly<{
  active: number;
  attention: number;
  resolved: number;
  total: number;
}>;

export const buildComplaintDashboardSummary = (
  complaints: readonly ComplaintListItem[],
): ComplaintDashboardSummary =>
  complaints.reduce<ComplaintDashboardSummary>(
    (summary, complaint) => {
      const group = getComplaintStatusGroup(complaint.status);

      return {
        ...summary,
        [group]: summary[group] + 1,
        total: summary.total + 1,
      };
    },
    { active: 0, attention: 0, resolved: 0, total: 0 },
  );

export const getRecentComplaints = (
  complaints: readonly ComplaintListItem[],
  limit = 3,
): readonly ComplaintListItem[] =>
  [...complaints]
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, Math.max(0, limit));
