# Universal Mart v3.1 — Build Fix

This patch addresses two production-build errors reported after the v3 package.

## Changes

1. `src/app/catalog-ui-preview/page.tsx`: wraps `CatalogToolbar` (which uses `useSearchParams`) in React `Suspense` with a lightweight skeleton fallback.
2. `src/app/produk/page.tsx`: uses `dynamic = "force-dynamic"` because product data is loaded from Google Sheets using runtime environment configuration. This prevents Next.js from attempting to prerender the route during `next build` without the deployment environment.
3. `.env.example`: uses port 3001 for the local URL to match the reported local setup and clarifies that payment/shipping env vars are temporary legacy configuration until MT-02B.

## Apply

Extract the patch at the project root and allow these files to be replaced. Do not replace `.env.local`.

Then run:

```bash
npm run typecheck
npm run build
```

This patch has been inspected for file contents and ZIP integrity. A full Next.js build was not run in this environment, so rerun the commands locally.
