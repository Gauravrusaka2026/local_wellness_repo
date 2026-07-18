export const publicComplaintStatuses = ['reported', 'in_progress', 'resolved', 'closed'] as const;
export type PublicComplaintStatus = (typeof publicComplaintStatuses)[number];

export const publicComplaintSorts = ['recent', 'trending'] as const;
export type PublicComplaintSort = (typeof publicComplaintSorts)[number];

export interface PublicApproximateLocation {
  latitude: number;
  longitude: number;
  precisionMeters: number;
}

export interface PublicComplaintCategory {
  code: string;
  name: string;
}

export interface PublicWardSummary {
  code: string;
  name: string;
  wardNumber: string | null;
}

export interface PublicLocalBodySummary {
  code: string;
  name: string;
}

export interface PublicComplaintMapItem {
  publicId: string;
  title: string;
  category: PublicComplaintCategory;
  status: PublicComplaintStatus;
  location: PublicApproximateLocation;
  localBody: PublicLocalBodySummary;
  ward: PublicWardSummary | null;
  submittedAt: string;
  updatedAt: string;
  publishedAt: string;
  supportCount: number;
}

export interface PublicComplaintMapResult {
  items: PublicComplaintMapItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PublicComplaintDuplicateGroup {
  canonicalPublicId: string;
  relatedPublicIds: string[];
  totalCount: number;
}

export interface PublicComplaintDetail extends PublicComplaintMapItem {
  summary: string;
  duplicateGroup: PublicComplaintDuplicateGroup | null;
}

export interface PublicComplaintHotspot {
  id: string;
  location: PublicApproximateLocation;
  radiusMeters: number;
  complaintCount: number;
  categoryCount: number;
  from: string;
  to: string;
}

export interface PublicComplaintHotspotResult {
  items: PublicComplaintHotspot[];
}

export type PublicGeoJsonPosition = [longitude: number, latitude: number];
export type PublicGeoJsonLinearRing = PublicGeoJsonPosition[];
export type PublicGeoJsonPolygonCoordinates = PublicGeoJsonLinearRing[];
export type PublicGeoJsonMultiPolygonCoordinates = PublicGeoJsonPolygonCoordinates[];

export interface PublicMultiPolygonGeometry {
  type: 'MultiPolygon';
  coordinates: PublicGeoJsonMultiPolygonCoordinates;
}

export interface PublicWardBoundary {
  code: string;
  name: string;
  wardNumber: string | null;
  localBodyCode: string;
  localBodyName: string;
  boundaryVersion: number;
  boundary: PublicMultiPolygonGeometry;
  complaintCount: number;
}

export interface PublicWardBoundaryResult {
  items: PublicWardBoundary[];
}

export interface PublicTransparencyViewport {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface PublicTransparencyFilters {
  categoryCodes?: string[] | undefined;
  statuses?: PublicComplaintStatus[] | undefined;
  from?: string | undefined;
  to?: string | undefined;
}

export interface PublicComplaintMapQuery
  extends PublicTransparencyViewport, PublicTransparencyFilters {
  zoom: number;
  limit: number;
  sort?: PublicComplaintSort | undefined;
  cursor?: string | undefined;
}

export interface PublicComplaintHotspotQuery
  extends PublicTransparencyViewport, PublicTransparencyFilters {
  zoom: number;
  limit: number;
}

export interface PublicWardBoundaryQuery extends PublicTransparencyViewport {
  limit: number;
}

export interface PublicComplaintEngagementState {
  publicId: string;
  supportCount: number;
  supported: boolean;
  starred: boolean;
}

export interface PublicComplaintEngagementLookupInput {
  publicIds: string[];
}

export interface UpdatePublicComplaintEngagementInput {
  supported: boolean;
  starred: boolean;
}
