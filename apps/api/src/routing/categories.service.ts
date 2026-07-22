import { Inject, Injectable } from '@nestjs/common';
import type { RoutingCategory, RoutingCategoryCatalogItem } from '@local-wellness/types';

import { ApiException } from '../common/api-exception.js';
import { RoutingStore } from '../data/routing.store.js';

const categoryCatalogCacheTtlMilliseconds = 30_000;

@Injectable()
export class CategoriesService {
  private catalogCache: Readonly<{
    expiresAt: number;
    value: RoutingCategoryCatalogItem[];
  }> | null = null;
  private catalogRequest: Promise<RoutingCategoryCatalogItem[]> | null = null;

  public constructor(
    @Inject(RoutingStore)
    private readonly routingStore: RoutingStore,
  ) {}

  public listCategories(): Promise<RoutingCategory[]> {
    return this.routingStore.listRoutingCategories();
  }

  public async listCategoryCatalog(): Promise<RoutingCategoryCatalogItem[]> {
    const now = Date.now();
    if (this.catalogCache && this.catalogCache.expiresAt > now) {
      return this.catalogCache.value;
    }
    if (this.catalogRequest) return this.catalogRequest;

    const request = this.routingStore.listRoutingCategoryCatalog().then((value) => {
      this.catalogCache = {
        expiresAt: Date.now() + categoryCatalogCacheTtlMilliseconds,
        value,
      };
      return value;
    });
    this.catalogRequest = request;

    try {
      return await request;
    } finally {
      if (this.catalogRequest === request) this.catalogRequest = null;
    }
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
