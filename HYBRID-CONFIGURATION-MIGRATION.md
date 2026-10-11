# Hybrid Configuration Migration Notes

## Files added

- `src/core/tenant-config/types.ts`: typed tenant runtime configuration.
- `src/infrastructure/tenant-config/google-sheets-tenant-config-repository.ts`: reads and validates tenant configuration tabs.
- `src/infrastructure/tenant-config/resolver.ts`: trusted tenant resolution plus TTL/version-aware configuration cache.
- `HYBRID-CONFIGURATION-FOUNDATION.md`: tab contracts and runtime behavior.

## Files to keep from the previous foundation

Keep the tenant registry, tenant resolver, tenant-scoped service composition, commerce mode guard, and the existing UI pages. This change is additive and does not require replacing the homepage or product catalog files.

## What is not migrated yet

Midtrans token creation, Midtrans webhook signature verification, and Biteship quote requests now resolve tenant provider rows first and use Google Secret Manager for `secret_ref`. Legacy `MIDTRANS_*` and `BITESHIP_*` environment variables remain a compatibility fallback only when the tenant has no row for that provider. Do not remove them until tenant rows and secret access have been tested end-to-end. Do not enable marketplace checkout during this transition.

## Next engineering phase

1. Define a server-side `SecretStore` adapter (managed secret service or encrypted store).
2. Build tenant-aware payment and shipping factories from `TenantRuntimeConfig`.
3. Update payment token, webhook, shipping rates, checkout and order paths to share a trusted tenant context.
4. Add admin-only validated config mutation with audit events and cache invalidation.
5. Test single-store regression, tenant isolation, invalid/missing configuration, provider key rotation, webhook replay, and cross-tenant order access.
