import type { ProductCardViewModel } from "@/core/catalog/view-models";
import { ProductGrid } from "@/components/catalog";

const previewProducts: readonly ProductCardViewModel[] = [
  {
    id: "preview-01",
    slug: "kaos-universal-premium",
    name: "Kaos Universal Premium",
    brand: "Universal",
    type: "physical",
    price: 149000,
    compareAtPrice: 179000,
    shortDescription: "Kaos premium dengan material nyaman untuk aktivitas harian.",
  },
  {
    id: "preview-02",
    slug: "buku-agenda-universal",
    name: "Agenda Universal 2026",
    brand: "Universal",
    type: "physical",
    price: 89000,
  },
  {
    id: "preview-03",
    slug: "totebag-universal",
    name: "Totebag Kanvas Universal",
    brand: "Universal",
    type: "physical",
    price: 75000,
  },
  {
    id: "preview-04",
    slug: "mukena-travel-universal",
    name: "Mukena Travel Universal",
    brand: "Universal",
    type: "physical",
    price: 219000,
    compareAtPrice: 249000,
  },
];

export default function CatalogPreviewPage() {
  return (
    <main className="container-commerce py-10 sm:py-14 lg:py-20">
      <header className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--color-primary))]">
          Universal Mart · Phase 02.5
        </p>
        <h1 className="mt-3 font-[var(--font-heading)] text-3xl font-semibold tracking-[-0.035em] text-[rgb(var(--color-text))] sm:text-4xl">
          Product Card &amp; Grid
        </h1>
        <p className="mt-4 text-sm leading-7 text-[rgb(var(--color-text-muted))] sm:text-base">
          Development preview untuk memvalidasi responsive behavior dan visual
          language komponen Catalog sebelum dihubungkan ke data provider.
        </p>
      </header>

      <section className="mt-10 sm:mt-12">
        <ProductGrid products={previewProducts} />
      </section>
    </main>
  );
}
