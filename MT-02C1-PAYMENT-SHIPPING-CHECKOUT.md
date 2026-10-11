# MT-02C.1 — Payment method integrity, shipping area lookup, checkout feedback

## Changes

- Checkout now collects `paymentMethod` before order creation and sends it to `POST /api/checkout/order`.
- The persisted `orders.payment_method` is authoritative. The post-order payment panel only presents the method attached to that order; changing payment method requires creating a new order.
- Added `GET /api/shipping/areas?q=...`, a server-side Biteship Maps proxy. API credentials stay on the server. Search is limited to Indonesian areas and returns up to eight choices.
- Selecting a Biteship area fills province, city/regency, district, and postal code; the selected area ID is passed to the rate quote and saved to the order.
- Added street/address detail, recipient note, and browser GPS coordinates to checkout. GPS is optional; customers can type the address manually if permission is denied.
- Checkout now shows a spinner, disables duplicate submission, and displays a live status message while the server validates prices/shipping and persists the order.
- Midtrans webhook route explicitly uses the Node.js runtime and force-dynamic execution. Successful settlement remains server-verified by signature and amount. Expire/deny/cancel events release tracked inventory reservations; release failures return a retryable server error.

## Existing Google Sheets migration

No new tab is required for this patch. The existing `orders` tab needs these additional columns in row 1 so address details are persisted:

`shipping_destination_area_id | shipping_address_line | shipping_province | shipping_city | shipping_district | shipping_subdistrict | shipping_latitude | shipping_longitude | shipping_recipient_note`

Add these columns to the existing `orders` header row. Preserve all existing columns and data. The repository validates required headers, so deploy only after this migration is applied.

The existing `PaymentProviders` and `ShippingProviders` tabs remain the provider configuration source when configured. The platform `tenants` tab is only needed for marketplace mode, not the current `single_store` checkout.

## Webhook deployment checklist

1. Deploy to Vercel with the correct server-only Midtrans Server Key and matching environment (sandbox or production).
2. Configure Midtrans Payment Notification URL to `https://YOUR-DOMAIN/api/payment/midtrans/webhook`.
3. Ensure the deployment can read the tenant provider configuration/secret store and the Google Sheets `orders` and inventory tabs.
4. Create a fresh test order for each payment method. Existing orders retain the method already persisted and cannot be switched in place.
5. Test Midtrans `pending`, `settlement`, `expire`, `deny`, and `cancel` notifications using sandbox tools. Confirm order status and tracked stock reservations.
6. Do not treat a browser success callback as proof of payment. Only the signed server notification can mark an order paid.

## Current boundaries

- Biteship area ID improves the courier-rate destination reference. The shipping quote still depends on the configured origin postal code and supported courier services.
- Browser GPS coordinates are saved as delivery instructions; coordinate-based instant-courier pricing and a draggable interactive map are not yet implemented.
- Google Sheets does not provide transactional locking. The webhook is retry-tolerant for payment/stock operations, but a dedicated `payment_events` audit/idempotency ledger and stronger transactional inventory store remain future hardening tasks.
- `single_store` transaction routes remain intentionally blocked in marketplace mode until end-to-end tenant-aware transaction handling is complete.

## Validation

Run in the target project after installing dependencies and applying the sheet migration:

```bash
npm run typecheck
npm run build
```

Then test area search, rate quote with a selected area, order creation for all three payment methods, manual confirmation, and the deployed Midtrans webhook. This package was assembled without the project's installed `node_modules`; a full typecheck/build could not be confirmed in this environment.
