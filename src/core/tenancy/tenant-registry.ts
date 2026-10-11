import type { TenantRegistry, TenantRegistryRecord } from "./types";

export class TenantRegistryNotFoundError extends Error {
  constructor(tenantId: string) {
    super(`Tenant '${tenantId}' tidak ditemukan di registry platform.`);
    this.name = "TenantRegistryNotFoundError";
  }
}

export class TenantSuspendedError extends Error {
  constructor(tenantId: string) {
    super(`Tenant '${tenantId}' sedang tidak aktif.`);
    this.name = "TenantSuspendedError";
  }
}

export function normalizeTenantId(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(normalized)) {
    throw new Error("Tenant ID tidak valid.");
  }
  return normalized;
}

export async function requireActiveTenant(
  registry: TenantRegistry,
  tenantId: string,
): Promise<TenantRegistryRecord> {
  const normalizedId = normalizeTenantId(tenantId);
  const tenant = await registry.getByTenantId(normalizedId);
  if (!tenant) throw new TenantRegistryNotFoundError(normalizedId);
  if (tenant.status !== "active") throw new TenantSuspendedError(normalizedId);
  return tenant;
}
