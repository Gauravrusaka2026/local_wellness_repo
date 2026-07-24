import type { ComplaintListItem, ComplaintListResult } from '@local-wellness/types';

import { getRecentComplaints } from '../dashboard/complaint-summary';

export const COMMUNITY_OWNED_REPORT_PREVIEW_LIMIT = 3;

export type CommunityOwnedReportsPreview = Readonly<{
  hasMore: boolean;
  items: readonly ComplaintListItem[];
}>;

export const createCommunityOwnedReportsPreview = (
  result: ComplaintListResult,
): CommunityOwnedReportsPreview => {
  const items = getRecentComplaints(result.items, COMMUNITY_OWNED_REPORT_PREVIEW_LIMIT);
  return {
    hasMore: result.hasMore || result.items.length > items.length,
    items,
  };
};
