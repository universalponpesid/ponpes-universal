import Link from "next/link";
import { ArrowRight, Search, SlidersHorizontal } from "lucide-react";

import { ProductGrid } from "@/components/catalog/ProductGrid";
import { storeConfig } from "@/config/store";
import { toProductCardViewModel } from "@/core/catalog/view-models";
import { getCommerceConfig } from "@/infrastructure/config/commerce-config";
import { createTenantCommerceServices } from "@/infrastructure/tenancy";

// Product data is tenant-scoped and depends on runtime server configuration.
// Do not prerender this route during `next build` without deployment env vars.
export const dynamic = "force-dynamic";

type SearchParams = { q?: string; kategori?: string; sort?: string; page?: string };

function safePage(value?: string): number {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) ? Math.max(1, Math.min(1000, page)) : 1;
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const commerce = getCommerceConfig();
  if (commerce.mode === "marketplace") {
    return <main className="container-commerce py-8 sm:py-12"><section className="rounded-[24px] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-6 sm:p-9"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[rgb(var(--color-primary))]">Katalog marketplace</p><h1 className="mt-3 font-[var(--font-heading)] text-3xl font-semibold tracking-tight text-[rgb(var(--color-text))]">Katalog lintas toko sedang disiapkan</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-[rgb(var(--color-text-muted))]">Rute katalog multi-tenant akan diaktifkan setelah indeks katalog dan URL produk berbasis tenant siap. Kami tidak menampilkan katalog satu toko seolah-olah merupakan katalog seluruh marketplace.</p><Link href="/" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[rgb(var(--color-primary))] px-5 text-sm font-semibold text-white">Kembali ke beranda <ArrowRight size={16} /></Link></section></main>;
  }

  const { tenant, catalogService } = await createTenantCommerceServices(commerce.defaultTenantId);
  const page = await catalogService.queryProducts({
    tenantId: tenant.tenantId,
    search: searchParams.q,
    categorySlug: searchParams.kategori,
    sort: searchParams.sort === "harga-terendah" ? "price_asc" : searchParams.sort === "harga-tertinggi" ? "price_desc" : "relevance",
    page: safePage(searchParams.page),
    pageSize: 12,
  });
  const categories = (await catalogService.getCategories(tenant.tenantId)).filter((category) => category.status === "active");
  const queryBase = new URLSearchParams();
  if (searchParams.q) queryBase.set("q", searchParams.q);
  if (searchParams.kategori) queryBase.set("kategori", searchParams.kategori);
  if (searchParams.sort) queryBase.set("sort", searchParams.sort);

  return (
    <main className="container-commerce py-6 sm:py-10">
      <header className="rounded-[24px] border border-[rgb(var(--color-border))] bg-[linear-gradient(125deg,rgb(var(--color-surface))_0%,rgb(var(--color-primary-soft))_100%)] px-5 py-7 sm:px-9 sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--color-primary))]">Katalog resmi</p>
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="font-[var(--font-heading)] text-3xl font-semibold tracking-tight text-[rgb(var(--color-text))] sm:text-4xl">Semua produk</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[rgb(var(--color-text-muted))]">Temukan produk yang sesuai kebutuhan Anda dari {storeConfig.name}.</p></div><p className="text-sm font-medium text-[rgb(var(--color-text-muted))]">{page.total} produk ditemukan</p></div>
        <form action="/produk" className="mt-6 grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px_auto]">
          <label className="flex min-h-12 items-center gap-2 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-background))] px-4"><Search size={17} className="shrink-0 text-[rgb(var(--color-text-subtle))]" /><input name="q" defaultValue={searchParams.q ?? ""} placeholder="Cari nama atau kata kunci produk" className="min-w-0 flex-1 bg-transparent text-sm text-[rgb(var(--color-text))] outline-none placeholder:text-[rgb(var(--color-text-subtle))]" /></label>
          <label className="flex min-h-12 items-center gap-2 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-background))] px-3"><SlidersHorizontal size={16} className="text-[rgb(var(--color-text-subtle))]" /><select name="kategori" defaultValue={searchParams.kategori ?? ""} className="min-w-0 flex-1 bg-transparent text-sm text-[rgb(var(--color-text))] outline-none"><option value="">Semua kategori</option>{categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}</select></label>
          <button type="submit" className="min-h-12 rounded-xl bg-[rgb(var(--color-primary))] px-6 text-sm font-semibold text-white transition hover:bg-[rgb(var(--color-primary-hover))]">Cari produk</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2"><Link href="/produk" className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition ${!searchParams.sort ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary-soft))] text-[rgb(var(--color-primary))]" : "border-[rgb(var(--color-border))] bg-[rgb(var(--color-background))] text-[rgb(var(--color-text-muted))]"}`}>Relevan</Link><Link href={`/produk?${new URLSearchParams({ ...(searchParams.q ? { q: searchParams.q } : {}), ...(searchParams.kategori ? { kategori: searchParams.kategori } : {}), sort: "harga-terendah" }).toString()}`} className="rounded-full border border-[rgb(var(--color-border))] bg-[rgb(var(--color-background))] px-3.5 py-2 text-xs font-semibold text-[rgb(var(--color-text-muted))] transition hover:border-[rgb(var(--color-primary))]">Harga terendah</Link><Link href={`/produk?${new URLSearchParams({ ...(searchParams.q ? { q: searchParams.q } : {}), ...(searchParams.kategori ? { kategori: searchParams.kategori } : {}), sort: "harga-tertinggi" }).toString()}`} className="rounded-full border border-[rgb(var(--color-border))] bg-[rgb(var(--color-background))] px-3.5 py-2 text-xs font-semibold text-[rgb(var(--color-text-muted))] transition hover:border-[rgb(var(--color-primary))]">Harga tertinggi</Link></div>
      </header>

      <section className="mt-8 sm:mt-10" aria-label="Daftar produk"><ProductGrid products={page.items.map(toProductCardViewModel)} emptyMessage="Produk tidak ditemukan. Coba ubah kata kunci atau kategori pencarian." showBrand imageAspect="portrait" /></section>
      {page.pageCount > 1 ? <nav aria-label="Navigasi halaman produk" className="mt-10 border-t border-[rgb(var(--color-border))] pt-6">
        <p className="mb-4 text-center text-xs text-[rgb(var(--color-text-muted))]">Menampilkan {((page.page - 1) * page.pageSize) + 1}–{Math.min(page.page * page.pageSize, page.total)} dari {page.total} produk</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {page.page > 1 ? <Link aria-label="Halaman sebelumnya" href={`/produk?${new URLSearchParams({ ...Object.fromEntries(queryBase), page: String(page.page - 1) }).toString()}`} className="inline-flex min-h-10 items-center rounded-full border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-4 text-sm font-medium text-[rgb(var(--color-text))] transition hover:border-[rgb(var(--color-primary))]">Sebelumnya</Link> : null}
          {Array.from({ length: page.pageCount }, (_, index) => index + 1).filter((number) => number === 1 || number === page.pageCount || Math.abs(number - page.page) <= 1).map((number, index, visible) => {
            const previous = visible[index - 1];
            const href = `/produk?${new URLSearchParams({ ...Object.fromEntries(queryBase), page: String(number) }).toString()}`;
            return <span key={number} className="contents">{previous && number - previous > 1 ? <span aria-hidden="true" className="px-1 text-sm text-[rgb(var(--color-text-muted))]">…</span> : null}<Link aria-current={number === page.page ? "page" : undefined} href={href} className={`inline-flex size-10 items-center justify-center rounded-full border text-sm font-semibold transition ${number === page.page ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))] text-white shadow-sm" : "border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))] hover:border-[rgb(var(--color-primary))]"}`}>{number}</Link></span>;
          })}
          {page.page < page.pageCount ? <Link aria-label="Halaman berikutnya" href={`/produk?${new URLSearchParams({ ...Object.fromEntries(queryBase), page: String(page.page + 1) }).toString()}`} className="inline-flex min-h-10 items-center rounded-full border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-4 text-sm font-medium text-[rgb(var(--color-text))] transition hover:border-[rgb(var(--color-primary))]">Berikutnya</Link> : null}
        </div>
      </nav> : null}
    </main>
  );
}
