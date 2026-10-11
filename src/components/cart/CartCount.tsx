"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export function CartCount() {
  const { itemCount } = useCart();
  return (
    <Link
      href="/keranjang"
      className="relative inline-flex min-h-10 items-center rounded-full border border-[rgb(var(--color-border))] px-3 text-sm font-semibold text-[rgb(var(--color-text))] transition hover:border-[rgb(var(--color-primary))]"
      aria-label={`Keranjang, ${itemCount} item`}
    >
      Keranjang
      {itemCount > 0 ? (
        <span className="ml-2 grid min-w-5 place-items-center rounded-full bg-[rgb(var(--color-primary))] px-1.5 py-0.5 text-[10px] font-bold text-white">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      ) : null}
    </Link>
  );
}
