# MT-02C.5 — Tenant Spreadsheet Configuration Boundary

## Apply

1. Backup/commit your current repository.
2. Copy `MT-02C.5-tenant-config-boundary.patch` to the repository root.
3. Run `git apply --check MT-02C.5-tenant-config-boundary.patch`.
4. If the check passes, run `git apply MT-02C.5-tenant-config-boundary.patch`.
5. Merge the new `GOOGLE_SECRET_MANAGER_PROJECT_ID` variable into your local/Vercel server environment. Do not overwrite `.env.local` with `.env.example`.
6. Configure each tenant's `PaymentProviders` rows as documented in `MT-02C.5-TENANT-CONFIGURATION-BOUNDARY.md`.
7. Run `npm run typecheck`, `npm run build`, then test checkout and payment methods in staging.

Do not force-apply if `git apply --check` fails. This patch is authored against V4.4 Fixed plus the MT-02C.4 cart cleanup patch.
