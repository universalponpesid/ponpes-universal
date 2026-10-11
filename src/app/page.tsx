import Link from "next/link";
import { ArrowRight, BadgeCheck, Box, HeartHandshake, ShieldCheck, Sparkles, Truck } from "lucide-react";

import { ProductGrid } from "@/components/catalog/ProductGrid";
import { storeConfig } from "@/config/store";
import { toProductCardViewModel } from "@/core/catalog/view-models";
import type { Product, ProductCategory } from "@/core/catalog/types";
import { getCommerceConfig } from "@/infrastructure/config/commerce-config";
import { createTenantCommerceServices } from "@/infrastructure/tenancy";

const benefits = [
  { icon: ShieldCheck, title: "Transaksi lebih nyaman", description: "Alur belanja dirancang jelas dari produk hingga pembayaran." },
  { icon: BadgeCheck, title: "Informasi transparan", description: "Detail produk dan ringkasan pesanan mudah ditinjau." },
  { icon: Truck, title: "Pilihan pengiriman", description: "Opsi pengiriman ditampilkan sesuai layanan yang tersedia." },
  { icon: HeartHandshake, title: "Dukungan pelanggan", description: "Bantuan tersedia melalui kanal resmi toko." },
];

function StoreHero() {
  return (
    <section className="relative isolate overflow-hidden rounded-[28px] border border-[rgb(var(--color-border))] bg-[linear-gradient(125deg,rgb(var(--color-surface))_0%,rgb(var(--color-primary-soft))_100%)] px-5 py-10 sm:px-9 sm:py-14 lg:px-14 lg:py-16">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[1px] border-[rgb(var(--color-primary))]/15 sm:h-80 sm:w-80" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-5 -top-9 h-48 w-48 rounded-full border-[1px] border-[rgb(var(--color-primary))]/10 sm:h-64 sm:w-64" />
      <div className="relative max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--color-primary))]/20 bg-[rgb(var(--color-background))]/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[rgb(var(--color-primary))] backdrop-blur sm:text-xs">
          <Sparkles size={14} aria-hidden="true" /> Official online store
        </span>
        <h1 className="mt-5 max-w-xl font-[var(--font-heading)] text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-[rgb(var(--color-text))] sm:text-5xl lg:text-[58px]">
          Belanja pilihan terbaik, dengan pengalaman yang lebih nyaman.
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-[rgb(var(--color-text-muted))] sm:text-base sm:leading-8">
          {storeConfig.description} Temukan produk pilihan, periksa detailnya, lalu selesaikan pesanan dengan alur yang praktis dan transparan.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/produk" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[rgb(var(--color-primary))] px-6 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:bg-[rgb(var(--color-primary-hover))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--color-primary))]">
            Jelajahi produk <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link href="/keranjang" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[rgb(var(--color-border-strong))] bg-[rgb(var(--color-background))]/75 px-6 text-sm font-semibold text-[rgb(var(--color-text))] transition hover:border-[rgb(var(--color-primary))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--color-primary))]">
            Lihat keranjang
          </Link>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-[rgb(var(--color-text-muted))] sm:text-sm">
          <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--color-primary))]" /> Produk pilihan</span>
          <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--color-primary))]" /> Checkout praktis</span>
          <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--color-primary))]" /> Informasi jelas</span>
        </div>
      </div>
    </section>
  );
}

function MarketplaceSetupNotice() {
  return (
    <section className="rounded-[24px] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-6 sm:p-9">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--color-primary))]">Marketplace mode</p>
      <h1 className="mt-3 max-w-2xl font-[var(--font-heading)] text-3xl font-semibold tracking-tight text-[rgb(var(--color-text))] sm:text-4xl">Fondasi marketplace sudah dipilih.</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-[rgb(var(--color-text-muted))]">Katalog lintas tenant dan halaman toko perlu diaktifkan bersama tenant-aware routing sebelum mode marketplace digunakan untuk transaksi nyata. Untuk menjaga batas data dan harga tetap aman, mode ini tidak menampilkan katalog satu tenant sebagai katalog seluruh marketplace.</p>
      <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[rgb(var(--color-surface-secondary))] px-3.5 py-2 text-xs font-medium text-[rgb(var(--color-text-muted))]"><Box size={15} aria-hidden="true" /> Menunggu integrasi katalog marketplace</div>
    </section>
  );
}

