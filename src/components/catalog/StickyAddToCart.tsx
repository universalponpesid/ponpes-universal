"use client";

import { useEffect, useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import type { ProductVariantViewModel } from "@/core/catalog/view-models";
import { formatMoney } from "@/core/money";

export type AddToCartPayload = {
  productId: string;
  variantId?: string;
  quantity: number;
};

export type StickyAddToCartProps = {
  productId: string;
  productName: string;
  price: number;
  selectedVariant?: ProductVariantViewModel;
  disabled?: boolean;
  onAddToCart?: (payload: AddToCartPayload) => void;
};

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 99;

function clampQuantity(value: number): number {
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, value));
}

export function StickyAddToCart({
  productId,
  productName,
  price,
  selectedVariant,
  disabled = false,
  onAddToCart,
}: StickyAddToCartProps) {
  const [quantity, setQuantity] = useState(MIN_QUANTITY);
  const [added, setAdded] = useState(false);
  const activePrice = selectedVariant?.price ?? price;
  const isDisabled = disabled || !onAddToCart;

  useEffect(() => {
    setQuantity(MIN_QUANTITY);
  }, [selectedVariant?.id]);

  function handleQuantityChange(nextQuantity: number) {
    setQuantity(clampQuantity(nextQuantity));
  }

  function handleAddToCart() {
    if (isDisabled) return;

    onAddToCart({
      productId,
      variantId: selectedVariant?.id,
      quantity,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[var(--z-sticky)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 lg:static lg:z-auto lg:mt-6 lg:px-0 lg:pb-0">
      <div className="pointer-events-auto mx-auto max-w-[1120px] lg:max-w-none">
        <div className="rounded-[var(--radius-lg)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-elevated))]/95 p-3 shadow-[var(--shadow-floating)] backdrop-blur-xl lg:rounded-[var(--radius-md)] lg:bg-[rgb(var(--color-surface))] lg:p-3 lg:shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-11 shrink-0 items-center rounded-[var(--radius-sm)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-secondary))] p-1">
              <button
                type="button"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= MIN_QUANTITY || isDisabled}
                aria-label="Kurangi jumlah"
                className="grid h-9 w-9 place-items-center rounded-lg text-lg text-[rgb(var(--color-text))] transition-colors hover:bg-[rgb(var(--color-surface))] disabled:cursor-not-allowed disabled:opacity-40"
              >
                −
              </button>
              <span
                aria-label={`Jumlah ${quantity}`}
                className="grid min-w-8 place-items-center px-1 text-sm font-semibold text-[rgb(var(--color-text))]"
              >
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= MAX_QUANTITY || isDisabled}
                aria-label="Tambah jumlah"
                className="grid h-9 w-9 place-items-center rounded-lg text-lg text-[rgb(var(--color-text))] transition-colors hover:bg-[rgb(var(--color-surface))] disabled:cursor-not-allowed disabled:opacity-40"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isDisabled}
              aria-label={`Tambah ${productName} ke keranjang`}
              className="min-h-11 flex-1 rounded-[var(--radius-sm)] bg-[rgb(var(--color-primary))] px-4 text-sm font-semibold text-white transition-colors hover:bg-[rgb(var(--color-primary-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {added ? (
                <span className="inline-flex items-center justify-center gap-2"><Check size={17} strokeWidth={2.5} /> Ditambahkan ke keranjang</span>
              ) : onAddToCart ? (
                <span className="inline-flex items-center justify-center gap-2"><ShoppingBag size={17} /> Tambah ke keranjang</span>
              ) : "Keranjang segera tersedia"}
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[11px] leading-4 text-[rgb(var(--color-text-subtle))]">
            <span className="truncate">{selectedVariant ? "Varian terpilih" : "Produk"}</span>
            <span className="shrink-0 font-semibold text-[rgb(var(--color-text-muted))]">
              {formatMoney(activePrice)} / item
            </span>
          </div>

          {!onAddToCart ? (
            <p className="mt-2 px-1 text-[10px] leading-4 text-[rgb(var(--color-text-subtle))]">
              Aksi transaksi sengaja belum diaktifkan. Cart dan inventory menjadi bagian fase Commerce berikutnya.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
