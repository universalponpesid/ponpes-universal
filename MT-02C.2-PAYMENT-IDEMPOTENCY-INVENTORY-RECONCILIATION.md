# MT-02C.2 — Payment event idempotency, webhook audit, inventory reconciliation

## Scope delivered

- Added `SheetsPaymentEventRepository` backed by a new `payment_events` tab.
- Midtrans webhook validates signature, tenant order, payment method and gross amount before writing a payment event.
- Events are keyed by a SHA-256 digest of tenant, order, transaction ID, transaction status, status code and amount. A previously processed event returns HTTP 200 with `duplicate: true`.
- The event ledger stores a payload hash and selected payment fields, not the raw notification body or secret values.
- Webhook marks events `processing`, `processed`, or `failed`; processing failures return HTTP 500 so Midtrans can retry.
- Added protected dry-run-first inventory reconciliation endpoint: `POST /api/admin/inventory/reconcile`.
- Added numbered product pagination with 12 products per page while preserving search/category/sort query parameters.

## Required Google Sheets tab

Create a tab named exactly `payment_events`. Paste this header into row 1:

```tsv
event_id	tenant_id	order_id	provider	provider_event_key	transaction_id	transaction_status	status_code	gross_amount	payload_hash	processing_status	received_at	processed_at	error_message
```

Do not delete or rename columns after production data is written. This tab is an append-oriented audit log; keep access restricted to the server service account and trusted operators.

## Reconciliation endpoint

Set `ADMIN_OPERATIONS_TOKEN` in local environment and Vercel to a long random secret. Never expose it via `NEXT_PUBLIC_*` variables or browser code.

Dry run (does not mutate inventory):

```bash
curl -X POST "https://YOUR_DOMAIN/api/admin/inventory/reconcile" \
  -H "Authorization: Bearer YOUR_ADMIN_OPERATIONS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"apply":false}'
```

Apply only after reviewing the dry-run report:

```bash
curl -X POST "https://YOUR_DOMAIN/api/admin/inventory/reconcile" \
  -H "Authorization: Bearer YOUR_ADMIN_OPERATIONS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"apply":true}'
```

Automatic repair is limited to active reservations whose associated order is paid (commit) or terminal unpaid/failed/expired (release). Missing reservations and contradictory committed/released states are reported for manual review and are not guessed or changed automatically.

## Important Google Sheets limitation

Google Sheets has no unique constraint, transactional compare-and-set, or atomic stock reservation across tabs. The payment event log is a best-effort deduplication/audit layer, not a database lock. Concurrent duplicate webhooks can still race at the sheet layer. Domain payment handling and reservation transitions must remain idempotent; for high-volume or strict stock guarantees, migrate orders, payment events, inventory and reservations to PostgreSQL/transactional storage.

## Manual bank transfer / QRIS workflow

`payment_verification` means the customer submitted a claim, not that the payment has been verified. An authorized admin must compare the received bank/QRIS funds against the order amount before setting payment to `paid`. Do not let the customer-facing "I have paid" button mark an order as paid. A dedicated authenticated admin screen with actor-level audit and rejection reasons remains a follow-up deliverable; do not expose a public status-update endpoint or directly edit payment cells as the long-term workflow.

## Validation required before production

- `npm ci`
- `npm run typecheck`
- `npm run build`
- Configure the `payment_events` tab before sending live Midtrans notifications. A missing/malformed tab intentionally makes the webhook return 500 rather than silently dropping the audit event.
- Test duplicate settlement notification, pending then settlement, expire/cancel notification, wrong amount, invalid signature, and retry after an inventory commit failure.
- Verify pagination with more than 12 active products and with search/category/sort filters active.
