# MT-02C.6 — Encrypted Tenant Credentials

## Implemented
- Added admin UI at `/admin/provider-credentials` to save/rotate Midtrans Server Key and Biteship API Key.
- Credentials are encrypted server-side with AES-256-GCM and random 96-bit IVs before being written to the tenant's `TenantSecrets` tab.
- Master keys are versioned environment variables (`TENANT_CREDENTIALS_ENCRYPTION_KEY_V1`, etc.); active key version is selected by `TENANT_CREDENTIALS_ACTIVE_KEY_VERSION`.
- `secret_ref` uses `tenant-secret:<tenant_id>:<provider>` and resolves only within the server-resolved tenant spreadsheet.
- The admin endpoint writes provider configuration rows to `PaymentProviders` or `ShippingProviders`.
- No credential plaintext is returned in API responses or re-rendered in the UI.

## Required sheet headers
`TenantSecrets`: `secret_id | tenant_id | provider | environment | ciphertext | iv | auth_tag | key_version | status | updated_at`

`PaymentProviders`: `provider_id | enabled | environment | secret_ref | public_client_key | options_json`

`ShippingProviders`: `provider_id | enabled | secret_ref | origin_postal_code | options_json`

## Environment
- `TENANT_CREDENTIALS_ACTIVE_KEY_VERSION=1`
- `TENANT_CREDENTIALS_ENCRYPTION_KEY_V1=<base64 of 32 random bytes>`

Generate a key locally with:
`node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`

Store it in Vercel server-side environment variables and local `.env.local` only. Never commit it or use a `NEXT_PUBLIC_` prefix.

## Operational cautions
- Create the required sheet tabs and exact headers before using the UI.
- The UI uses the existing single admin operations token/session. It is not a multi-user RBAC system.
- Sheets is not a transactional vault; restrict editor access and enable Google account protections.
- Rotating keys requires keeping old `TENANT_CREDENTIALS_ENCRYPTION_KEY_V<version>` values available until all rows encrypted with that version are re-encrypted. Set the active version only after adding the new key.
- Biteship currently uses its normal API endpoint; the environment field is stored as metadata but does not change the endpoint URL in this patch.
- Do not claim build/typecheck passed until run in the actual project environment.
