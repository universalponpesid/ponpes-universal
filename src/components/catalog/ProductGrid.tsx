import type { ProductCardViewModel } from "@/core/catalog/view-models";

import { ProductCard, type ProductCardImageAspect } from "./ProductCard";

export type ProductGridProps = {
  products: readonly ProductCardViewModel[];
  emptyMessage?: string;
  hrefBuilder?: (product: ProductCardViewModel) => string;
  imageAspect?: ProductCardImageAspect;
  showBrand?: boolean;
  showType?: boolean;
  priorityCount?: number;
  className?: string;
};

export function ProductGrid({
  products,
  emptyMessage = "Belum ada produk yang tersedia.",
  hrefBuilder = (product) => `/produk/${product.slug}`,
  imageAspect = "portrait",
  showBrand = true,
  showType = false,
  priorityCount = 4,
  className = "",
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div
        className={`rounded-[var(--radius-lg)] border border-dashed border-[rgb(var(--color-border-strong))] bg-[rgb(var(--color-surface-secondary))] px-6 py-14 text-center ${className}`}
      >
        <p className="font-[var(--font-heading)] text-sm font-semibold text-[rgb(var(--color-text))]">
          {emptyMessage}
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[rgb(var(--color-text-muted))]">
          Silakan kembali lagi nanti untuk melihat koleksi terbaru.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-10 md:grid-cols-3 lg:gap-x-6 xl:grid-cols-4 ${className}`}
    >
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          href={hrefBuilder(product)}
          priority={index < priorityCount}
          imageAspect={imageAspect}
          showBrand={showBrand}
          showType={showType}
        />
      ))}
    </div>
  );
}
