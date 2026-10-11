import { Suspense } from "react";

import {
  catalogPreviewCategories as categories,
  catalogPreviewProducts as products,
} from "@/core/catalog/preview-fixtures";
import {
  CatalogSearch,
  CatalogToolbar,
  CategoryNavigation,
  ProductGrid,
} from "@/components/catalog";

export const metadata = {
  title: "Catalog UI Preview | Universal Mart",
  robots: { index: false, follow: false },
};

export default function CatalogUiPreviewPage() {
  return (
    <main className="container-commerce py-6 sm:py-10 lg:py-12">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--color-primary))]">
          Universal Mart · UI Preview
        </p>
        <h1 className="mt-3 font-[var(--font-heading)] text-3xl font-semibold tracking-[-0.035em] text-[rgb(var(--color-text))] sm:text-4xl">
          Temukan koleksi pilihan
        </h1>
        <p className="mt-4 text-sm leading-7 text-[rgb(var(--color-text-muted))] sm:text-base">
          Pratinjau pengalaman katalog dengan navigasi kategori, pencarian,
          pengurutan, dan halaman detail. Produk di halaman ini merupakan data
          demo khusus preview dan tidak masuk ke keranjang transaksi.
        </p>
      </header>

      <section className="mt-7 space-y-5 sm:mt-8">
        <CatalogSearch />
        <CategoryNavigation categories={categories} />
        <Suspense
          fallback={
            <div className="flex min-h-14 items-center justify-between border-y border-[rgb(var(--color-border))] py-3.5">
              <p className="text-xs text-[rgb(var(--color-text-muted))">{products.length} produk demo</p>
              <div className="h-10 w-32 animate-pulse rounded-full bg-[rgb(var(--color-surface-muted))]" aria-hidden="true" />
            </div>
          }
        >
          <CatalogToolbar total={products.length} />
        </Suspense>
        <ProductGrid
          products={products}
          hrefBuilder={(product) => `/catalog-ui-preview/${product.slug}`}
          showType
        />
      </section>
    </main>
  );
}
