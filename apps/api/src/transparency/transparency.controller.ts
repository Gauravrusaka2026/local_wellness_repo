import { Controller, Get, Header, Inject, Param, Query } from '@nestjs/common';
import type {
  PublicComplaintDetail,
  PublicComplaintHotspotResult,
  PublicComplaintMapResult,
  PublicWardBoundaryResult,
} from '@local-wellness/types';
import {
  publicComplaintHotspotQuerySchema,
  publicComplaintIdParametersSchema,
  publicComplaintMapQuerySchema,
  publicWardBoundaryQuerySchema,
  type PublicComplaintHotspotQueryInput,
  type PublicComplaintIdParameters,
  type PublicComplaintMapQueryInput,
  type PublicWardBoundaryQueryInput,
} from '@local-wellness/validation';

import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { RateLimit, rateLimitPolicies } from '../common/rate-limit.js';
import { TransparencyService } from './transparency.service.js';

const publicCacheControl = 'no-store';

@Controller('transparency')
@RateLimit(rateLimitPolicies.publicTransparencyRead)
export class TransparencyController {
  public constructor(
    @Inject(TransparencyService)
    private readonly transparency: TransparencyService,
  ) {}

  @Get('complaints')
  @Header('Cache-Control', publicCacheControl)
  public listComplaints(
    @Query(new ZodValidationPipe(publicComplaintMapQuerySchema))
    query: PublicComplaintMapQueryInput,
  ): Promise<PublicComplaintMapResult> {
    return this.transparency.listComplaints(query);
  }

  @Get('hotspots')
  @Header('Cache-Control', publicCacheControl)
  public listHotspots(
    @Query(new ZodValidationPipe(publicComplaintHotspotQuerySchema))
    query: PublicComplaintHotspotQueryInput,
  ): Promise<PublicComplaintHotspotResult> {
    return this.transparency.listHotspots(query);
  }

  @Get('wards')
  @Header('Cache-Control', publicCacheControl)
  public listWards(
    @Query(new ZodValidationPipe(publicWardBoundaryQuerySchema))
    query: PublicWardBoundaryQueryInput,
  ): Promise<PublicWardBoundaryResult> {
    return this.transparency.listWards(query);
  }

  @Get('complaints/:publicId')
  @Header('Cache-Control', publicCacheControl)
  public getComplaint(
    @Param(new ZodValidationPipe(publicComplaintIdParametersSchema))
    parameters: PublicComplaintIdParameters,
  ): Promise<PublicComplaintDetail> {
    return this.transparency.getComplaint(parameters.publicId);
  }
}
