# MT-02C.6 — Encrypted Tenant Credentials

## Admin workflow
1. Deploy the patch and configure `ADMIN_OPERATIONS_TOKEN` as usual.
2. Generate a 32-byte random Base64 master key and set `TENANT_CREDENTIALS_ENCRYPTION_KEY_V1` in Vercel server environment variables.
3. Set `TENANT_CREDENTIALS_ACTIVE_KEY_VERSION=1`.
4. In each tenant spreadsheet, create `TenantSecrets`, `PaymentProviders`, and `ShippingProviders` with the headers documented in `MT-02C.6-CHANGELOG.md` (existing provider tabs can be reused if headers match).
5. Visit `/admin/provider-credentials`, log in with the admin token, enter a registered tenant ID, check configuration, and save provider credentials.
6. Test sandbox Midtrans checkout and Biteship shipping quote before production use.

## Encryption design
- AES-256-GCM, random 12-byte IV, authentication tag, and additional authenticated data bound to tenant ID, provider, environment, and key version.
- Secret references are `tenant-secret:<tenant_id>:midtrans` or `tenant-secret:<tenant_id>:biteship`.
- Runtime resolves the trusted tenant registry context first, then reads only that tenant's spreadsheet. A secret ref cannot choose a spreadsheet ID.
- Plaintext secrets are not logged or returned to the browser.

## Key creation
Run locally:
`node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`

Add the output as `TENANT_CREDENTIALS_ENCRYPTION_KEY_V1` in Vercel and `.env.local`. Never paste the key into chat, Sheets, source code, or a `NEXT_PUBLIC_` variable.

## Security and migration notes
- A single master key is a shared blast radius for all tenants on this deployment. Use strong admin access and restrict Vercel and Google Sheets permissions.
- Keep versioned old keys available during rotation; ciphertext rows carry `key_version`.
- Google Sheets does not provide atomic unique constraints. Do not allow multiple admins to write the same tenant/provider credential concurrently.
- The UI supports one platform-wide admin token, not per-user roles or MFA.
- Existing tenant `secret_ref` values pointing to Google Secret Manager must be replaced through the new UI. This patch no longer resolves Google Secret Manager references.
- `options_json` remains for non-secret instructions such as bank details and QRIS image URLs only.
