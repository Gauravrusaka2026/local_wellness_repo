import type { ComplaintStatus } from '@local-wellness/types';

const humanize = (value: string): string =>
  value
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');

export const getComplaintStatusLabel = (status: ComplaintStatus): string => humanize(status);

export const getComplaintStatusTone = (
  status: ComplaintStatus,
): 'active' | 'attention' | 'complete' | 'stopped' => {
  if (status === 'resolved' || status === 'closed') return 'complete';
  if (status === 'rejected' || status === 'cancelled') return 'stopped';
  if (status === 'resolution_submitted' || status === 'citizen_verification_pending') {
    return 'attention';
  }
  return 'active';
};

export const formatComplaintDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(date);
};

export const formatComplaintCode = humanize;
