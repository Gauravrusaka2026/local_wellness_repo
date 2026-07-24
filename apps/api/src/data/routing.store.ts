import type {
  ComplaintTaxonomyCatalogItem,
  JurisdictionResolution,
  LocationEvidence,
  RoutingCategory,
  RoutingCategoryCatalogItem,
  RoutingDecision,
  RoutingAssetOption,
  RoutingResolutionInput,
} from '@local-wellness/types';
import type {
  JurisdictionResolutionQuery,
  JurisdictionResolver,
  RoutingContext,
  RoutingDataProvider,
} from '@local-wellness/routing-engine';

export interface RecordRoutingDecisionInput {
  actorUserId: string;
  requestId: string;
  locationEvidence: LocationEvidence;
  routingInput: RoutingResolutionInput;
  decision: RoutingDecision;
}

export interface RecordedRoutingDecision extends RecordRoutingDecisionInput {
  id: string;
}

export interface ResolveWardComplaintRouteInput {
  actorUserId: string;
  requestId: string;
  categoryId: string;
  assetId: string | null;
  locationEvidence: LocationEvidence;
  resolvedAt: string;
}

export interface RoutingAssetDiscoveryQuery {
  categoryId: string;
  location: Readonly<{ latitude: number; longitude: number }>;
  accuracyMeters: number;
  resolvedAt: string;
}

export class RoutingDataAccessError extends Error {
  public constructor(
    public readonly operation: string,
    public readonly dependencyCode: string | null = null,
  ) {
    super(`Routing persistence operation failed: ${operation}.`);
    this.name = 'RoutingDataAccessError';
  }
}

export class RoutingDecisionIdempotencyConflictError extends RoutingDataAccessError {
  public constructor() {
    super('record routing decision');
    this.name = 'RoutingDecisionIdempotencyConflictError';
  }
}

export abstract class RoutingStore implements JurisdictionResolver, RoutingDataProvider {
  public abstract findRoutingCategory(categoryId: string): Promise<RoutingCategory | null>;

  public abstract listRoutingCategories(): Promise<RoutingCategory[]>;

  public abstract listRoutingCategoryCatalog(): Promise<RoutingCategoryCatalogItem[]>;

  public abstract listComplaintTaxonomy(): Promise<ComplaintTaxonomyCatalogItem[]>;

  public abstract discoverRoutingAssets(
    query: RoutingAssetDiscoveryQuery,
  ): Promise<RoutingAssetOption[]>;

  public abstract loadRoutingContext(
    input: RoutingResolutionInput,
    jurisdiction: JurisdictionResolution,
  ): Promise<RoutingContext>;

  public abstract recordRoutingDecision(input: RecordRoutingDecisionInput): Promise<string>;

  public abstract resolveWardComplaintRoute(
    input: ResolveWardComplaintRouteInput,
  ): Promise<RecordedRoutingDecision>;

  public abstract findRecordedRoutingDecision(
    actorUserId: string,
    requestId: string,
  ): Promise<RecordedRoutingDecision | null>;

  public abstract resolveJurisdiction(
    query: JurisdictionResolutionQuery,
  ): Promise<JurisdictionResolution>;
}
