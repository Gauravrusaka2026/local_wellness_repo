import type {
  PublicComplaintMapQuery,
  PublicComplaintStatus,
  PublicTransparencyViewport,
} from '@local-wellness/types';

export type WebTransparencyFilters = Readonly<{
  categoryCode: string;
  from: string;
  status: '' | PublicComplaintStatus;
  to: string;
}>;

export const defaultWebTransparencyFilters: WebTransparencyFilters = {
  categoryCode: '',
  from: '',
  status: '',
  to: '',
};

const dateBoundary = (date: string, endOfDay: boolean): string | undefined =>
  date === '' ? undefined : `${date}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`;

export const createWebTransparencyQuery = (
  viewport: PublicTransparencyViewport,
  filters: WebTransparencyFilters,
  cursor?: string,
): PublicComplaintMapQuery => ({
  ...viewport,
  ...(filters.categoryCode === '' ? {} : { categoryCodes: [filters.categoryCode] }),
  ...(cursor === undefined ? {} : { cursor }),
  ...(dateBoundary(filters.from, false) === undefined
    ? {}
    : { from: dateBoundary(filters.from, false) }),
  limit: 100,
  ...(filters.status === '' ? {} : { statuses: [filters.status] }),
  ...(dateBoundary(filters.to, true) === undefined ? {} : { to: dateBoundary(filters.to, true) }),
  zoom: 12,
});
