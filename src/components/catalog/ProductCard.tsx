import Image from "next/image";
import Link from "next/link";

import type { ProductCardViewModel } from "@/core/catalog/view-models";
import { formatMoney } from "@/core/money";
import { cloudinaryImage } from "@/infrastructure/cloudinary";

export type ProductCardImageAspect = "square" | "portrait" | "landscape";

export type ProductCardProps = {
  product: ProductCardViewModel;
  href?: string;
  priority?: boolean;
  imageAspect?: ProductCardImageAspect;
  showBrand?: boolean;
  showType?: boolean;
  className?: string;
};

const IMAGE_ASPECT_CLASSES: Record<ProductCardImageAspect, string> = {
  square: "aspect-square",
  portrait: "aspect-[4/5]",
  landscape: "aspect-[4/3]",
};

const PRODUCT_TYPE_LABELS: Record<ProductCardViewModel["type"], string> = {
  physical: "Produk",
  digital: "Digital",
  service: "Layanan",
  property: "Properti",
  vehicle: "Kendaraan",
};

function isOnSale(price: number, compareAtPrice?: number): boolean {
  return typeof compareAtPrice === "number" && compareAtPrice > price;
}

function salePercentage(price: number, compareAtPrice?: number): number | null {
  if (!isOnSale(price, compareAtPrice) || !compareAtPrice) {
    return null;
  }

  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

export function ProductCard({
  product,
  href = `/produk/${product.slug}`,
  priority = false,
  imageAspect = "portrait",
  showBrand = true,
  showType = false,
  className = "",
}: ProductCardProps) {
  const imageUrl = product.imagePublicId
    ? cloudinaryImage(product.imagePublicId, "card")
    : null;
  const sale = isOnSale(product.price, product.compareAtPrice);
  const discount = salePercentage(product.price, product.compareAtPrice);

  return (
    <article
      className={`group min-w-0 ${className}`}
      data-product-id={product.id}
    >
      <Link
        href={href}
        className="block rounded-[var(--radius-md)] focus-visible:outline-none"
        aria-label={`Lihat detail ${product.name}`}
      >
        <div
          className={`relative overflow-hidden rounded-[var(--radius-md)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-secondary))] ${IMAGE_ASPECT_CLASSES[imageAspect]}`}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              priority={priority}
              sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 ease-[var(--ease-standard)] group-hover:scale-[1.025]"
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center bg-[rgb(var(--color-surface-secondary))] px-5 text-center"
              aria-hidden="true"
            >
              <span className="font-[var(--font-heading)] text-sm font-medium text-[rgb(var(--color-text-subtle))]">
                {product.name}
              </span>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2.5 sm:p-3">
            <div className="flex flex-wrap gap-1.5">
              {sale && discount ? (
                <span className="rounded-full bg-[rgb(var(--color-sale))] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white sm:text-[11px]">
                  -{discount}%
                </span>
              ) : null}

              {showType ? (
                <span className="rounded-full border border-white/60 bg-black/45 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm sm:text-[11px]">
                  {PRODUCT_TYPE_LABELS[product.type]}
                </span>
              ) : null}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden translate-y-2 px-3 pb-3 opacity-0 transition-all duration-300 ease-[var(--ease-standard)] group-hover:translate-y-0 group-hover:opacity-100 sm:block">
            <span className="inline-flex rounded-full bg-[rgb(var(--color-surface))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--color-text))] shadow-[var(--shadow-sm)] backdrop-blur-sm">
              Lihat detail
            </span>
          </div>
        </div>

        <div className="pt-3 sm:pt-3.5">
          {showBrand && product.brand ? (
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--color-text-subtle))] sm:text-[11px]">
              {product.brand}
            </p>
          ) : null}

          <h3 className="mt-1 line-clamp-2 min-h-[2.75rem] font-[var(--font-heading)] text-sm font-semibold leading-[1.35] tracking-[-0.015em] text-[rgb(var(--color-text))] transition-colors group-hover:text-[rgb(var(--color-primary))] sm:text-[15px]">
            {product.name}
          </h3>

          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span
              className={`text-sm font-bold tracking-[-0.015em] sm:text-[15px] ${sale ? "text-[rgb(var(--color-sale))]" : "text-[rgb(var(--color-text))]"}`}
            >
              {formatMoney(product.price)}
            </span>

            {sale && product.compareAtPrice ? (
              <span className="text-[11px] font-medium text-[rgb(var(--color-text-subtle))] line-through sm:text-xs">
                {formatMoney(product.compareAtPrice)}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}
