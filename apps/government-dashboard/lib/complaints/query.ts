import {
  complaintStatuses,
  governmentComplaintQueues,
  type ComplaintStatus,
  type GovernmentAccessScope,
  type GovernmentComplaintQueue,
  type GovernmentComplaintQueueQuery,
} from '@local-wellness/types';
import { governmentComplaintQueueQuerySchema } from '@local-wellness/validation';

export type DashboardSearchParameters = Readonly<Record<string, string | string[] | undefined>>;

export type QueueFilterValues = Readonly<{
  cursor: string;
  fromDate: string;
  queue: GovernmentComplaintQueue | '';
  scopeRoleAssignmentId: string;
  search: string;
  status: ComplaintStatus | '';
  toDate: string;
}>;

export type ParsedQueueSearch = Readonly<{
  error: string | null;
  filters: QueueFilterValues;
  query: GovernmentComplaintQueueQuery;
}>;

export type ParsedComplaintScope = Readonly<{
  isValid: boolean;
  scopeRoleAssignmentId: string | undefined;
}>;

const firstValue = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? (value[0] ?? '') : (value ?? '');

export const parseComplaintScope = (
  parameters: DashboardSearchParameters,
  scope: GovernmentAccessScope,
): ParsedComplaintScope => {
  const rawScope = parameters['scope'];
  if (rawScope === undefined || rawScope === '') {
    return { isValid: true, scopeRoleAssignmentId: undefined };
  }
  if (Array.isArray(rawScope)) return { isValid: false, scopeRoleAssignmentId: undefined };

  const isAssigned = scope.roles.some(({ assignmentId }) => assignmentId === rawScope);
  return {
    isValid: isAssigned,
    scopeRoleAssignmentId: isAssigned ? rawScope : undefined,
  };
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/u;

const isCalendarDate = (value: string): boolean => {
  if (!datePattern.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 0));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === (month ?? 1) - 1 &&
    date.getUTCDate() === day
  );
};

const toStartOfDayInIndia = (value: string): string | undefined =>
  value === '' ? undefined : `${value}T00:00:00+05:30`;

const toEndOfDayInIndia = (value: string): string | undefined =>
  value === '' ? undefined : `${value}T23:59:59.999+05:30`;

export const parseQueueSearch = (
  parameters: DashboardSearchParameters,
  scope: GovernmentAccessScope,
): ParsedQueueSearch => {
  const queueValue = firstValue(parameters['queue']);
  const statusValue = firstValue(parameters['status']);
  const scopeValue = firstValue(parameters['scope']);
  const fromDate = firstValue(parameters['from']);
  const toDate = firstValue(parameters['to']);
  const cursor = firstValue(parameters['cursor']);
  const search = firstValue(parameters['search']).trim();
  const queue = governmentComplaintQueues.includes(queueValue as GovernmentComplaintQueue)
    ? (queueValue as GovernmentComplaintQueue)
    : '';
  const status = complaintStatuses.includes(statusValue as ComplaintStatus)
    ? (statusValue as ComplaintStatus)
    : '';
  const scopeRoleAssignmentId = scope.roles.some(({ assignmentId }) => assignmentId === scopeValue)
    ? scopeValue
    : '';

  const filters: QueueFilterValues = {
    cursor,
    fromDate,
    queue,
    scopeRoleAssignmentId,
    search,
    status,
    toDate,
  };

  const errors: string[] = [];
  if (queueValue !== '' && queue === '') errors.push('queue');
  if (statusValue !== '' && status === '') errors.push('status');
  if (scopeValue !== '' && scopeRoleAssignmentId === '') errors.push('access scope');
  if (fromDate !== '' && !isCalendarDate(fromDate)) errors.push('from date');
  if (toDate !== '' && !isCalendarDate(toDate)) errors.push('to date');
  if (search.length > 120) errors.push('search');

  const parsed = governmentComplaintQueueQuerySchema.safeParse({
    ...(cursor === '' ? {} : { cursor }),
    limit: 25,
    ...(scopeRoleAssignmentId === '' ? {} : { scopeRoleAssignmentId }),
    ...(queue === '' ? {} : { queue }),
    ...(status === '' ? {} : { statuses: [status] }),
    ...(fromDate === '' || !isCalendarDate(fromDate)
      ? {}
      : { submittedFrom: toStartOfDayInIndia(fromDate) }),
    ...(toDate === '' || !isCalendarDate(toDate) ? {} : { submittedTo: toEndOfDayInIndia(toDate) }),
    ...(search === '' || search.length > 120 ? {} : { search }),
  });

  if (!parsed.success) errors.push('pagination or date range');

  return {
    error:
      errors.length === 0
        ? null
        : `One or more filters are invalid (${[...new Set(errors)].join(', ')}). Review the values and try again.`,
    filters,
    query: parsed.success ? parsed.data : { limit: 25 },
  };
};

export const buildQueueHref = (
  filters: QueueFilterValues,
  changes: Readonly<Partial<QueueFilterValues>> = {},
): string => {
  const next = { ...filters, ...changes };
  const parameters = new URLSearchParams();
  if (next.scopeRoleAssignmentId) parameters.set('scope', next.scopeRoleAssignmentId);
  if (next.queue) parameters.set('queue', next.queue);
  if (next.status) parameters.set('status', next.status);
  if (next.search) parameters.set('search', next.search);
  if (next.fromDate) parameters.set('from', next.fromDate);
  if (next.toDate) parameters.set('to', next.toDate);
  if (next.cursor) parameters.set('cursor', next.cursor);
  const search = parameters.toString();
  return search === '' ? '/' : `/?${search}`;
};

export const buildComplaintHref = (complaintId: string, scopeRoleAssignmentId: string): string => {
  const path = `/complaints/${encodeURIComponent(complaintId)}`;
  return scopeRoleAssignmentId === ''
    ? path
    : `${path}?${new URLSearchParams({ scope: scopeRoleAssignmentId }).toString()}`;
};
