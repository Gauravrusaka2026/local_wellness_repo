import { Inject, Injectable } from '@nestjs/common';
import type { VerifiedGoverningBodyMatch } from '@local-wellness/types';
import { verifiedGoverningBodyMatchSchema } from '@local-wellness/validation';
import { z } from 'zod';

import {
  GovernanceDirectoryDataAccessError,
  GovernanceDirectoryStore,
  type GoverningBodyDirectoryQuery,
} from '../data/governance-directory.store.js';
import { SupabaseClients } from './supabase-clients.js';

interface RpcResult {
  data: unknown;
  error: unknown;
}

type ServiceRoleRpc = (
  functionName: string,
  arguments_: Record<string, unknown>,
) => PromiseLike<RpcResult>;

const nullableUuidSchema = z.uuid().nullable();
const governingBodyRowSchema = z
  .object({
    state_id: z.uuid(),
    district_id: nullableUuidSchema,
    taluka_id: nullableUuidSchema,
    local_body_id: z.uuid(),
    ward_id: nullableUuidSchema,
    match: verifiedGoverningBodyMatchSchema,
  })
  .strict();

const matchKey = (row: z.infer<typeof governingBodyRowSchema>): string =>
  [row.state_id, row.district_id, row.taluka_id, row.local_body_id, row.ward_id]
    .map((identifier) => identifier ?? '-')
    .join(':');

@Injectable()
export class SupabaseGovernanceDirectoryStore extends GovernanceDirectoryStore {
  public constructor(@Inject(SupabaseClients) private readonly clients: SupabaseClients) {
    super();
  }

  public async resolveVerifiedGoverningBodies(
    query: GoverningBodyDirectoryQuery,
  ): Promise<VerifiedGoverningBodyMatch[]> {
    const operation = 'resolve verified governing bodies';

    try {
      const rpc = this.clients.serviceRoleClient.rpc.bind(
        this.clients.serviceRoleClient,
      ) as unknown as ServiceRoleRpc;
      const { data, error } = await rpc('resolve_verified_governing_bodies', {
        p_longitude: query.location.longitude,
        p_latitude: query.location.latitude,
        p_accuracy_meters: query.accuracyMeters,
        p_resolved_at: query.resolvedAt,
      });

      if (error) {
        throw new GovernanceDirectoryDataAccessError(operation);
      }

      const decoded = z.array(governingBodyRowSchema).max(25).safeParse(data);
      if (!decoded.success) {
        throw new GovernanceDirectoryDataAccessError(operation);
      }

      const uniqueKeys = new Set(decoded.data.map(matchKey));
      if (uniqueKeys.size !== decoded.data.length) {
        throw new GovernanceDirectoryDataAccessError(operation);
      }

      return decoded.data.map((row) => row.match);
    } catch (error) {
      if (error instanceof GovernanceDirectoryDataAccessError) {
        throw error;
      }

      throw new GovernanceDirectoryDataAccessError(operation);
    }
  }
}
