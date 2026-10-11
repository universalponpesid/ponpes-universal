# Universal Mart — Hybrid Configuration Foundation

## Decision

- Environment variables contain deployment-wide infrastructure settings and root secrets only.
- The platform registry spreadsheet maps `tenant_id` to an approved tenant spreadsheet and its `config_version`.
- Each tenant spreadsheet owns operational configuration in dedicated tabs.
- Provider credentials are represented in sheets by `secret_ref`, never plaintext credentials. A server-only secret adapter must resolve these references before production provider calls.
- Midtrans and Biteship now resolve tenant provider rows first. Legacy environment variables remain a temporary fallback only when a provider row is absent, to protect existing single-store deployments. Marketplace transactions remain blocked pending full tenant-aware transaction and inventory migration.

## Platform registry tab

`tenants` headers:

`tenant_id | slug | name | spreadsheet_id | status | config_version`

Allowed status: `active`, `suspended`. IDs and slugs must be unique. `spreadsheet_id` is trusted server-side routing metadata and must never be accepted from a browser request.

## Tenant spreadsheet tabs

### StoreConfig

Key/value rows with headers `key | value`. Suggested keys: `store_name`, `short_name`, `description`, `site_url`, `contact_email`, `contact_whatsapp`, `logo_url`, `primary_color`.

### PaymentProviders

Headers: `provider_id | enabled | environment | secret_ref | public_client_key | options_json`.
Allowed providers currently recognized by the schema: `midtrans`, `manual_bank_transfer`, `manual_qris`. `environment` for Midtrans: `sandbox` or `production`. `public_client_key` is public configuration only; server keys must never be placed there.

### ShippingProviders

Headers: `provider_id | enabled | secret_ref | origin_postal_code | options_json`.
Currently recognized provider: `biteship`.

### CheckoutSettings / AffiliateSettings

Key/value rows with headers `key | value`. Keep keys documented and validated by the consuming service before use.

### CommissionRules

Headers: `rule_id | status | rate_type | rate_value | starts_at | ends_at | version`.
`status`: `draft`, `active`, `suspended`; `rate_type`: `percentage`, `fixed`.

### FeeRules

Headers: `rule_id | status | fee_type | fee_value | starts_at | ends_at | version`.
`status`: `draft`, `active`, `suspended`; `fee_type`: `percentage`, `fixed`.

## Runtime behavior

`resolveTenantConfig(tenantId?)` resolves a trusted tenant context first, then loads the corresponding configuration tabs. It uses a bounded TTL cache (default 45 seconds, configurable via `TENANT_CONFIG_CACHE_TTL_MS`, maximum 300000 ms). A `config_version` bump changes the cache key. Admin mutation endpoints should call `invalidateTenantConfigCache(tenantId)` after a successful validated update.

## Important implementation boundary

The MT-02B implementation now routes Midtrans token creation/webhook signature verification and Biteship quotes through tenant provider configuration. Secret references are resolved by a server-only Google Secret Manager adapter. There is not yet an admin UI for editing tenant configuration or provisioning secrets; those remain controlled setup operations. Keep marketplace transaction routes blocked until the remaining transaction and inventory paths are tenant-aware end-to-end.
