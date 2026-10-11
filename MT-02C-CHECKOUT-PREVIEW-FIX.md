# MT-02C — Checkout reconciliation and catalog preview fixes

## Checkout reconciliation

- `inventory_untracked` is now an informational warning, not a reconciliation blocker. It no longer marks the cart as changed by itself, preventing the checkout button from getting stuck in a repeated reconciliation state.
- Order creation supports non-tracked items without creating a stock reservation. Tracked inventory still requires an active record and a successful reservation; insufficient/inactive inventory continues to block checkout.
- The checkout UI warns customers when inventory is not synchronized. Store operators remain responsible for confirming physical availability until inventory tracking is configured.

## Inventory policy note

An item with no inventory record is treated as non-tracked, not as unlimited verified stock. This is a pragmatic MVP behavior to support products whose stock is managed outside the system. Before enabling high-volume or strict stock control, configure inventory rows and move to a transactional inventory repository; Google Sheets does not provide atomic reservation guarantees.

## Catalog UI preview

- Preview products now use local SVG artwork, so the preview does not depend on Cloudinary IDs or remote image availability.
- Product cards route to `/catalog-ui-preview/[slug]`, a dedicated preview detail route. Preview products are explicitly marked demo-only and are not added to the live cart.
- The preview route is excluded from search indexing.

## Validation

Run locally from the project root:

```bash
npm run typecheck
npm run build
```

Then verify checkout with (a) a product that has no inventory row and (b) a product with a tracked active inventory row. The first should display a warning and proceed without a reservation; the second must reserve inventory. Insufficient tracked stock must still be blocked.


See `MT-02C1-PAYMENT-SHIPPING-CHECKOUT.md` for payment method integrity, Biteship area search, address capture, checkout loading feedback, sheet migration, and Vercel webhook checklist.
