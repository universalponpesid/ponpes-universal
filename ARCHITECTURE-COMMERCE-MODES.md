# Universal Mart — Commerce Modes & Tenant Foundation

## Product direction

Universal Mart uses one commerce engine with two operating modes:

- `single_store`: one installation serves one tenant/store. The tenant identity is fixed by server deployment configuration; the store's catalog, cart, checkout, payments, shipping and affiliate program belong to that tenant. Platform fees and marketplace catalog are disabled.
- `marketplace`: one platform installation serves multiple tenants. A trusted platform registry maps stable `tenant_id` values to each tenant's spreadsheet. Tenant-aware routes must resolve a tenant server-side before reading or writing tenant data.

Affiliate attribution is a reusable capability in both modes. Platform fees are separate from affiliate commissions, gateway fees, shipping, taxes and refunds. Platform fees must require an active tenant agreement and a transaction-time fee snapshot.

## Configuration

See `.env.example`. Keep actual credentials in the local environment / deployment secret store; never commit `.env.local`.

### Single store

```env
COMMERCE_MODE=single_store
COMMERCE_DEFAULT_TENANT_ID=universal
GOOGLE_SHEETS_SPREADSHEET_ID=your-tenant-spreadsheet-id
```

### Marketplace

```env
COMMERCE_MODE=marketplace
COMMERCE_DEFAULT_TENANT_ID=platform
PLATFORM_GOOGLE_SHEETS_SPREADSHEET_ID=your-platform-registry-spreadsheet-id
```

The platform registry must have a `tenants` sheet with these headers in row 1:

`tenant_id | slug | name | spreadsheet_id | status | config_version`

Allowed status values are `active` and `suspended`. `tenant_id` and `slug` must be unique. Each tenant spreadsheet uses the tenant-local tab names defined in `src/config/data.ts`.

## Security boundaries

- Browser input may identify a tenant, but must never provide a spreadsheet ID.
- `resolveTenantContext()` checks the deployment mode and resolves spreadsheet routing on the server.
- `TenantContext.spreadsheetId` is server-only metadata. Serialize `toPublicTenant()` output only; it intentionally excludes spreadsheet routing information.
- Existing cart/checkout/payment/shipping endpoints are explicitly blocked in marketplace mode until they are migrated to tenant-aware composition. This fail-closed guard prevents the marketplace flag from silently sending transactions to the single-store spreadsheet.
- A marketplace tenant's operational spreadsheet is authoritative for its products, stock and orders. A future cross-tenant catalog index is only a search/read model; checkout must re-read authoritative tenant data.

## Current implementation status

Implemented in this foundation:

1. Shared commerce mode / capability configuration.
2. Tenant identity and registry contracts.
3. Google Sheets platform tenant registry with required-header, duplicate ID/slug and status validation.
4. Server-side tenant resolver and per-tenant Google Sheets provider construction.
5. Per-request tenant commerce composition root for catalog, inventory, cart and order services.
6. Fail-closed mode guard on existing cart, checkout, payment, webhook and shipping endpoints.
7. Responsive storefront home and product listing experience for `single_store`.

Not yet complete (do not treat `COMMERCE_MODE=marketplace` as production-ready):

- Tenant-aware route migration for every product, cart, checkout, order, payment webhook and shipping operation.
- Marketplace product index and URLs that identify the tenant, e.g. `/t/[tenantSlug]/produk/[slug]`.
- Tenant payment/shipping provider registry and per-tenant secret resolution.
- Fee agreement, immutable fee/commission ledgers, affiliate storefronts, verified reviews and reconciliation flows.
- Integration tests and concurrency-safe stock/financial persistence. Google Sheets read-check-write is not an atomic transaction store.

## Migration approach

Keep existing single-store service factories and current order behavior intact while endpoints are migrated one at a time. For each route, resolve the trusted tenant context, create tenant-scoped services, validate that all cart items belong to the same tenant, and then operate only through those services. Never mix tenants in an MVP checkout.

Before enabling marketplace transactions, add automated tests for tenant isolation, webhook tenant resolution, idempotency, payment status monotonicity, reservation release/commit, fee snapshots, affiliate attribution and refund reversals.
