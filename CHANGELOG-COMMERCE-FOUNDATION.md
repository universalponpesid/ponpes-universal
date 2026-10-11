# Commerce Foundation Update

## Included

- Added tenant contracts, tenant registry validation, server-side tenant resolver and tenant-scoped service composition.
- Added a fail-closed guard to existing cart, checkout, payment, Midtrans webhook and shipping endpoints when `COMMERCE_MODE=marketplace` is selected.
- Replaced the placeholder single-store home with a responsive storefront landing page using existing design tokens and product components.
- Added `/produk` catalog listing with search, category filter, price sorting and pagination.
- Routed single-store product details through the tenant-scoped composition root.
- Added `.env.example` and architecture/migration notes.

## Important limits

- Marketplace mode is scaffolding, not production-ready marketplace checkout. Existing transaction APIs are intentionally blocked in marketplace mode until tenant-aware route migration is complete.
- Build/typecheck could not be verified in this environment because dependency installation did not complete. Run `npm ci`, `npm run typecheck`, and `npm run build` locally before deploying.
- The uploaded `.env.local` was intentionally excluded from generated archives because it contains credentials. Rotate credentials that were included in the uploaded archive before production use.

## MT-02B — Tenant provider configuration and layout shell

- Added a server-only Google Secret Manager adapter for resolving tenant `secret_ref` values.
- Added tenant-aware Midtrans and Biteship runtime configuration resolvers. Provider rows in tenant Sheets are authoritative; legacy environment variables remain a fallback only when the provider row is absent.
- Migrated Midtrans Snap token creation and webhook signature validation to tenant-resolved credentials.
- Migrated Biteship quote routes to tenant-specific service instances to avoid sharing provider credentials between tenants.
- Updated checkout to read the tenant's Midtrans public client key at runtime, while failing closed in the UI if tenant configuration cannot be verified.
- Standardized homepage, product listing, catalog preview, product detail, cart, and checkout around the canonical 1120px `container-commerce` shell. Added a `container-content` compatibility alias to prevent full-width regressions from stale class names.
- Marketplace transaction routes remain guarded. This phase does not add a tenant admin UI or enable marketplace checkout.
