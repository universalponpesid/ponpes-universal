import type { TenantContext } from "./types";

/** Safe tenant identity for UI rendering. Never expose spreadsheet routing metadata. */
export interface PublicTenant {
  tenantId: string;
  slug: string;
  name: string;
  status: "active" | "suspended";
  configVersion: string;
}

export function toPublicTenant(tenant: TenantContext): PublicTenant {
  return {
    tenantId: tenant.tenantId,
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status,
    configVersion: tenant.configVersion,
  };
}
