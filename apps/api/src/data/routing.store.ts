import type {
  JurisdictionResolution,
  LocationEvidence,
  RoutingCategory,
  RoutingDecision,
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

export class RoutingDataAccessError extends Error {
  public constructor(operation: string) {
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

  public abstract loadRoutingContext(
    input: RoutingResolutionInput,
    jurisdiction: JurisdictionResolution,
  ): Promise<RoutingContext>;

  public abstract recordRoutingDecision(input: RecordRoutingDecisionInput): Promise<string>;

  public abstract findRecordedRoutingDecision(
    actorUserId: string,
    requestId: string,
  ): Promise<RecordedRoutingDecision | null>;

  public abstract resolveJurisdiction(
    query: JurisdictionResolutionQuery,
  ): Promise<JurisdictionResolution>;
}
