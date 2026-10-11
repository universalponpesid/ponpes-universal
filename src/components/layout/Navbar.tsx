"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, Search, ShoppingBag, X, ArrowRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart";
import { formatMoney } from "@/core/money";
import { cloudinaryImage } from "@/infrastructure/cloudinary";
import { storeConfig } from "@/config/store";

const navItems = [
  { label: "Beranda", href: "/" },
  { label: "Produk", href: "/produk" },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { cart, itemCount, subtotalSnapshot } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [search, setSearch] = useState("");

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = search.trim();
    if (!value) return;
    setCartOpen(false);
    setMenuOpen(false);
    router.push(`/produk?q=${encodeURIComponent(value)}`);
    setSearch("");
  }

  return (
    <header className="sticky top-0 z-[var(--z-header)] border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-background))]/92 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1120px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={`${storeConfig.name} beranda`}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[rgb(var(--color-primary))] font-[var(--font-heading)] text-sm font-semibold text-white shadow-[var(--shadow-sm)]">U</span>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate font-[var(--font-heading)] text-sm font-semibold tracking-tight text-[rgb(var(--color-text))]">{storeConfig.shortName}</span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-[rgb(var(--color-text-subtle))]">Official Store</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Navigasi utama">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} className={`relative py-2 text-sm font-medium transition-colors ${active ? "text-[rgb(var(--color-primary))]" : "text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text))]"}`}>
              {item.label}
              {active ? <span className="absolute inset-x-0 bottom-0 mx-auto h-0.5 w-5 rounded-full bg-[rgb(var(--color-primary))]" /> : null}
            </Link>;
          })}
        </nav>

        <form onSubmit={submitSearch} className="ml-auto hidden h-10 w-[260px] items-center gap-2 rounded-full border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-3.5 transition focus-within:border-[rgb(var(--color-primary))] md:flex xl:w-[310px]">
          <Search size={16} className="shrink-0 text-[rgb(var(--color-text-subtle))]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari produk" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[rgb(var(--color-text-subtle))]" aria-label="Cari produk" />
        </form>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <button type="button" onClick={() => setCartOpen((value) => !value)} className="relative grid h-10 w-10 place-items-center rounded-full border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))] transition hover:-translate-y-0.5 hover:border-[rgb(var(--color-primary))]" aria-label={`Keranjang, ${itemCount} item`} aria-expanded={cartOpen}>
            <ShoppingBag size={19} />
            {itemCount > 0 ? <span className="absolute -right-1.5 -top-1.5 grid min-w-[20px] h-5 place-items-center rounded-full bg-[rgb(var(--color-primary))] px-1 text-[10px] font-bold text-white ring-2 ring-[rgb(var(--color-background))]">{itemCount > 99 ? "99+" : itemCount}</span> : null}
          </button>
          <button type="button" onClick={() => setMenuOpen((value) => !value)} className="grid h-10 w-10 place-items-center rounded-full border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))] md:hidden" aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>

      <AnimatePresence>
        {cartOpen ? <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute right-3 top-[82px] z-[var(--z-dropdown)] w-[min(390px,calc(100vw-24px))] overflow-hidden rounded-[var(--radius-lg)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-elevated))] shadow-[var(--shadow-floating)] sm:right-6 lg:right-[max(24px,calc((100vw-1120px)/2))]">
          {cart.items.length === 0 ? <div className="p-6 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[rgb(var(--color-primary-soft))] text-[rgb(var(--color-primary))]"><ShoppingBag size={19} /></div><p className="mt-3 text-sm font-semibold text-[rgb(var(--color-text))]">Keranjang masih kosong</p><p className="mt-1 text-xs text-[rgb(var(--color-text-muted))]">Tambahkan produk untuk melihat ringkasannya di sini.</p></div> : <div className="p-4">
            <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--color-primary))]">Keranjang</p><p className="mt-1 text-sm text-[rgb(var(--color-text-muted))]">{itemCount} item</p></div><Link href="/keranjang" onClick={() => setCartOpen(false)} className="text-xs font-semibold text-[rgb(var(--color-primary))]">Lihat semua</Link></div>
            <div className="mt-4 max-h-[300px] space-y-3 overflow-y-auto pr-1">{cart.items.slice(0,4).map((item) => <div key={item.id} className="flex gap-3"><div className="h-14 w-14 shrink-0 overflow-hidden rounded-[10px] bg-[rgb(var(--color-surface-secondary))]">{item.imagePublicId ? <img src={cloudinaryImage(item.imagePublicId,"thumb")} alt="" className="h-full w-full object-cover" /> : null}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[rgb(var(--color-text))]">{item.productName}</p>{item.variantLabel ? <p className="mt-0.5 truncate text-[11px] text-[rgb(var(--color-text-muted))]">{item.variantLabel}</p> : null}<p className="mt-1 text-xs text-[rgb(var(--color-text-muted))]">{item.quantity} × {formatMoney(item.unitPriceSnapshot)}</p></div></div>)}</div>
            <div className="mt-4 border-t border-[rgb(var(--color-border))] pt-4"><div className="flex items-center justify-between"><span className="text-sm text-[rgb(var(--color-text-muted))]">Subtotal</span><strong className="text-sm text-[rgb(var(--color-text))]">{formatMoney(subtotalSnapshot)}</strong></div><Link href="/keranjang" onClick={() => setCartOpen(false)} className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[rgb(var(--color-primary))] px-4 text-sm font-semibold text-white transition hover:bg-[rgb(var(--color-primary-hover))]">Buka keranjang <ArrowRight size={16} /></Link></div>
          </div>}
        </motion.div> : null}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen ? <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-t border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] md:hidden">
          <div className="mx-auto max-w-[1120px] space-y-4 px-4 py-5 sm:px-6">
            <form onSubmit={submitSearch} className="flex h-11 items-center gap-2 rounded-[var(--radius-sm)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-background))] px-3"><Search size={16} className="text-[rgb(var(--color-text-subtle))]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari produk" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></form>
            <nav className="grid gap-1">{navItems.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="rounded-[var(--radius-sm)] px-3 py-3 text-sm font-medium text-[rgb(var(--color-text))] hover:bg-[rgb(var(--color-surface-secondary))]">{item.label}</Link>)}<Link href="/keranjang" onClick={() => setMenuOpen(false)} className="flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-3 text-sm font-semibold text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-primary-soft))]"><span>Keranjang</span><span>{itemCount} item</span></Link></nav>
          </div>
        </motion.div> : null}
      </AnimatePresence>
    </header>
  );
}
