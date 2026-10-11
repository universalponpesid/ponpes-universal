# MT-02B — Tenant-aware Midtrans & Biteship

## What changed

- `resolveMidtransRuntimeConfig(tenantId)` and `resolveBiteshipRuntimeConfig(tenantId)` read the tenant's `PaymentProviders` and `ShippingProviders` tabs.
- A configured provider row takes precedence over legacy environment variables. If a row exists but is disabled or incomplete, the resolver fails closed instead of silently mixing credentials.
- If a provider row does not exist, legacy environment variables remain a temporary fallback for existing `single_store` installations.
- Midtrans token creation and webhook signature verification now resolve the server key for the configured tenant.
- Biteship quote requests now use a tenant-specific service instance and tenant catalog repository; provider instances with credentials are not shared through a global singleton.
- Checkout reads the configured Midtrans public client key at runtime, while retaining the legacy fallback during rollout.
- The homepage and catalog use the same `container-commerce` max-width shell as product detail and cart. `container-content` is retained as a compatible alias for that shell.

## Secret Manager setup

1. Enable the Google Cloud Secret Manager API in the project that owns the secrets.
2. Create a separate secret for each tenant/provider credential, such as `tenant-universal-midtrans-server-key` and `tenant-universal-biteship-api-key`.
3. Add the secret version value through a trusted admin workflow or the Google Cloud console. Do not put secret values into Sheets.
4. Grant the service account used by this application `roles/secretmanager.secretAccessor` on the required secret resources, ideally per secret rather than project-wide.
5. Put only the full resource name in `secret_ref`, for example `projects/PROJECT_ID/secrets/tenant-universal-midtrans-server-key/versions/latest`.

The same service account needs the existing Sheets access and Secret Manager access. Secret Manager reads use the server-side service account credentials; secret values are never serialized to client components or logged by these adapters.

## Tenant tabs

### `PaymentProviders`

Headers:

`provider_id | enabled | environment | secret_ref | public_client_key | options_json`

Example row:

`midtrans | TRUE | sandbox | projects/PROJECT_ID/secrets/tenant-universal-midtrans-server-key/versions/latest | YOUR_MIDTRANS_CLIENT_KEY | {}`

`public_client_key` is public and may be returned to the checkout UI. The Server Key must only be stored in Secret Manager.

### `ShippingProviders`

Headers:

`provider_id | enabled | secret_ref | origin_postal_code | options_json`

Example row:

`biteship | TRUE | projects/PROJECT_ID/secrets/tenant-universal-biteship-api-key/versions/latest | 40624 | {}`

The postal code must be a numeric 5-digit Indonesian postal code in practical use; the parser currently validates a positive integer.

## Rollout compatibility

- Keep `MIDTRANS_*` and `BITESHIP_*` values in the deployment environment while no provider row exists for that tenant.
- Add and verify one tenant provider row at a time. Once a row exists, it is authoritative: an explicitly disabled row disables that provider; missing `secret_ref`/public key/origin for an enabled provider causes an error.
- After both tabs and secret access are tested, remove the legacy provider variables from deployment configuration only after confirming all routes use tenant configuration.
- `single_store` transaction APIs remain guarded against marketplace mode. This phase does not enable marketplace transactions or implement a tenant admin UI.

## Layout consistency

`container-commerce` is the canonical 1120px shell, with 16px mobile, 24px tablet, and 32px wide-desktop gutters. `container-content` aliases the same CSS rule so a stale class cannot make a page full-width. The preview page remains demo-only and does not read live tenant products.

## Validation

Run locally with a valid `.env.local`:

```bash
npm run typecheck
npm run build
```

Then test `/`, `/produk`, `/catalog-ui-preview`, product detail, cart, checkout, `/api/shipping/rates`, `/api/checkout/order`, `/api/payment/midtrans/token`, and the Midtrans webhook in sandbox. This package was assembled from source; run the commands above in the target Windows environment before deploying.
