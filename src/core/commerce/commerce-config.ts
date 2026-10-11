export type CommerceMode = "single_store" | "marketplace";

export type CommerceCapability =
  | "affiliate"
  | "productReviews"
  | "storeReviews"
  | "multiTenant"
  | "platformFees"
  | "marketplaceCatalog";

export interface CommerceFeatures {
  affiliate: boolean;
  productReviews: boolean;
  storeReviews: boolean;
  multiTenant: boolean;
  platformFees: boolean;
  marketplaceCatalog: boolean;
}

/** Server-resolved configuration. Do not accept this object from a request body. */
export interface CommerceConfig {
  mode: CommerceMode;
  defaultTenantId: string;
  features: CommerceFeatures;
}

/** Only this projection should be serialized to client components. */
export interface PublicCommerceConfig {
  mode: CommerceMode;
  features: Pick<
    CommerceFeatures,
    "affiliate" | "productReviews" | "storeReviews" | "multiTenant" | "platformFees" | "marketplaceCatalog"
  >;
}

export interface CommerceConfigInput {
  mode: CommerceMode;
  defaultTenantId: string;
  affiliate?: boolean;
  productReviews?: boolean;
  storeReviews?: boolean;
}

function normalizeTenantId(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(normalized)) {
    throw new Error("COMMERCE_DEFAULT_TENANT_ID tidak valid.");
  }
  return normalized;
}

/**
 * Builds capabilities from the selected operating mode.
 * Mode-owned capabilities cannot be enabled accidentally in single-store mode.
 */
export function buildCommerceConfig(input: CommerceConfigInput): CommerceConfig {
  if (input.mode !== "single_store" && input.mode !== "marketplace") {
    throw new Error("Commerce mode tidak valid.");
  }

  const mode = input.mode;
  const isMarketplace = mode === "marketplace";

  return {
    mode,
    defaultTenantId: normalizeTenantId(input.defaultTenantId),
    features: {
      affiliate: input.affiliate ?? true,
      productReviews: input.productReviews ?? true,
      storeReviews: input.storeReviews ?? isMarketplace,
      multiTenant: isMarketplace,
      platformFees: isMarketplace,
      marketplaceCatalog: isMarketplace,
    },
  };
}

export function toPublicCommerceConfig(
  config: CommerceConfig,
): PublicCommerceConfig {
  return {
    mode: config.mode,
    features: { ...config.features },
  };
}

export function hasCommerceCapability(
  config: CommerceConfig | PublicCommerceConfig,
  capability: CommerceCapability,
): boolean {
  return config.features[capability];
}

export function assertCommerceCapability(
  config: CommerceConfig,
  capability: CommerceCapability,
): void {
  if (!hasCommerceCapability(config, capability)) {
    throw new Error(`Kapabilitas commerce '${capability}' tidak aktif untuk mode '${config.mode}'.`);
  }
}

export type TenantAgreementStatus = "draft" | "active" | "suspended" | "expired";

/** Mode permission alone is not enough: platform fees require an active agreement. */
export function assertPlatformFeeAllowed(
  config: CommerceConfig,
  agreementStatus: TenantAgreementStatus | null,
): void {
  assertCommerceCapability(config, "platformFees");
  if (agreementStatus !== "active") {
    throw new Error("Biaya platform tidak dapat diterapkan tanpa perjanjian tenant yang aktif.");
  }
}
