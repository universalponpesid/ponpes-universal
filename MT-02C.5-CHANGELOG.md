# MT-02C.5 Changelog

## Added / changed

- `src/infrastructure/tenant-config/provider-config.ts`
  - Legacy Midtrans/Biteship fallback is restricted to single-store mode.
  - Missing provider rows in marketplace mode return disabled configuration rather than using deployment-wide credentials.
  - Tenant-specific secret references are validated against `GOOGLE_SECRET_MANAGER_PROJECT_ID` and the tenant/provider-specific secret name before Google Secret Manager access.
  - Added tenant-specific public/manual payment instruction resolution.
- `src/components/checkout/CheckoutPage.tsx`
  - Displays only enabled payment methods and blocks checkout if none are active.
- `src/infrastructure/tenant-config/google-sheets-tenant-config-repository.ts`
  - Rejects credential-like keys in `options_json`.
  - Rejects duplicate payment/shipping provider rows.
  - Rejects secret references and public client keys on manual payment rows.
- `src/app/api/checkout/order/route.ts`
  - Validates selected payment methods against server-side tenant configuration before creating the order.
- `src/app/checkout/page.tsx`
  - Uses the tenant spreadsheet's manual bank/QRIS display settings and enabled flags when configured.
  - If tenant configuration is invalid, it does not silently show another configuration's payment instructions.
- `MT-02C.5-TENANT-CONFIGURATION-BOUNDARY.md`
  - Documents the registry, tenant tabs, secret naming, rollout, and validation requirements.

## Not included

- Marketplace checkout activation.
- Tenant-aware order/payment/webhook/inventory completion.
- Admin configuration editor or audit UI.
- Automatic secret creation/rotation.
- A managed database migration.

## Verification

The patch is authored against the V4.4 Fixed reference source with MT-02C.4 cart cleanup applied. Typecheck/build/browser testing must be run against the current local source before deployment.
