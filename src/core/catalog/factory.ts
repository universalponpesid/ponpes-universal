import "server-only";

import { CatalogService } from "./service";
import { getProductRepository } from "@/infrastructure/repositories";

let catalogService: CatalogService | null = null;

export function getCatalogService(): CatalogService {
  if (catalogService) {
    return catalogService;
  }

  catalogService = new CatalogService(getProductRepository());
  return catalogService;
}
