import type {
  PublicComplaintHotspotQuery,
  PublicComplaintMapQuery,
  PublicComplaintStatus,
  PublicTransparencyViewport,
} from '@local-wellness/types';

export const ongoingPublicComplaintStatuses = ['reported', 'in_progress'] as const;

export type MobileTransparencyFilters = Readonly<{
  categoryCode: string | null;
  status: PublicComplaintStatus | null;
}>;

export const defaultMobileTransparencyFilters: MobileTransparencyFilters = {
  categoryCode: null,
  status: null,
};

export const createMobileTransparencyQuery = (
  viewport: PublicTransparencyViewport,
  filters: MobileTransparencyFilters,
  cursor?: string,
): PublicComplaintMapQuery => ({
  ...viewport,
  ...(filters.categoryCode === null ? {} : { categoryCodes: [filters.categoryCode] }),
  ...(cursor === undefined ? {} : { cursor }),
  limit: 100,
  statuses: filters.status === null ? [...ongoingPublicComplaintStatuses] : [filters.status],
  zoom: 12,
});

export const createMobileHotspotQuery = (
  viewport: PublicTransparencyViewport,
  filters: MobileTransparencyFilters,
): PublicComplaintHotspotQuery => ({
  ...viewport,
  ...(filters.categoryCode === null ? {} : { categoryCodes: [filters.categoryCode] }),
  limit: 100,
  statuses: filters.status === null ? [...ongoingPublicComplaintStatuses] : [filters.status],
  zoom: 12,
});