export default async function HomePage() {
  const commerceConfig = getCommerceConfig();
  if (commerceConfig.mode === "marketplace") {
    return <main className="container-commerce py-8 sm:py-12"><MarketplaceSetupNotice /></main>;
  }

  let products: Product[] = [];
  let categories: ProductCategory[] = [];
  try {
    const { tenant, catalogService } = await createTenantCommerceServices(commerceConfig.defaultTenantId);
    const [tenantProducts, tenantCategories] = await Promise.all([
      catalogService.getProducts(tenant.tenantId),
      catalogService.getCategories(tenant.tenantId),
    ]);
    products = tenantProducts.filter((product) => product.status === "active").slice(0, 8);
    categories = tenantCategories.filter((category) => category.status === "active").slice(0, 8);
  } catch {
    // The storefront remains navigable during a temporary catalog/Sheets outage.
    products = [];
    categories = [];
  }

  return (
    <main className="container-commerce space-y-12 py-5 sm:space-y-16 sm:py-8 lg:space-y-20">
      <StoreHero />

      <section aria-label="Keunggulan toko" className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {benefits.map(({ icon: Icon, title, description }) => (
          <div key={title} className="rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4 sm:p-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[rgb(var(--color-primary-soft))] text-[rgb(var(--color-primary))]"><Icon size={19} aria-hidden="true" /></span>
            <h2 className="mt-4 text-sm font-semibold tracking-tight text-[rgb(var(--color-text))] sm:text-base">{title}</h2>
            <p className="mt-1.5 text-xs leading-5 text-[rgb(var(--color-text-muted))] sm:text-sm sm:leading-6">{description}</p>
          </div>
        ))}
      </section>

      {categories.length > 0 ? (
        <section>
          <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
            <div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[rgb(var(--color-primary))]">Temukan lebih mudah</p><h2 className="mt-2 font-[var(--font-heading)] text-2xl font-semibold tracking-tight text-[rgb(var(--color-text))] sm:text-3xl">Jelajahi kategori</h2></div>
            <Link href="/produk" className="inline-flex shrink-0 items-center gap-1.5 pb-1 text-xs font-semibold text-[rgb(var(--color-primary))] sm:text-sm">Semua produk <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((category, index) => (
              <Link key={category.id} href={`/produk?kategori=${encodeURIComponent(category.slug)}`} className="group flex min-h-24 items-center justify-between gap-3 rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4 transition hover:-translate-y-0.5 hover:border-[rgb(var(--color-primary))]/50 hover:shadow-[var(--shadow-sm)] sm:min-h-28 sm:p-5">
                <span><span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--color-text-subtle))]">Kategori {String(index + 1).padStart(2, "0")}</span><span className="mt-2 block font-[var(--font-heading)] text-sm font-semibold text-[rgb(var(--color-text))] sm:text-base">{category.name}</span></span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[rgb(var(--color-surface-secondary))] text-[rgb(var(--color-text-muted))] transition group-hover:bg-[rgb(var(--color-primary-soft))] group-hover:text-[rgb(var(--color-primary))]"><ArrowRight size={16} aria-hidden="true" /></span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
          <div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[rgb(var(--color-primary))]">Pilihan untuk Anda</p><h2 className="mt-2 font-[var(--font-heading)] text-2xl font-semibold tracking-tight text-[rgb(var(--color-text))] sm:text-3xl">Produk pilihan</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[rgb(var(--color-text-muted))]">Koleksi produk aktif dari toko, disajikan dengan informasi harga yang mudah ditinjau.</p></div>
          <Link href="/produk" className="inline-flex shrink-0 items-center gap-1.5 pb-1 text-xs font-semibold text-[rgb(var(--color-primary))] sm:text-sm">Lihat katalog <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
        <ProductGrid products={products.map(toProductCardViewModel)} emptyMessage="Produk belum tersedia untuk ditampilkan." showBrand imageAspect="portrait" />
      </section>

      <section className="overflow-hidden rounded-[24px] bg-[rgb(var(--color-text))] px-5 py-8 text-[rgb(var(--color-background))] sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-9 sm:py-10">
        <div className="max-w-xl"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/60">Mulai berbelanja</p><h2 className="mt-2 font-[var(--font-heading)] text-2xl font-semibold tracking-tight sm:text-3xl">Temukan yang Anda butuhkan.</h2><p className="mt-2 text-sm leading-6 text-white/70">Lihat katalog, bandingkan detail produk, dan lanjutkan ke checkout kapan saja.</p></div>
        <Link href="/produk" className="mt-5 inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[rgb(var(--color-text))] transition hover:-translate-y-0.5 sm:mt-0">Lihat semua produk <ArrowRight size={16} aria-hidden="true" /></Link>
      </section>
    </main>
  );
}
