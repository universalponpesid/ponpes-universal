"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { CartAvailabilityStatus, CartItemAvailability, CartReconciliation } from "@/core/cart";
import { formatMoney } from "@/core/money";
import { cloudinaryImage } from "@/infrastructure/cloudinary";
import { useCart } from "./CartProvider";

type ValidationItem = {
  id: string;
  availability?: CartItemAvailability;
};

type ValidationResponse = {
  subtotal?: number;
  itemCount?: number;
  items?: ValidationItem[];
  error?: string;
};

function availabilityLabel(status: CartAvailabilityStatus): string {
  switch (status) {
    case "available":
      return "Tersedia";
    case "insufficient":
      return "Stok tidak mencukupi";
    case "inactive":
      return "Stok tidak aktif";
    case "untracked":
      return "Stok belum tersinkron";
  }
}

function availabilityClass(status: CartAvailabilityStatus): string {
  switch (status) {
    case "available":
      return "bg-[rgb(var(--color-primary-soft))] text-[rgb(var(--color-primary))]";
    case "insufficient":
    case "inactive":
      return "bg-[rgb(var(--color-sale-soft))] text-[rgb(var(--color-sale))]";
    case "untracked":
      return "bg-[rgb(var(--color-surface-secondary))] text-[rgb(var(--color-text-muted))]";
  }
}

