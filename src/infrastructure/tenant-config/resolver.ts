import "server-only";

import type { TenantRuntimeConfig } from "@/core/tenant-config/types";
import { resolveTenantContext } from "@/infrastructure/tenancy/tenant-resolver";
import { GoogleSheetsTenantConfigRepository } from "./google-sheets-tenant-config-repository";

const DEFAULT_TTL_MS = 45_000;
type CacheEntry = { expiresAt: number; config: TenantRuntimeConfig };
const cache = new Map<string, CacheEntry>();
let repository: GoogleSheetsTenantConfigRepository | null = null;

function getRepository(): GoogleSheetsTenantConfigRepository {
  if (!repository) repository = new GoogleSheetsTenantConfigRepository();
  return repository;
}

function cacheTtlMs(): number {
  const raw = Number(process.env.TENANT_CONFIG_CACHE_TTL_MS ?? DEFAULT_TTL_MS);
  if (!Number.isInteger(raw) || raw < 0 || raw > 300_000) {
    throw new Error("TENANT_CONFIG_CACHE_TTL_MS harus berupa integer antara 0 dan 300000.");
  }
  return raw;
}

/**
 * Loads operational settings for a trusted tenant context. Cache is bounded by TTL and
 * configVersion, so registry version bumps immediately create a fresh cache key.
 * Secrets are represented only by secretRef and must be resolved by a server-side secret adapter.
 */
export async function resolveTenantConfig(tenantId?: string): Promise<TenantRuntimeConfig> {
  const tenant = await resolveTenantContext({ tenantId });
  const key = `${tenant.tenantId}:${tenant.spreadsheetId}:${tenant.configVersion}`;
  const now = Date.now();
  const ttl = cacheTtlMs();
  const existing = cache.get(key);
  if (ttl > 0 && existing && existing.expiresAt > now) return existing.config;

  const config = await getRepository().load(tenant.tenantId, tenant.spreadsheetId, tenant.configVersion);
  if (ttl > 0) cache.set(key, { config, expiresAt: now + ttl });
  for (const [cacheKey, entry] of cache) {
    if (entry.expiresAt <= now || cacheKey.startsWith(`${tenant.tenantId}:`) && cacheKey !== key) cache.delete(cacheKey);
  }
  return config;
}

/** Call after a trusted admin updates configuration; does not accept client-controlled spreadsheet IDs. */
export function invalidateTenantConfigCache(tenantId: string): void {
  const normalized = tenantId.trim().toLowerCase();
  for (const key of cache.keys()) if (key.startsWith(`${normalized}:`)) cache.delete(key);
}
