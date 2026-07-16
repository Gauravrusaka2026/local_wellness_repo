import type {
  PublicComplaintMapQuery,
  PublicComplaintStatus,
  PublicTransparencyViewport,
} from '@local-wellness/types';

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
  ...(filters.status === null ? {} : { statuses: [filters.status] }),
  zoom: 12,
});
