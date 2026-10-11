# Universal Mart — MT-01.5 Commerce Mode Foundation

This is an **additive** package. It introduces the single-store/marketplace mode contract and safe capability helpers. It does not replace or modify existing checkout, inventory, order, payment, shipping, or repository implementations.

## Files

Merge these new files into the project:

- `src/core/commerce/commerce-config.ts`
- `src/infrastructure/config/commerce-config.ts`
- `src/core/tenancy/public-tenant.ts`

This package assumes the MT-01 tenant foundation already exists, including `src/core/tenancy/types.ts` and `src/config/store.ts`.

## Environment configuration

For a one-tenant store (safe default):

```dotenv
COMMERCE_MODE=single_store
COMMERCE_DEFAULT_TENANT_ID=universal
COMMERCE_FEATURE_AFFILIATE=true
COMMERCE_FEATURE_PRODUCT_REVIEWS=true
COMMERCE_FEATURE_STORE_REVIEWS=false
```

For the marketplace deployment, only after the tenant registry and platform operations are configured:

```dotenv
COMMERCE_MODE=marketplace
COMMERCE_DEFAULT_TENANT_ID=universal
COMMERCE_FEATURE_AFFILIATE=true
COMMERCE_FEATURE_PRODUCT_REVIEWS=true
COMMERCE_FEATURE_STORE_REVIEWS=true
```

`COMMERCE_MODE` defaults to `single_store` when omitted to avoid accidentally activating marketplace-only capabilities. Set it explicitly in each deployment. Do not use `NEXT_PUBLIC_COMMERCE_MODE` as the authority for server-side business rules.

## Mode-owned capabilities

| Capability | `single_store` | `marketplace` |
|---|---:|---:|
| Affiliate | Configurable; defaults on | Configurable; defaults on |
| Product reviews | Configurable; defaults on | Configurable; defaults on |
| Store reviews | Configurable; defaults off | Configurable; defaults on |
| Multi-tenant operations | Off | On |
| Platform fees | Off | On, but still requires an active tenant agreement |
| Marketplace catalog | Off | On |

The mode itself controls `multiTenant`, `platformFees`, and `marketplaceCatalog`; these cannot be turned on by the feature environment variables in single-store mode.

## Server usage

```ts
import { getCommerceConfig } from "@/infrastructure/config/commerce-config";
import {
  assertCommerceCapability,
  assertPlatformFeeAllowed,
  toPublicCommerceConfig,
} from "@/core/commerce/commerce-config";

const config = getCommerceConfig();

// Example service guard. Use in server-side service code, not only in the UI.
if (config.mode === "marketplace") {
  assertCommerceCapability(config, "marketplaceCatalog");
}

// Platform fee needs both marketplace mode and a current active agreement.
// assertPlatformFeeAllowed(config, agreement.status);

// Pass only this projection to client components when the UI needs feature flags.
const publicConfig = toPublicCommerceConfig(config);
```

## Tenant data safety

`TenantContext` from MT-01 includes `spreadsheetId` because it is used for server-side repository routing. **Never pass it to a client component, API response, or log.** Use `toPublicTenant(tenant)` when rendering tenant identity in UI. A tenant ID supplied by a browser is not proof of authorization; resolve it against trusted server context and enforce authorization at each service boundary.

## Integration boundary

This phase intentionally does not alter homepage routing, repository construction, checkout payloads, order schemas, payment webhooks, or shipping. The next step is a controlled audit and integration of the current working tree, followed by tenant-scoped repository wiring. Avoid adding mode conditionals throughout UI components; resolve configuration on the server and pass a safe public projection to the UI.

## Verification

1. Confirm `src/config/store.ts` exports `storeConfig.tenantId` as expected. If not, adapt the fallback to the project's actual store config shape.
2. Run `npx tsc --noEmit` after merging.
3. Verify `buildCommerceConfig({ mode: "single_store", defaultTenantId: "universal" })` has `multiTenant`, `platformFees`, and `marketplaceCatalog` set to `false`.
4. Verify marketplace mode sets those three capabilities to `true`.
5. Verify `assertPlatformFeeAllowed` rejects single-store mode and rejects a missing/draft/suspended/expired agreement.
6. Verify no client-facing response contains `spreadsheetId`.

This archive has not been compiled against the complete current working tree because a complete current project directory/package manifest was not available in the supplied snapshots. Treat it as an additive implementation package and run the verification steps in the actual project before deployment.
