# MT-02 — Implementation Notes

## Added modules

- `src/core/tenancy/types.ts`: `TenantContext`, registry records and resolver input.
- `src/core/tenancy/tenant-registry.ts`: normalized tenant IDs and active-tenant guards.
- `src/infrastructure/tenancy/google-sheets-tenant-registry.ts`: platform `tenants` sheet adapter.
- `src/infrastructure/tenancy/tenant-resolver.ts`: mode-aware, server-only tenant resolution.
- `src/infrastructure/tenancy/index.ts`: per-request tenant-scoped service composition.
- `src/infrastructure/config/assert-single-store-mode.ts`: fail-closed guard for endpoints not yet migrated.

## Why existing singleton factories remain

The existing UI and APIs were built around a single configured spreadsheet. Replacing every factory at once would make a large, difficult-to-review change across checkout, payment notifications, reservations and shipping. This patch introduces the new composition root additively, then blocks legacy transaction endpoints if marketplace mode is selected. The next safe step is to migrate one endpoint group at a time and add tests.

## UI behavior

- Single-store home: premium storefront hero, benefits, categories, featured products and catalog CTA; responsive layout reuses existing design tokens and `ProductCard`/`ProductGrid` components.
- Single-store catalog: search, category filter, sorting, product grid and pagination.
- Marketplace home/catalog: explicit setup state until cross-tenant catalog and tenant-aware product routes are implemented. It intentionally does not misrepresent one tenant's products as the whole marketplace.

## Validation checklist

1. `npm ci`
2. `npm run typecheck`
3. `npm run build`
4. Run in `single_store` mode and test home, catalog, product detail, cart, checkout, payment and shipping.
5. Set `COMMERCE_MODE=marketplace` in a non-production test environment; confirm marketplace setup UI is shown and legacy transaction endpoints fail closed.
6. Add a `tenants` registry sheet and verify active, suspended, missing, duplicate-ID, duplicate-slug and malformed-row behavior.
