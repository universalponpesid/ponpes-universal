import "server-only";

import { storeConfig } from "@/config/store";
import {
  buildCommerceConfig,
  type CommerceMode,
  type CommerceConfig,
} from "@/core/commerce/commerce-config";

function readBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  if (raw === "false" || raw === "0" || raw === "no") return false;
  throw new Error(`${name} harus bernilai true atau false.`);
}

function readMode(): CommerceMode {
  const raw = process.env.COMMERCE_MODE?.trim().toLowerCase() || "single_store";
  if (raw === "single_store" || raw === "marketplace") return raw;
  throw new Error("COMMERCE_MODE hanya boleh bernilai single_store atau marketplace.");
}

/** Resolve once per server request/runtime from trusted deployment configuration. */
export function getCommerceConfig(): CommerceConfig {
  const mode = readMode();
  const storeReviewsDefault = mode === "marketplace";
  const configuredTenantId = process.env.COMMERCE_DEFAULT_TENANT_ID?.trim();
  const storefrontTenantId = storeConfig.tenantId.trim().toLowerCase();

  if (
    mode === "single_store" &&
    configuredTenantId &&
    configuredTenantId.toLowerCase() !== storefrontTenantId
  ) {
    throw new Error(
      "COMMERCE_DEFAULT_TENANT_ID harus sama dengan NEXT_PUBLIC_TENANT_ID pada mode single_store agar katalog, cart, dan checkout menggunakan tenant yang sama.",
    );
  }

  return buildCommerceConfig({
    mode,
    defaultTenantId: configuredTenantId || storeConfig.tenantId || "universal",
    affiliate: readBoolean("COMMERCE_FEATURE_AFFILIATE", true),
    productReviews: readBoolean("COMMERCE_FEATURE_PRODUCT_REVIEWS", true),
    storeReviews: readBoolean("COMMERCE_FEATURE_STORE_REVIEWS", storeReviewsDefault),
  });
}
