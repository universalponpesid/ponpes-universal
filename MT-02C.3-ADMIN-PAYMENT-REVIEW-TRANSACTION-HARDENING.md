# MT-02C.3 — Admin Payment Review & Transaction Hardening

## Admin dashboard

- Route: `/admin/payment-review`
- Login uses `ADMIN_OPERATIONS_TOKEN`; the server sets a signed HttpOnly, SameSite=Strict cookie limited to `/api/admin`, with an eight-hour lifetime.
- Optional audit identity: `ADMIN_OPERATIONS_NAME`. This is a configured operator label, not per-person identity. For multiple operators, replace shared-token access with individual accounts/RBAC and MFA.
- Queue contains only `payment.status=verification` and manual bank-transfer/manual QRIS orders for the configured tenant.
- Approval requires a reason, marks payment paid through `OrderService`, and attempts inventory reservation commit.
- Rejection requires a reason, marks payment failed/cancelled and attempts inventory reservation release.
- Every decision first appends a `started` row to `payment_admin_audit`, then records `succeeded` or `failed` and the error. If an operation partially succeeds but inventory/audit finalization fails, investigate before retrying or fulfilling.
- Do not accept customer proof upload or the customer “I have paid” button as authoritative settlement. Compare actual bank mutation or QRIS provider settlement.

## Required `payment_admin_audit` sheet

Create a tab named `payment_admin_audit` with this exact header row (tab-separated):

```text
audit_id	tenant_id	order_id	action	previous_payment_status	next_payment_status	admin_id	reason	amount	created_at	result	error_message
```

## MT-02C.3 event retry handling

`payment_events` recognizes recently-processing events and returns HTTP 503 so Midtrans can retry instead of knowingly processing the same visible event concurrently. Events stuck in `processing` for at least two minutes can be reclaimed on retry. Processed events return HTTP 200 as duplicates. The payload hash and normalized event fields are logged; raw notification bodies are not stored.

**Important limitation:** Google Sheets does not provide unique constraints, row locks, compare-and-set, or multi-row transactions. Two serverless instances can still read the same event before either appends it, and inventory read-modify-write operations can race across instances. This is best-effort duplicate reduction, not a guarantee of cross-process exactly-once processing. Never advertise this Sheets implementation as atomic.

## Inventory reconciliation

The protected `POST /api/admin/inventory/reconcile` response now includes `stockAudit`:

- compares each tenant variant's `reserved_stock` against the sum of active reservation quantities;
- reports expired reservations that still remain active;
- flags negative stock and reserved quantities greater than on-hand stock;
- reports active reservations whose variant cannot be found.

This aggregate audit is intentionally report-only. Existing `apply: true` behavior repairs only safe active reservation transitions tied to order status; it does not directly overwrite aggregate counters. Review the dry-run output and investigate contradictory/missing reservation rows manually.

## Environment

Configure on local environment and deployment server (not `NEXT_PUBLIC_*`):

```dotenv
ADMIN_OPERATIONS_TOKEN=<long-random-secret>
ADMIN_OPERATIONS_NAME=Admin Operasional
```

Use a unique secret. Rotate any credential that has been exposed. HTTPS is required in production.

## Smoke test

1. Create `payment_admin_audit` and ensure `payment_events` has the MT-02C.2 header.
2. Set admin environment variables and restart/redeploy.
3. Open `/admin/payment-review`; log in with the token.
4. Use a sandbox/manual test order and confirm it enters the queue only after the customer requests manual verification.
5. Approve only after funds are confirmed; verify order status/payment status and stock reservation.
6. Reject a separate test order with a reason; verify reservation release.
7. Verify audit rows record operator label, reason, amount, timestamps, result, and errors.
8. Send the same Midtrans notification twice and confirm second processed delivery returns duplicate.
9. Send two copies close together and confirm the second request gets retryable HTTP 503 if it sees the first event processing.
10. Call inventory reconciliation with `apply:false` first and review both `issues` and `stockAudit`.
11. Run `npm run typecheck` and `npm run build` before deployment.

## Database migration target

For true transaction safety, migrate order/payment/inventory/event state to PostgreSQL (or equivalent transactional database):

- unique constraint on `(tenant_id, idempotency_key)` for orders;
- unique constraint on `(provider, tenant_id, provider_event_key)` for provider events;
- row-level locks or conditional updates for inventory (`on_hand`, `reserved_stock`, reservation status);
- atomic transaction for payment transition + stock commit/release + ledger/audit write, using an outbox for downstream side effects;
- idempotent webhook consumer with retry/dead-letter tracking;
- append-only inventory movement ledger and periodic reconciliation against stock balances.

Google Sheets remains suitable for catalog/configuration and MVP reporting, not as the authority for concurrent stock and payment transactions.
