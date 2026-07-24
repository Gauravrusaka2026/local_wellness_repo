import { Controller, Get, Inject, Param, UseGuards } from '@nestjs/common';
import type {
  ComplaintTaxonomyCatalogItem,
  RoutingCategory,
  RoutingCategoryCatalogItem,
} from '@local-wellness/types';
import { categoryIdParametersSchema, type CategoryIdParameters } from '@local-wellness/validation';

import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CategoriesService } from './categories.service.js';

@Controller('routing/categories')
@UseGuards(BearerAuthGuard)
export class CategoriesController {
  public constructor(
    @Inject(CategoriesService)
    private readonly categoriesService: CategoriesService,
  ) {}

  @Get()
  public listCategories(): Promise<RoutingCategory[]> {
    return this.categoriesService.listCategories();
  }

  @Get('catalog')
  public listCategoryCatalog(): Promise<RoutingCategoryCatalogItem[]> {
    return this.categoriesService.listCategoryCatalog();
  }

  @Get('taxonomy')
  public listComplaintTaxonomy(): Promise<ComplaintTaxonomyCatalogItem[]> {
    return this.categoriesService.listComplaintTaxonomy();
  }

  @Get(':categoryId')
  public getCategory(
    @Param(new ZodValidationPipe(categoryIdParametersSchema)) parameters: CategoryIdParameters,
  ): Promise<RoutingCategory> {
    return this.categoriesService.getCategory(parameters.categoryId);
  }
}
