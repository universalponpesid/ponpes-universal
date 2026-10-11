"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductGallery } from "./ProductGallery";
import { ProductVariantSelector } from "./ProductVariantSelector";
import { StickyAddToCart, type AddToCartPayload } from "./StickyAddToCart";
import { ProductCard } from "./ProductCard";
import type { ProductCardViewModel, ProductDetailViewModel, ProductVariantViewModel } from "@/core/catalog/view-models";
import { formatMoney } from "@/core/money";

export type ProductDetailProps = {
  product: ProductDetailViewModel;
  relatedProducts?: readonly ProductCardViewModel[];
  onAddToCart?: (payload: AddToCartPayload) => void;
};

function discountPercentage(price: number, compareAtPrice?: number): number | null {
  if (!compareAtPrice || compareAtPrice <= price) return null;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

function buildGalleryImages(productName: string, galleryPublicIds: readonly string[], primaryImage?: string) {
  const ids = [primaryImage, ...galleryPublicIds].filter((value): value is string => Boolean(value));
  return Array.from(new Set(ids)).map((publicId, index) => ({ id: `${publicId}-${index}`, publicId, alt: `${productName} — foto ${index + 1}` }));
}

export function ProductDetail({ product, relatedProducts = [], onAddToCart }: ProductDetailProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantViewModel | undefined>(product.variants[0]);
  const activePrice = selectedVariant?.price ?? product.product.price;
  const activeCompareAtPrice = selectedVariant?.compareAtPrice ?? product.product.compareAtPrice;
  const discount = discountPercentage(activePrice, activeCompareAtPrice);
  const galleryImages = useMemo(() => buildGalleryImages(product.product.name, product.product.galleryPublicIds, product.product.imagePublicId), [product.product.galleryPublicIds, product.product.imagePublicId, product.product.name]);

  return (
    <main className="bg-[rgb(var(--color-background))]">
      <div className="container-commerce pb-36 pt-5 sm:pb-40 sm:pt-8 lg:pb-20">
        <nav className="mb-6 flex items-center gap-2 overflow-x-auto whitespace-nowrap text-xs text-[rgb(var(--color-text-muted))] sm:mb-8 sm:text-sm">
          <Link href="/" className="hover:text-[rgb(var(--color-primary))]">Beranda</Link><span aria-hidden="true">/</span>
          {product.category ? <><Link href={`/produk?category=${encodeURIComponent(product.category.slug)}`} className="hover:text-[rgb(var(--color-primary))]">{product.category.name}</Link><span aria-hidden="true">/</span></> : null}
          <span className="truncate text-[rgb(var(--color-text-subtle))]">{product.product.name}</span>
        </nav>

        <section className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)] lg:items-start lg:gap-12 xl:gap-16">
          <ProductGallery productName={product.product.name} images={galleryImages} variantImagePublicId={selectedVariant?.imagePublicId} />
          <div className="min-w-0 lg:sticky lg:top-24">
            <div className="space-y-6">
              <div className="space-y-3">
                {product.product.brand ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--color-primary))]">{product.product.brand}</p> : null}
                <h1 className="font-[var(--font-heading)] text-2xl font-semibold tracking-[-0.025em] text-[rgb(var(--color-text))] sm:text-3xl lg:text-[38px] lg:leading-[1.12]">{product.product.name}</h1>
                {product.product.shortDescription ? <p className="max-w-2xl text-sm leading-7 text-[rgb(var(--color-text-muted))] sm:text-base">{product.product.shortDescription}</p> : null}
              </div>

              <div className="flex flex-wrap items-end gap-x-3 gap-y-1 border-y border-[rgb(var(--color-border))] py-5">
                <span className="font-[var(--font-heading)] text-2xl font-semibold tracking-[-0.02em] text-[rgb(var(--color-text))] sm:text-3xl">{formatMoney(activePrice)}</span>
                {activeCompareAtPrice && activeCompareAtPrice > activePrice ? <><span className="pb-0.5 text-sm text-[rgb(var(--color-text-subtle))] line-through sm:text-base">{formatMoney(activeCompareAtPrice)}</span>{discount ? <span className="mb-0.5 rounded-full bg-[rgb(var(--color-sale-soft))] px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--color-sale))]">-{discount}%</span> : null}</> : null}
              </div>

              <ProductVariantSelector variants={product.variants} selectedVariantId={selectedVariant?.id} onChange={setSelectedVariant} />

              <StickyAddToCart
                productId={product.product.id}
                productName={product.product.name}
                price={product.product.price}
                selectedVariant={selectedVariant}
                onAddToCart={onAddToCart}
              />

              <div className="rounded-[var(--radius-md)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-secondary))] p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--color-text-subtle))]">Informasi produk</p>
                <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
                  <div><dt className="text-[rgb(var(--color-text-subtle))]">SKU</dt><dd className="mt-1 font-medium text-[rgb(var(--color-text))]">{selectedVariant?.sku ?? product.product.sku ?? "—"}</dd></div>
                  <div><dt className="text-[rgb(var(--color-text-subtle))]">Tipe</dt><dd className="mt-1 font-medium capitalize text-[rgb(var(--color-text))]">{product.product.type}</dd></div>
                  {product.product.weightGrams ? <div><dt className="text-[rgb(var(--color-text-subtle))]">Berat</dt><dd className="mt-1 font-medium text-[rgb(var(--color-text))]">{product.product.weightGrams.toLocaleString("id-ID")} g</dd></div> : null}
                  {product.category ? <div><dt className="text-[rgb(var(--color-text-subtle))]">Kategori</dt><dd className="mt-1 font-medium text-[rgb(var(--color-text))]">{product.category.name}</dd></div> : null}
                </dl>
              </div>

              <div className="rounded-[var(--radius-md)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4 sm:p-5">
                <div className="flex items-start gap-3"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[rgb(var(--color-primary-soft))] text-[rgb(var(--color-primary))]">✓</span><div><p className="text-sm font-semibold text-[rgb(var(--color-text))]">Pilihan produk yang aman dan transparan</p><p className="mt-1 text-xs leading-5 text-[rgb(var(--color-text-muted))]">Harga dan varian berasal dari katalog. Ketersediaan dan transaksi akan ditangani engine Commerce pada fase berikutnya.</p></div></div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14 border-t border-[rgb(var(--color-border))] pt-10 sm:mt-20 sm:pt-14">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
            <article className="min-w-0"><div className="border-b border-[rgb(var(--color-border))] pb-4"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[rgb(var(--color-primary))]">Detail</p><h2 className="mt-1 font-[var(--font-heading)] text-xl font-semibold text-[rgb(var(--color-text))] sm:text-2xl">Deskripsi produk</h2></div>{product.product.description ? <div className="mt-6 whitespace-pre-line text-sm leading-7 text-[rgb(var(--color-text-muted))] sm:text-base sm:leading-8">{product.product.description}</div> : <p className="mt-6 text-sm text-[rgb(var(--color-text-subtle))]">Deskripsi produk belum tersedia.</p>}</article>
            <aside className="rounded-[var(--radius-lg)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[rgb(var(--color-primary))]">Spesifikasi</p><dl className="mt-5 divide-y divide-[rgb(var(--color-border))]"><div className="flex items-start justify-between gap-4 py-3 first:pt-0"><dt className="text-sm text-[rgb(var(--color-text-muted))]">Kategori</dt><dd className="text-right text-sm font-medium text-[rgb(var(--color-text))]">{product.category?.name ?? "—"}</dd></div><div className="flex items-start justify-between gap-4 py-3"><dt className="text-sm text-[rgb(var(--color-text-muted))]">SKU</dt><dd className="text-right text-sm font-medium text-[rgb(var(--color-text))]">{selectedVariant?.sku ?? product.product.sku ?? "—"}</dd></div>{product.product.weightGrams ? <div className="flex items-start justify-between gap-4 py-3"><dt className="text-sm text-[rgb(var(--color-text-muted))]">Berat</dt><dd className="text-right text-sm font-medium text-[rgb(var(--color-text))]">{product.product.weightGrams.toLocaleString("id-ID")} g</dd></div> : null}</dl>{product.product.tags.length > 0 ? <div className="mt-5 flex flex-wrap gap-2 border-t border-[rgb(var(--color-border))] pt-5">{product.product.tags.map((tag) => <span key={tag} className="rounded-full bg-[rgb(var(--color-surface-secondary))] px-3 py-1.5 text-xs text-[rgb(var(--color-text-muted))]">{tag}</span>)}</div> : null}</aside>
          </div>
        </section>

        {relatedProducts.length > 0 ? <section className="mt-16 border-t border-[rgb(var(--color-border))] pt-10 sm:mt-20 sm:pt-14"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[rgb(var(--color-primary))]">Rekomendasi</p><h2 className="mt-1 font-[var(--font-heading)] text-xl font-semibold text-[rgb(var(--color-text))] sm:text-2xl">Produk terkait</h2></div>{product.category ? <Link href={`/produk?category=${encodeURIComponent(product.category.slug)}`} className="text-xs font-semibold text-[rgb(var(--color-primary))] hover:underline sm:text-sm">Lihat semua</Link> : null}</div><div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">{relatedProducts.map((item) => <ProductCard key={item.id} product={item} href={`/produk/${item.slug}`} />)}</div></section> : null}
      </div>
    </main>
  );
}
