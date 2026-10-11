import Link from "next/link";
import { Mail, ShoppingBag } from "lucide-react";
import { storeConfig } from "@/config/store";

export default function Footer() {
  return (
    <footer className="border-t border-[rgb(var(--color-border))] bg-[rgb(var(--color-secondary))] text-white">
      <div className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-[13px] bg-white/10 font-[var(--font-heading)] font-semibold">U</span><div><p className="font-[var(--font-heading)] text-sm font-semibold">{storeConfig.name}</p><p className="text-[10px] uppercase tracking-[0.16em] text-white/55">Official Store</p></div></div>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/65">{storeConfig.description}</p>
          </div>
          <div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[rgb(var(--color-accent))]">Belanja</p><div className="mt-4 grid gap-3 text-sm text-white/70"><Link href="/produk" className="hover:text-white">Semua produk</Link><Link href="/keranjang" className="hover:text-white">Keranjang</Link></div></div>
          <div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[rgb(var(--color-accent))]">Layanan</p><div className="mt-4 grid gap-3 text-sm text-white/70">{storeConfig.contact.email ? <a href={`mailto:${storeConfig.contact.email}`} className="inline-flex items-center gap-2 hover:text-white"><Mail size={15} />{storeConfig.contact.email}</a> : null}<Link href="/" className="inline-flex items-center gap-2 hover:text-white"><ShoppingBag size={15} />Universal Mart</Link></div></div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} {storeConfig.name}. All rights reserved.</span><span>Secure storefront · {storeConfig.currency}</span></div>
      </div>
    </footer>
  );
}
