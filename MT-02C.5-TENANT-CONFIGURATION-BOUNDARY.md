# MT-02C.5 — Tenant Spreadsheet Configuration & Provider Secret Boundary

## What this patch changes

- Keeps tenant identity and spreadsheet routing server-controlled through the existing `tenants` registry / `resolveTenantContext` flow.
- Reads public/manual payment instructions from each tenant spreadsheet's `PaymentProviders` tab.
- Limits legacy provider environment-variable fallback to `COMMERCE_MODE=single_store`. Marketplace mode fails closed when a provider row is absent.
- Resolves Midtrans Server Key and Biteship API Key by `secret_ref` through Google Secret Manager; the secret value is never stored in tenant Sheets or sent to the browser.
- Validates secret resource names against the tenant and provider to reduce cross-tenant secret-reference mistakes.
- Rejects credential-looking keys inside `options_json`, and duplicate provider rows.
- Preserves legacy environment configuration for single-store tenants during migration when no matching provider row exists.

## Platform registry spreadsheet

Tab: `tenants`

Required headers:

`tenant_id | slug | name | spreadsheet_id | status | config_version`

The spreadsheet ID must only be read from this server-side registry. Never accept a spreadsheet ID from a browser request.

## Tenant spreadsheet tabs

### `StoreConfig`

Headers: `key | value`

Suggested keys: `store_name`, `short_name`, `description`, `site_url`, `contact_email`, `contact_whatsapp`, `logo_url`, `primary_color`.

### `PaymentProviders`

Headers:

`provider_id | enabled | environment | secret_ref | public_client_key | options_json`

Example rows (replace public values with each store's own values):

- Midtrans: `midtrans | true | production | projects/PROJECT_ID/secrets/TENANT_ID-midtrans-server-key/versions/latest | MIDTRANS_PUBLIC_CLIENT_KEY | {}`
- Bank transfer: `manual_bank_transfer | true | | | | {"title":"Transfer Bank BSI","bank_name":"BSI","account_name":"Nama Pemilik Rekening","account_number":"1234567890","description":"Transfer sesuai total order"}`
- QRIS: `manual_qris | true | | | | {"title":"QRIS","qris_image_url":"https://cdn.example.com/qris.png","description":"Scan QRIS sesuai nominal order"}`

`options_json` is for public/display settings only. Do not put server keys, API keys, tokens, passwords, private keys, or any provider credential there.

For manual bank transfer, the account number is a public payment instruction. Do not store online banking passwords, PINs, OTPs, or other authentication secrets.

### `ShippingProviders`

Headers:

`provider_id | enabled | secret_ref | origin_postal_code | options_json`

Biteship secret example:

`projects/PROJECT_ID/secrets/TENANT_ID-biteship-api-key/versions/latest`

### Other tabs

- `CheckoutSettings`: `key | value`
- `AffiliateSettings`: `key | value`
- `CommissionRules`: `rule_id | status | rate_type | rate_value | starts_at | ends_at | version`
- `FeeRules`: `rule_id | status | fee_type | fee_value | starts_at | ends_at | version`

## Secret Manager

- Grant the Google service account `roles/secretmanager.secretAccessor` only for the provider secrets it needs.
- Secret names should be tenant-scoped: `<tenant_id>-midtrans-server-key` and `<tenant_id>-biteship-api-key` (or `tenant-<tenant_id>-...` forms accepted by the resolver).
- Set `GOOGLE_SECRET_MANAGER_PROJECT_ID` to the exact Google Cloud project that owns the provider secrets. The application verifies that each `secret_ref` points to this project.
- The application uses the existing server-side Google service account credentials for Google Sheets and Secret Manager. Those credentials must stay in server-only environment variables and must never use a `NEXT_PUBLIC_` prefix.
- Rotate credentials that were ever pasted into chat, source archives, logs, or other shared locations.

## Compatibility / rollout

1. Existing `single_store` deployments can keep legacy provider variables until each provider row is configured and verified.
2. Once a provider row exists, that row is authoritative. A disabled tenant row will not silently fall back to deployment credentials.
3. `marketplace` mode does not fall back to deployment-wide Midtrans/Biteship credentials when a tenant row is absent.
4. Marketplace order/payment/shipping routes remain guarded until all transaction paths share trusted tenant context. This patch does not enable marketplace checkout.
5. Tenant payment display settings are read on the server and passed only as public instructions to the checkout UI. Secret values are never passed to client components.

## Validation still required

Run `npm run typecheck` and `npm run build`, then verify:

- Single-store checkout still works with legacy environment configuration when tenant provider rows are absent.
- A configured Midtrans row uses its tenant `secret_ref` and public client key.
- A configured Biteship row uses its tenant `secret_ref` and origin postal code.
- Tenant manual bank/QRIS instructions show the matching tenant's values.
- Missing provider rows in marketplace mode do not use legacy deployment credentials.
- Wrong-tenant secret references and credentials placed in `options_json` fail closed.
