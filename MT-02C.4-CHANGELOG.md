# MT-02C.4 — Cart cleanup after successful checkout

## Scope

This patch fixes the cart remaining populated in the mini-cart after an order is successfully created.

## Files changed

- `src/components/cart/CartProvider.tsx`
- `src/components/checkout/CheckoutPage.tsx`

## Behavior

- The checkout page calls cart cleanup only after `/api/checkout/order` returns a successful response containing an order.
- The cleanup subtracts quantities recorded on the created order, matching by `productId` and `variantId`.
- It does not blindly clear the entire cart, so products added while the checkout request is in flight are preserved when they exceed the purchased quantity.
- Failed checkout requests leave the cart untouched.
- Cart state continues to flow through the existing provider and localStorage persistence effect; no direct localStorage mutation was added.

## Apply

From the repository root, apply `MT-02C.4-cart-checkout-cleanup.patch` with:

```bash
git apply MT-02C.4-cart-checkout-cleanup.patch
```

If the patch file is placed outside the repository, provide its full path to `git apply`.

## Validation

Source-level review and ZIP integrity can be checked on delivery. `npm run typecheck`, `npm run build`, and browser-based end-to-end tests have not been run in this environment and must be run against the exact deployed source.

## Manual QA

1. Add one product and proceed to checkout.
2. Complete successful order creation; confirm mini-cart count and `/keranjang` reflect the remaining cart (normally empty).
3. Simulate a failed `/api/checkout/order` response; confirm cart remains unchanged.
4. While the order request is pending, add a different product; after success, confirm the newly added product remains.
5. While the order request is pending, add more quantity of the same product/variant; after success, confirm only the ordered quantity is removed.
6. Refresh the page after cleanup and confirm localStorage persistence matches the visible cart.
