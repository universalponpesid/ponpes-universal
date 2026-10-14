# MT-02C.6 — Encrypted Tenant Credentials

This is an incremental patch intended for the Universal Mart source after MT-02C.4 and MT-02C.5 are already applied.

## Contents
- `MT-02C.6-encrypted-tenant-credentials.patch`: unified diff to apply at repository root.
- `MT-02C.6-CHANGELOG.md`: implementation summary and sheet headers.
- `MT-02C.6-ENCRYPTED-TENANT-CREDENTIALS.md`: setup and operational notes.

## Apply
1. Backup/commit the current source.
2. Copy the `.patch` to the repository root.
3. Run `git apply --check MT-02C.6-encrypted-tenant-credentials.patch`.
4. If it passes, run `git apply MT-02C.6-encrypted-tenant-credentials.patch`.
5. Configure the server-only encryption key and create the required Google Sheets tabs/headers from the changelog.
6. Run `npm run typecheck` and `npm run build` before deployment.

Do not apply if MT-02C.5 is not present; first reconcile the source baseline.
