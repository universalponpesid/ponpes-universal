import Link from "next/link";

import type { CategoryViewModel } from "@/core/catalog/view-models";

export type CategoryNavigationProps = {
  categories: readonly CategoryViewModel[];
  activeSlug?: string;
  allHref?: string;
  hrefBuilder?: (category: CategoryViewModel) => string;
  className?: string;
};

export function CategoryNavigation({
  categories,
  activeSlug,
  allHref = "/produk",
  hrefBuilder = (category) => `/kategori/${category.slug}`,
  className = "",
}: CategoryNavigationProps) {
  return (
    <nav
      aria-label="Kategori produk"
      className={`-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      <div className="flex w-max min-w-full items-center gap-2">
        <Link
          href={allHref}
          aria-current={!activeSlug ? "page" : undefined}
          className={[
            "inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition-colors",
            !activeSlug
              ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))] text-white"
              : "border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text-muted))] hover:border-[rgb(var(--color-border-strong))] hover:text-[rgb(var(--color-text))]",
          ].join(" ")}
        >
          Semua
        </Link>

        {categories.map((category) => {
          const active = category.slug === activeSlug;

          return (
            <Link
              key={category.id}
              href={hrefBuilder(category)}
              aria-current={active ? "page" : undefined}
              className={[
                "inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition-colors",
                active
                  ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))] text-white"
                  : "border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text-muted))] hover:border-[rgb(var(--color-border-strong))] hover:text-[rgb(var(--color-text))]",
              ].join(" ")}
            >
              {category.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
