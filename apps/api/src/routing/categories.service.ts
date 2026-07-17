import { Inject, Injectable } from '@nestjs/common';
import type { RoutingCategory, RoutingCategoryCatalogItem } from '@local-wellness/types';

import { ApiException } from '../common/api-exception.js';
import { RoutingStore } from '../data/routing.store.js';

@Injectable()
export class CategoriesService {
  public constructor(
    @Inject(RoutingStore)
    private readonly routingStore: RoutingStore,
  ) {}

  public listCategories(): Promise<RoutingCategory[]> {
    return this.routingStore.listRoutingCategories();
  }

  public listCategoryCatalog(): Promise<RoutingCategoryCatalogItem[]> {
    return this.routingStore.listRoutingCategoryCatalog();
  }

  public async getCategory(categoryId: string): Promise<RoutingCategory> {
    const category = await this.routingStore.findRoutingCategory(categoryId);

    if (!category) {
      throw ApiException.notFound(
        'ROUTING_CATEGORY_NOT_FOUND',
        'The routing category was not found.',
      );
    }

    return category;
  }
}
