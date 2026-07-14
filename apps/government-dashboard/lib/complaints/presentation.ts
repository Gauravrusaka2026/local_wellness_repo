import type {
  ComplaintStatus,
  GovernmentComplaintAssignmentReason,
  GovernmentComplaintQueue,
  GovernmentComplaintTransferReason,
  GovernmentExternalDependencyType,
  GovernmentInspectionOutcome,
} from '@local-wellness/types';

const humanize = (value: string): string =>
  value
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');

export const getStatusLabel = (status: ComplaintStatus): string => humanize(status);
export const getQueueLabel = (queue: GovernmentComplaintQueue): string => humanize(queue);
export const getAssignmentReasonLabel = (reason: GovernmentComplaintAssignmentReason): string =>
  humanize(reason);
export const getTransferReasonLabel = (reason: GovernmentComplaintTransferReason): string =>
  humanize(reason);
export const getInspectionOutcomeLabel = (outcome: GovernmentInspectionOutcome): string =>
  humanize(outcome);
export const getDependencyTypeLabel = (type: GovernmentExternalDependencyType): string =>
  humanize(type);

export const formatDateTime = (value: string | null): string => {
  if (value === null) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(date);
};

export const formatBytes = (bytes: number): string => {
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_024 * 1_024) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${(bytes / (1_024 * 1_024)).toFixed(1)} MB`;
};
