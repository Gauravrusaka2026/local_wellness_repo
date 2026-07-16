import { Inject, Injectable } from '@nestjs/common';
import type {
  GovernmentComplaintSlaSummary,
  GovernmentKpiQuery,
  GovernmentKpiSnapshotResult,
} from '@local-wellness/types';
import {
  governmentComplaintSlaSummarySchema,
  governmentKpiSnapshotResultSchema,
} from '@local-wellness/validation';

import {
  AccountabilityAccessDeniedError,
  AccountabilityDataAccessError,
  AccountabilityNotFoundError,
  AccountabilityStore,
} from '../data/accountability.store.js';
import { SupabaseClients } from './supabase-clients.js';

interface RpcResult {
  data: unknown;
  error: unknown;
}

type ServiceRoleRpc = (
  functionName: string,
  arguments_: Record<string, unknown>,
) => PromiseLike<RpcResult>;

const databaseMarker = (error: unknown): string | null =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof error.message === 'string' &&
  /^[A-Z][A-Z0-9_]+$/u.test(error.message)
    ? error.message
    : null;

const unwrapPayload = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.length === 1 ? unwrapPayload(value[0]) : undefined;
  }
  if (typeof value === 'object' && value !== null && 'payload' in value) {
    return Object.keys(value).length === 1 ? value.payload : undefined;
  }
  return value;
};

@Injectable()
export class SupabaseAccountabilityStore extends AccountabilityStore {
  public constructor(@Inject(SupabaseClients) private readonly clients: SupabaseClients) {
    super();
  }

  public async getComplaintSla(
    actorUserId: string,
    complaintId: string,
    scopeRoleAssignmentId?: string,
  ): Promise<GovernmentComplaintSlaSummary> {
    const value = await this.callRpc('read complaint SLA', 'get_government_complaint_sla', {
      p_actor_user_id: actorUserId,
      p_complaint_id: complaintId,
      p_scope_role_assignment_id: scopeRoleAssignmentId ?? null,
    });
    const decoded = governmentComplaintSlaSummarySchema.safeParse(unwrapPayload(value));
    if (!decoded.success) {
      throw new AccountabilityDataAccessError('decode complaint SLA');
    }
    return decoded.data;
  }

  public async listKpiSnapshots(
    actorUserId: string,
    query: GovernmentKpiQuery,
  ): Promise<GovernmentKpiSnapshotResult> {
    const value = await this.callRpc('read KPI snapshots', 'list_government_kpi_snapshots', {
      p_actor_user_id: actorUserId,
      p_authority_id: query.authorityId ?? null,
      p_scope_role_assignment_id: query.scopeRoleAssignmentId ?? null,
      p_scope_type: query.scopeType ?? null,
      p_scope_id: query.scopeId ?? null,
      p_segment: query.segment ?? null,
      p_metric_codes: query.metricCodes ?? null,
    });
    const decoded = governmentKpiSnapshotResultSchema.safeParse(unwrapPayload(value));
    if (!decoded.success) {
      throw new AccountabilityDataAccessError('decode KPI snapshots');
    }
    return decoded.data;
  }

  private async callRpc(
    operation: string,
    functionName: string,
    arguments_: Record<string, unknown>,
  ): Promise<unknown> {
    try {
      const rpc = this.clients.serviceRoleClient.rpc.bind(
        this.clients.serviceRoleClient,
      ) as unknown as ServiceRoleRpc;
      const { data, error } = await rpc(functionName, arguments_);
      const marker = databaseMarker(error);
      if (marker === 'GOVERNMENT_ACCESS_REQUIRED') {
        throw new AccountabilityAccessDeniedError();
      }
      if (marker === 'COMPLAINT_NOT_FOUND') {
        throw new AccountabilityNotFoundError();
      }
      if (error) {
        throw new AccountabilityDataAccessError(operation);
      }
      return data;
    } catch (error) {
      if (error instanceof AccountabilityDataAccessError) {
        throw error;
      }
      throw new AccountabilityDataAccessError(operation);
    }
  }
}
