import "server-only";

import { storeConfig } from "@/config/store";
import { getCommerceConfig } from "@/infrastructure/config/commerce-config";
import { GoogleSheetsDataProvider } from "@/infrastructure/providers/google-sheets";
import { GoogleSheetsTenantRegistry } from "./google-sheets-tenant-registry";
import { normalizeTenantId, requireActiveTenant } from "@/core/tenancy/tenant-registry";
import type { ResolveTenantInput, TenantContext, TenantRegistry } from "@/core/tenancy/types";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} wajib diisi.`);
  return value;
}

let registryInstance: { spreadsheetId: string; registry: TenantRegistry } | null = null;

function getMarketplaceRegistry(): TenantRegistry {
  const spreadsheetId = requiredEnv("PLATFORM_GOOGLE_SHEETS_SPREADSHEET_ID");
  if (!registryInstance || registryInstance.spreadsheetId !== spreadsheetId) {
    registryInstance = {
      spreadsheetId,
      registry: new GoogleSheetsTenantRegistry(spreadsheetId),
    };
  }
  return registryInstance.registry;
}

/**
 * Resolves tenant identity from trusted deployment config / platform registry.
 * A request body must never provide a spreadsheet ID or override single-store identity.
 */
export async function resolveTenantContext(
  input: ResolveTenantInput = {},
): Promise<TenantContext> {
  const config = getCommerceConfig();

  if (config.mode === "single_store") {
    const defaultTenantId = normalizeTenantId(config.defaultTenantId);
    if (input.tenantId && normalizeTenantId(input.tenantId) !== defaultTenantId) {
      throw new Error("Tenant yang diminta tidak sesuai dengan instalasi single store ini.");
    }
    return {
      tenantId: defaultTenantId,
      slug: storeConfig.storeId.toLowerCase().replace(/[^a-z0-9-]/g, "-") || defaultTenantId,
      name: storeConfig.name,
      status: "active",
      configVersion: "1",
      spreadsheetId: requiredEnv("GOOGLE_SHEETS_SPREADSHEET_ID"),
    };
  }

  if (!input.tenantId) {
    throw new Error("tenantId wajib ditentukan oleh server untuk operasi tenant marketplace.");
  }

  const registryRecord = await requireActiveTenant(getMarketplaceRegistry(), input.tenantId);
  return { ...registryRecord };
}

export async function createTenantDataProvider(input: ResolveTenantInput = {}) {
  const tenant = await resolveTenantContext(input);
  return {
    tenant,
    provider: new GoogleSheetsDataProvider(tenant.spreadsheetId),
  };
}
