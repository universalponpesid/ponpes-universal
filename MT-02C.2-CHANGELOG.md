# MT-02C.2 Change Log

## Added
- `src/infrastructure/repositories/sheets/payment-event-repository.ts`: payment event ledger with stable event keys and processing outcome.
- `src/app/api/admin/inventory/reconcile/route.ts`: bearer-token-protected, dry-run-first reconciliation for linked stock reservations.
- `MT-02C.2-PAYMENT-IDEMPOTENCY-INVENTORY-RECONCILIATION.md`: required tab schema, operations, and limitations.

## Updated
- `src/app/api/payment/midtrans/webhook/route.ts`: writes verified Midtrans notifications to `payment_events`, skips already processed event keys, records failures for retry/audit.
- `src/core/commerce/order-service.ts`: exposes tenant-scoped order listing for reconciliation.
- `src/app/produk/page.tsx`: numbered pagination, 12 items per page, preserves query filters.
- `.env.example`: documents `ADMIN_OPERATIONS_TOKEN`.

## Operational requirements
- Create the `payment_events` tab and paste the header from the MT-02C.2 document before enabling the webhook in production.
- Set `ADMIN_OPERATIONS_TOKEN` only in server-side environment variables in local development and Vercel.
- Google Sheets cannot guarantee atomic event uniqueness or inventory transactions. Treat the ledger as an audit/retry layer; PostgreSQL is required for strict high-volume transaction safety.
- Manual payment admin approval UI and actor-level audit are not included in this milestone.
