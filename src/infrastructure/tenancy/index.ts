import "server-only";

import { CatalogService } from "@/core/catalog/service";
import { CartService } from "@/core/cart/service";
import { OrderService } from "@/core/commerce/order-service";
import { InventoryService } from "@/core/inventory/service";
import { SheetsInventoryRepository } from "@/infrastructure/repositories/sheets/inventory-repository";
import { SheetsOrderRepository } from "@/infrastructure/repositories/sheets/order-repository";
import { SheetsProductRepository } from "@/infrastructure/repositories/sheets/product-repository";
import { createTenantDataProvider } from "./tenant-resolver";

/**
 * Per-request composition root. Every Sheets-backed repository receives a provider
 * resolved from the trusted tenant context, not from a client-supplied spreadsheet ID.
 * Existing singleton factories remain untouched until API routes are migrated in MT-02.
 */
export async function createTenantCommerceServices(tenantId?: string) {
  const { tenant, provider } = await createTenantDataProvider({ tenantId });
  const catalogService = new CatalogService(new SheetsProductRepository(provider));
  const inventoryService = new InventoryService(new SheetsInventoryRepository(provider));
  const cartService = new CartService(catalogService, inventoryService);
  const orderService = new OrderService(
    new SheetsOrderRepository(provider),
    cartService,
    inventoryService,
  );

  return { tenant, provider, catalogService, inventoryService, cartService, orderService };
}

export { resolveTenantContext, createTenantDataProvider } from "./tenant-resolver";
export { GoogleSheetsTenantRegistry } from "./google-sheets-tenant-registry";