export function CartPage() {
  const { cart, subtotalSnapshot, updateQuantity, applyReconciliation, removeItem, clearCart } = useCart();
  const [availabilityByItemId, setAvailabilityByItemId] = useState<Record<string, CartItemAvailability>>({});
  const [validation, setValidation] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [reconciliation, setReconciliation] = useState<CartReconciliation | null>(null);

  const validateCart = useCallback(async () => {
    if (cart.items.length === 0) {
      setAvailabilityByItemId({});
      setValidation(null);
      return;
    }

    setValidating(true);
    setValidation(null);

    try {
      const response = await fetch("/api/cart/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cart),
      });
      const payload = (await response.json()) as ValidationResponse;
      if (!response.ok) throw new Error(payload.error ?? "Keranjang tidak dapat divalidasi.");

      const nextAvailability: Record<string, CartItemAvailability> = {};
      for (const item of payload.items ?? []) {
        if (item.availability) nextAvailability[item.id] = item.availability;
      }
      setAvailabilityByItemId(nextAvailability);

      const unavailableCount = Object.values(nextAvailability).filter(
        (item) => item.status === "insufficient" || item.status === "inactive",
      ).length;

      if (unavailableCount > 0) {
        setValidation(`${unavailableCount} item perlu disesuaikan sebelum checkout.`);
      } else {
        setValidation(
          `Harga dan ketersediaan server diperiksa: ${formatMoney(payload.subtotal ?? 0)} · ${payload.itemCount ?? 0} item.`,
        );
      }
    } catch (error) {
      setAvailabilityByItemId({});
      setValidation(error instanceof Error ? error.message : "Keranjang tidak dapat divalidasi.");
    } finally {
      setValidating(false);
    }
  }, [cart]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void validateCart();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [validateCart]);

  const reconcileCart = useCallback(async () => {
    if (cart.items.length === 0) {
      setReconciliation(null);
      return;
    }

    setReconciling(true);
    try {
      const response = await fetch("/api/cart/reconcile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cart),
      });
      const payload = (await response.json()) as CartReconciliation & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Keranjang tidak dapat disinkronkan.");
      setReconciliation(payload);
    } catch (error) {
      setValidation(error instanceof Error ? error.message : "Keranjang tidak dapat disinkronkan.");
    } finally {
      setReconciling(false);
    }
  }, [cart]);

  const handleApplyReconciliation = useCallback(() => {
    if (!reconciliation) return;
    applyReconciliation(reconciliation);
    setReconciliation(null);
  }, [applyReconciliation, reconciliation]);

  if (cart.items.length === 0) {
    return (
      <main className="container-commerce py-16 sm:py-24">
        <div className="mx-auto max-w-xl rounded-[var(--radius-xl)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-8 text-center shadow-[var(--shadow-sm)] sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--color-primary))]">Keranjang</p>
          <h1 className="mt-3 font-[var(--font-heading)] text-2xl font-semibold text-[rgb(var(--color-text))] sm:text-3xl">Keranjang masih kosong</h1>
          <p className="mt-3 text-sm leading-6 text-[rgb(var(--color-text-muted))]">Pilih produk yang ingin kamu bawa ke proses checkout.</p>
          <Link href="/produk" className="mt-7 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] bg-[rgb(var(--color-primary))] px-5 text-sm font-semibold text-white">Belanja sekarang</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container-commerce py-8 sm:py-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--color-primary))]">Cart</p>
          <h1 className="mt-1 font-[var(--font-heading)] text-2xl font-semibold text-[rgb(var(--color-text))] sm:text-3xl">Keranjang belanja</h1>
        </div>
        <button type="button" onClick={clearCart} className="self-start text-xs font-semibold text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-primary))]">Kosongkan</button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-3">
          {cart.items.map((item) => {
            const availability = availabilityByItemId[item.id];
            const maxQuantity = availability?.status === "available" ? Math.min(99, availability.available ?? 99) : 99;
            const plusDisabled = item.quantity >= maxQuantity || validating;

            return (
              <article key={item.id} className="rounded-[var(--radius-lg)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4 sm:p-5">
                <div className="flex gap-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[rgb(var(--color-surface-secondary))]">
                    {item.imagePublicId ? <img src={cloudinaryImage(item.imagePublicId, "thumb")} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-semibold text-[rgb(var(--color-text))]">{item.productName}</h2>
                        {item.variantLabel ? <p className="mt-1 text-xs text-[rgb(var(--color-text-muted))]">{item.variantLabel}</p> : null}
                      </div>
                      {availability ? (
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${availabilityClass(availability.status)}`}>
                          {availabilityLabel(availability.status)}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-sm font-semibold text-[rgb(var(--color-primary))]">{formatMoney(item.unitPriceSnapshot)}</p>

                    {availability?.status === "available" ? (
                      <p className="mt-1 text-[11px] text-[rgb(var(--color-text-subtle))]">Tersedia {availability.available} unit</p>
                    ) : null}
                    {availability?.status === "insufficient" ? (
                      <p className="mt-1 text-[11px] leading-4 text-[rgb(var(--color-sale))]">Maksimal yang tersedia saat ini {availability.available ?? 0} unit.</p>
                    ) : null}

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center rounded-lg border border-[rgb(var(--color-border))] p-1">
                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1 || validating} aria-label={`Kurangi ${item.productName}`} className="grid h-8 w-8 place-items-center disabled:opacity-40">−</button>
                        <span className="min-w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={plusDisabled} aria-label={`Tambah ${item.productName}`} className="grid h-8 w-8 place-items-center disabled:opacity-40">+</button>
                      </div>
                      <button type="button" onClick={() => removeItem(item.id)} className="text-xs font-semibold text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-primary))]">Hapus</button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <aside className="h-fit rounded-[var(--radius-lg)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-5 shadow-[var(--shadow-sm)] lg:sticky lg:top-6">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[rgb(var(--color-primary))]">Ringkasan</p>
          <div className="mt-5 flex items-center justify-between gap-4 border-b border-[rgb(var(--color-border))] pb-4 text-sm">
            <span className="text-[rgb(var(--color-text-muted))]">Subtotal sementara</span>
            <strong className="text-[rgb(var(--color-text))]">{formatMoney(subtotalSnapshot)}</strong>
          </div>
          <p className="mt-4 text-xs leading-5 text-[rgb(var(--color-text-subtle))]">Harga di browser adalah snapshot untuk UX. Harga dan ketersediaan akan dihitung ulang server sebelum transaksi.</p>
          <button type="button" onClick={() => void validateCart()} disabled={validating || reconciling} className="mt-5 min-h-11 w-full rounded-[var(--radius-sm)] border border-[rgb(var(--color-primary))] px-4 text-sm font-semibold text-[rgb(var(--color-primary))] disabled:opacity-50">{validating ? "Memeriksa…" : "Periksa harga & ketersediaan"}</button>
          <button type="button" onClick={() => void reconcileCart()} disabled={reconciling || validating} className="mt-2 min-h-11 w-full rounded-[var(--radius-sm)] border border-[rgb(var(--color-border))] px-4 text-sm font-semibold text-[rgb(var(--color-text))] disabled:opacity-50">{reconciling ? "Menyinkronkan…" : "Sinkronkan perubahan produk"}</button>
          {validation ? <p className="mt-3 rounded-lg bg-[rgb(var(--color-surface-secondary))] p-3 text-xs leading-5 text-[rgb(var(--color-text-muted))]">{validation}</p> : null}
          {reconciliation?.hasChanges ? (
            <div className="mt-3 rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-secondary))] p-3">
              <p className="text-xs font-semibold text-[rgb(var(--color-text))]">Ada perubahan pada keranjang</p>
              <ul className="mt-2 space-y-1 text-xs leading-5 text-[rgb(var(--color-text-muted))]">
                {reconciliation.items.flatMap((item) => item.issues).map((issue, index) => (
                  <li key={`${issue.itemId}-${issue.code}-${index}`}>• {issue.message}</li>
                ))}
              </ul>
              <button type="button" onClick={handleApplyReconciliation} className="mt-3 min-h-10 w-full rounded-[var(--radius-sm)] bg-[rgb(var(--color-primary))] px-4 text-xs font-semibold text-white">Terapkan perubahan</button>
            </div>
          ) : null}
          <Link href="/checkout" className="mt-3 flex min-h-11 w-full items-center justify-center rounded-[var(--radius-sm)] bg-[rgb(var(--color-primary))] px-4 text-sm font-semibold text-white">Checkout</Link>
        </aside>
      </div>
    </main>
  );
}
