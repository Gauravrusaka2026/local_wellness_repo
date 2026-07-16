import { Inject, Injectable } from '@nestjs/common';
import type {
  PublicComplaintDetail,
  PublicComplaintHotspotQuery,
  PublicComplaintHotspotResult,
  PublicComplaintMapQuery,
  PublicComplaintMapResult,
  PublicWardBoundaryQuery,
  PublicWardBoundaryResult,
} from '@local-wellness/types';
import {
  publicComplaintDetailSchema,
  publicComplaintHotspotResultSchema,
  publicComplaintMapResultSchema,
  publicWardBoundaryResultSchema,
} from '@local-wellness/validation';

import { ApiException } from '../common/api-exception.js';
import { TransparencyDataAccessError, TransparencyStore } from '../data/transparency.store.js';

@Injectable()
export class TransparencyService {
  public constructor(
    @Inject(TransparencyStore)
    private readonly store: TransparencyStore,
  ) {}

  public async listComplaints(query: PublicComplaintMapQuery): Promise<PublicComplaintMapResult> {
    const result = publicComplaintMapResultSchema.safeParse(await this.store.listComplaints(query));
    if (!result.success) {
      throw new TransparencyDataAccessError('validate public complaint response');
    }
    return result.data;
  }

  public async listHotspots(
    query: PublicComplaintHotspotQuery,
  ): Promise<PublicComplaintHotspotResult> {
    const result = publicComplaintHotspotResultSchema.safeParse(
      await this.store.listHotspots(query),
    );
    if (!result.success) {
      throw new TransparencyDataAccessError('validate public hotspot response');
    }
    return result.data;
  }

  public async listWards(query: PublicWardBoundaryQuery): Promise<PublicWardBoundaryResult> {
    const result = publicWardBoundaryResultSchema.safeParse(await this.store.listWards(query));
    if (!result.success) {
      throw new TransparencyDataAccessError('validate public ward response');
    }
    return result.data;
  }

  public async getComplaint(publicId: string): Promise<PublicComplaintDetail> {
    const complaint = await this.store.getComplaint(publicId);
    if (!complaint) {
      throw ApiException.notFound(
        'PUBLIC_COMPLAINT_NOT_FOUND',
        'The public complaint was not found.',
      );
    }

    const result = publicComplaintDetailSchema.safeParse(complaint);
    if (!result.success) {
      throw new TransparencyDataAccessError('validate public complaint detail response');
    }

    return result.data;
  }
}
