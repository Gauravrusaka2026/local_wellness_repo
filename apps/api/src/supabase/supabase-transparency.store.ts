import { Inject, Injectable } from '@nestjs/common';
import type {
  PublicComplaintDetail,
  PublicComplaintHotspotQuery,
  PublicComplaintHotspotResult,
  PublicComplaintEngagementState,
  PublicComplaintMapQuery,
  PublicComplaintMapResult,
  PublicWardBoundaryQuery,
  PublicWardBoundaryResult,
} from '@local-wellness/types';
import {
  publicComplaintDetailSchema,
  publicComplaintEngagementListSchema,
  publicComplaintEngagementStateSchema,
  publicComplaintHotspotResultSchema,
  publicComplaintHotspotSchema,
  publicComplaintMapItemSchema,
  publicComplaintMapResultSchema,
  publicWardBoundaryResultSchema,
  publicWardBoundarySchema,
} from '@local-wellness/validation';
import { z } from 'zod';

import { TransparencyDataAccessError, TransparencyStore } from '../data/transparency.store.js';
import { SupabaseClients } from './supabase-clients.js';

interface RpcResult {
  data: unknown;
  error: unknown;
}

type ServiceRoleRpc = (
  functionName: string,
  arguments_: Record<string, unknown>,
) => PromiseLike<RpcResult>;

const complaintProjectionRowSchema = z
  .object({ projection: publicComplaintMapItemSchema })
  .strict();
const complaintDetailRowSchema = z.object({ projection: publicComplaintDetailSchema }).strict();
const hotspotRowSchema = z.object({ hotspot: publicComplaintHotspotSchema }).strict();
const wardBoundaryRowSchema = z.object({ ward_boundary: publicWardBoundarySchema }).strict();
const engagementRowSchema = z.object({ engagement: publicComplaintEngagementStateSchema }).strict();

const hasDuplicateIdentifiers = <T>(
  items: readonly T[],
  identifier: (item: T) => string,
): boolean => new Set(items.map(identifier)).size !== items.length;

@Injectable()
export class SupabaseTransparencyStore extends TransparencyStore {
  public constructor(
    @Inject(SupabaseClients)
    private readonly clients: SupabaseClients,
  ) {
    super();
  }

  public async listComplaints(query: PublicComplaintMapQuery): Promise<PublicComplaintMapResult> {
    const data = await this.rpc('list_public_complaint_feed', {
      p_west: query.west,
      p_south: query.south,
      p_east: query.east,
      p_north: query.north,
      p_category_codes: query.categoryCodes ?? null,
      p_statuses: query.statuses ?? null,
      p_date_from: query.from ?? null,
      p_date_to: query.to ?? null,
      p_zoom: query.zoom,
      p_limit: query.limit + 1,
      p_cursor: query.cursor ?? null,
      p_sort: query.sort ?? 'recent',
    });
    const rows = z.array(complaintProjectionRowSchema).max(201).safeParse(data);
    if (!rows.success) {
      throw new TransparencyDataAccessError('decode public complaint projections');
    }

    const hasMore = rows.data.length > query.limit;
    const items = rows.data.slice(0, query.limit).map(({ projection }) => projection);
    if (hasDuplicateIdentifiers(rows.data, ({ projection }) => projection.publicId)) {
      throw new TransparencyDataAccessError('decode unique public complaint projections');
    }
    const nextCursor = hasMore ? (items.at(-1)?.publicId ?? null) : null;

    return publicComplaintMapResultSchema.parse({ items, nextCursor, hasMore });
  }

