# MT-02C.3 Changelog

## Added
- `/admin/payment-review` authenticated operational dashboard for manual bank-transfer and manual QRIS verification queue.
- HttpOnly/SameSite admin session cookie with eight-hour expiry, signed using `ADMIN_OPERATIONS_TOKEN`; optional operator label via `ADMIN_OPERATIONS_NAME`.
- Approve/reject actions with mandatory reason, tenant-scoped order lookup, payment method/state validation, inventory commit/release through `OrderService`, and `payment_admin_audit` records (`started` then `succeeded`/`failed`).
- Aggregate inventory audit in the existing protected inventory reconciliation response: `reserved_stock` vs active reservation quantity, expired active reservations, negative/over-reserved counters, and orphan active reservations.
- Midtrans event ledger returns retryable HTTP 503 when a matching event is already processing and its lease is younger than two minutes; old stuck processing rows can be reclaimed on a later delivery.
- Migration notes for transactional PostgreSQL constraints, row locks, ledger, and outbox.

## Safety / limitations
- Admin actions fail closed if the `payment_admin_audit` sheet/header is missing.
- Approve only after confirming the actual bank mutation or QRIS settlement; customer confirmation alone is not proof of funds.
- Rejecting a manual payment marks it failed/cancelled and attempts to release active reservations. Approval marks paid and attempts reservation commit.
- Sheets-based event leases and inventory reconciliation reduce operational risk but are not cross-process atomic. Concurrent serverless invocations can still race before an event append or during stock read-modify-write.
- Inventory aggregate audit is report-only. It does not rewrite `reserved_stock` automatically because doing so without a transactional compare-and-set could corrupt concurrent reservations.
- Build/typecheck could not be run in the generation environment because dependency installation timed out. Run checks locally before deployment.
