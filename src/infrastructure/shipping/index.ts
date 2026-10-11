import "server-only";

import { getCatalogService } from "@/core/catalog";
import { ShippingService } from "@/core/shipping";
import { createTenantCommerceServices } from "@/infrastructure/tenancy";
import { resolveBiteshipRuntimeConfig } from "@/infrastructure/tenant-config/provider-config";
import { BiteshipProvider } from "./biteship";

let shippingService: ShippingService | null = null;

/** Legacy single-store factory retained while old routes are being migrated. */
export function getShippingService(): ShippingService {
  if (shippingService) return shippingService;

  const apiKey = process.env.BITESHIP_API_KEY ?? "";
  const originPostalCode = Number(process.env.BITESHIP_ORIGIN_POSTAL_CODE ?? "0");
  if (!Number.isInteger(originPostalCode) || originPostalCode <= 0) {
    throw new Error("BITESHIP_ORIGIN_POSTAL_CODE belum dikonfigurasi.");
  }

  const catalog = getCatalogService();
  shippingService = new ShippingService(catalog, new BiteshipProvider(apiKey, originPostalCode, catalog));
  return shippingService;
}

/** Tenant-aware provider factory. No singleton is shared across tenant credentials. */
export async function getTenantShippingService(tenantId: string): Promise<ShippingService> {
  const config = await resolveBiteshipRuntimeConfig(tenantId);
  if (!config.enabled) throw new Error("Biteship dinonaktifkan atau belum dikonfigurasi untuk tenant ini.");
  if (!config.apiKey.trim()) throw new Error("Biteship API key belum dikonfigurasi untuk tenant ini.");
  if (!Number.isSafeInteger(config.originPostalCode) || config.originPostalCode <= 0) {
    throw new Error("Kode pos asal Biteship tenant belum dikonfigurasi.");
  }
  const services = await createTenantCommerceServices(tenantId);
  return new ShippingService(
    services.catalogService,
    new BiteshipProvider(config.apiKey, config.originPostalCode, services.catalogService),
  );
}