  public async listHotspots(
    query: PublicComplaintHotspotQuery,
  ): Promise<PublicComplaintHotspotResult> {
    const data = await this.rpc('list_public_complaint_hotspots', {
      p_west: query.west,
      p_south: query.south,
      p_east: query.east,
      p_north: query.north,
      p_category_codes: query.categoryCodes ?? null,
      p_statuses: query.statuses ?? null,
      p_date_from: query.from ?? null,
      p_date_to: query.to ?? null,
      p_zoom: query.zoom,
      p_limit: query.limit,
    });
    const rows = z.array(hotspotRowSchema).max(200).safeParse(data);
    if (!rows.success) {
      throw new TransparencyDataAccessError('decode public complaint hotspots');
    }

    const items = rows.data.map(({ hotspot }) => hotspot);
    if (hasDuplicateIdentifiers(items, ({ id }) => id)) {
      throw new TransparencyDataAccessError('decode unique public complaint hotspots');
    }

    return publicComplaintHotspotResultSchema.parse({ items });
  }

  public async listWards(query: PublicWardBoundaryQuery): Promise<PublicWardBoundaryResult> {
    const data = await this.rpc('list_public_ward_boundaries', {
      p_west: query.west,
      p_south: query.south,
      p_east: query.east,
      p_north: query.north,
      p_limit: query.limit,
    });
    const rows = z.array(wardBoundaryRowSchema).max(200).safeParse(data);
    if (!rows.success) {
      throw new TransparencyDataAccessError('decode public ward boundaries');
    }

    const items = rows.data.map(({ ward_boundary: wardBoundary }) => wardBoundary);
    if (hasDuplicateIdentifiers(items, ({ code, localBodyCode }) => `${localBodyCode}:${code}`)) {
      throw new TransparencyDataAccessError('decode unique public ward boundaries');
    }

    return publicWardBoundaryResultSchema.parse({ items });
  }

  public async getComplaint(publicId: string): Promise<PublicComplaintDetail | null> {
    const data = await this.rpc('get_public_complaint_projection', {
      p_public_id: publicId,
    });
    const rows = z.array(complaintDetailRowSchema).max(1).safeParse(data);
    if (!rows.success) {
      throw new TransparencyDataAccessError('decode public complaint projection');
    }

    return rows.data[0]?.projection ?? null;
  }

  public async listEngagements(
    actorUserId: string,
    publicIds: readonly string[],
  ): Promise<PublicComplaintEngagementState[]> {
    const data = await this.rpc('list_public_complaint_engagements', {
      p_actor_user_id: actorUserId,
      p_public_ids: publicIds,
    });
    const rows = z.array(engagementRowSchema).max(100).safeParse(data);
    if (!rows.success) {
      throw new TransparencyDataAccessError('decode public complaint engagement states');
    }

    const engagements = rows.data.map(({ engagement }) => engagement);
    if (hasDuplicateIdentifiers(engagements, ({ publicId }) => publicId)) {
      throw new TransparencyDataAccessError('decode unique public complaint engagement states');
    }

    return publicComplaintEngagementListSchema.parse(engagements);
  }

  public async setEngagement(
    actorUserId: string,
    publicId: string,
    input: Readonly<{ supported: boolean; starred: boolean }>,
  ): Promise<PublicComplaintEngagementState | null> {
    const data = await this.rpc('set_public_complaint_engagement', {
      p_actor_user_id: actorUserId,
      p_public_id: publicId,
      p_supported: input.supported,
      p_starred: input.starred,
    });
    const rows = z.array(engagementRowSchema).max(1).safeParse(data);
    if (!rows.success) {
      throw new TransparencyDataAccessError('decode updated public complaint engagement');
    }

    return rows.data[0]?.engagement ?? null;
  }

  private async rpc(functionName: string, arguments_: Record<string, unknown>): Promise<unknown> {
    const client = this.clients.serviceRoleClient;
    const rpc = client.rpc as unknown as ServiceRoleRpc;
    let result: RpcResult;

    try {
      result = await rpc.call(client, functionName, arguments_);
    } catch {
      throw new TransparencyDataAccessError(`call ${functionName}`);
    }

    if (result.error !== null) {
      throw new TransparencyDataAccessError(`call ${functionName}`);
    }

    return result.data;
  }
}
