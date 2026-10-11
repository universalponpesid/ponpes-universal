import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, PackageCheck, ShieldCheck } from "lucide-react";

import { catalogPreviewProducts } from "@/core/catalog/preview-fixtures";
import { formatMoney } from "@/core/money";

export const dynamicParams = false;

export function generateStaticParams() {
  return catalogPreviewProducts.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const product = catalogPreviewProducts.find((item) => item.slug === params.slug);
  return { title: product ? `${product.name} | Catalog Preview` : "Produk tidak ditemukan" };
}

export default function CatalogPreviewProductPage({ params }: { params: { slug: string } }) {
  const product = catalogPreviewProducts.find((item) => item.slug === params.slug);
  if (!product?.imagePublicId) notFound();

  const sale = typeof product.compareAtPrice === "number" && product.compareAtPrice > product.price;
  return (
    <main className="container-commerce py-6 sm:py-10 lg:py-12">
      <Link href="/catalog-ui-preview" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-[rgb(var(--color-text-muted))] transition hover:text-[rgb(var(--color-primary))]">
        <ArrowLeft size={16} /> Kembali ke katalog preview
      </Link>

      <div className="mt-5 grid gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:gap-12">
        <div className="relative aspect-square overflow-hidden rounded-[var(--radius-xl)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-secondary))]">
          <Image src={product.imagePublicId} alt={product.name} fill priority sizes="(max-width: 1023px) 100vw, 52vw" className="object-cover" />
          <span className="absolute left-4 top-4 rounded-full border border-white/60 bg-white/85 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-slate-800 shadow-sm backdrop-blur">
            DEMO PREVIEW
          </span>
        </div>

        <section className="flex flex-col justify-center py-1 lg:py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--color-primary))]">{product.brand ?? "Universal Mart"}</p>
          <h1 className="mt-3 font-[var(--font-heading)] text-3xl font-semibold leading-tight tracking-[-0.035em] text-[rgb(var(--color-text))] sm:text-4xl">{product.name}</h1>
          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <span className={`text-2xl font-bold tracking-tight ${sale ? "text-[rgb(var(--color-sale))]" : "text-[rgb(var(--color-text))]"}`}>{formatMoney(product.price)}</span>
            {sale && product.compareAtPrice ? <span className="text-sm text-[rgb(var(--color-text-subtle))] line-through">{formatMoney(product.compareAtPrice)}</span> : null}
            {sale ? <span className="rounded-full bg-[rgb(var(--color-sale))]/10 px-2.5 py-1 text-xs font-semibold text-[rgb(var(--color-sale))]">Harga preview</span> : null}
          </div>
          <p className="mt-5 max-w-xl text-sm leading-7 text-[rgb(var(--color-text-muted))] sm:text-base">{product.shortDescription}</p>

          <div className="mt-7 grid gap-3 border-y border-[rgb(var(--color-border))] py-5 sm:grid-cols-2">
            <div className="flex items-start gap-3"><PackageCheck size={19} className="mt-0.5 shrink-0 text-[rgb(var(--color-primary))]" /><div><p className="text-sm font-semibold text-[rgb(var(--color-text))]">Detail produk</p><p className="mt-1 text-xs leading-5 text-[rgb(var(--color-text-muted))]">Tata letak foto, harga, dan informasi produk.</p></div></div>
            <div className="flex items-start gap-3"><ShieldCheck size={19} className="mt-0.5 shrink-0 text-[rgb(var(--color-primary))]" /><div><p className="text-sm font-semibold text-[rgb(var(--color-text))]">Pengalaman tepercaya</p><p className="mt-1 text-xs leading-5 text-[rgb(var(--color-text-muted))]">Area informasi dan kepercayaan untuk toko.</p></div></div>
          </div>

          <div className="mt-6 rounded-[var(--radius-lg)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4 sm:p-5">
            <div className="flex items-start gap-3"><BadgeCheck size={18} className="mt-0.5 shrink-0 text-[rgb(var(--color-primary))]" /><p className="text-sm leading-6 text-[rgb(var(--color-text-muted))]">Ini halaman pratinjau desain. Produk demo tidak dapat dibeli dan tidak akan ditambahkan ke keranjang asli.</p></div>
            <Link href="/produk" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-sm)] bg-[rgb(var(--color-primary))] px-5 text-sm font-semibold text-white transition hover:opacity-95">Lihat produk toko</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
