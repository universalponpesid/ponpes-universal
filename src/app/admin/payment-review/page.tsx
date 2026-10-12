"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type QueueItem = {
  id: string;
  createdAt: string;
  updatedAt: string;
  customer: { name: string; phone: string; email?: string };
  items: { name: string; variant?: string; quantity: number; subtotal: number }[];
  subtotal: number;
  shippingCost: number;
  grandTotal: number;
  payment: { method: "manual_bank_transfer" | "manual_qris" | "midtrans"; status: string; transactionId?: string };
  shipping: { city?: string; district: string; subdistrict?: string; addressLine: string };
};

type QueueResponse = { queue: QueueItem[]; count: number; adminName: string; error?: string };

const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const dateTime = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function AdminPaymentReviewPage() {
  const [token, setToken] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [adminName, setAdminName] = useState("Admin Operasional");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/payment-verifications", { cache: "no-store" });
      const data = await response.json() as QueueResponse;
      if (!response.ok) throw new Error(data.error || "Sesi admin tidak valid.");
      setQueue(data.queue);
      setAdminName(data.adminName);
      setAuthenticated(true);
    } catch (cause) {
      setAuthenticated(false);
      setError(cause instanceof Error ? cause.message : "Gagal memuat antrean.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadQueue(); }, [loadQueue]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return queue;
    return queue.filter((order) => [order.id, order.customer.name, order.customer.phone, order.payment.method].some((value) => value.toLowerCase().includes(needle)));
  }, [queue, query]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Login gagal.");
      setToken("");
      await loadQueue();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    setAuthenticated(false);
    setQueue([]);
    setNotice("");
  }

  async function submitDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/payment-verifications/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: selected.id, decision, reason }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Keputusan gagal disimpan.");
      setNotice(`${selected.id}: ${decision === "approve" ? "pembayaran disetujui" : "pembayaran ditolak"}. Audit tindakan tersimpan.`);
      setSelected(null);
      setReason("");
      await loadQueue();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Keputusan gagal disimpan.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!authenticated) {
    return <main className="min-h-screen bg-[#f5f7f5] px-4 py-12 text-[#142019] sm:py-20">
      <section className="mx-auto max-w-md rounded-3xl border border-black/5 bg-white p-7 shadow-[0_24px_70px_rgba(20,32,25,.09)] sm:p-9">
        <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-900 text-lg font-bold text-white">UM</div>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-800">Universal Mart · Operations</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Payment review</h1>
        <p className="mt-3 text-sm leading-6 text-[#5b6962]">Masuk untuk memeriksa konfirmasi transfer dan QRIS manual. Keputusan pembayaran akan dicatat dalam audit operasional.</p>
        <form onSubmit={login} className="mt-7 space-y-4">
          <label className="block text-sm font-medium">Admin operations token
            <input type="password" autoComplete="current-password" value={token} onChange={(event) => setToken(event.target.value)} required className="mt-2 w-full rounded-xl border border-[#dfe5df] bg-white px-4 py-3 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10" placeholder="Masukkan token admin" />
          </label>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button disabled={loading} className="w-full rounded-xl bg-emerald-900 px-4 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60">{loading ? "Memverifikasi…" : "Masuk ke dashboard"}</button>
        </form>
        <p className="mt-6 text-xs leading-5 text-[#84918a]">Sesi memakai cookie HttpOnly dengan masa aktif terbatas. Jangan bagikan token kepada pelanggan.</p>
      </section>
    </main>;
  }

  return <main className="min-h-screen bg-[#f5f7f5] text-[#142019]">
    <header className="border-b border-black/5 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-800">Universal Mart · Operations</p><h1 className="mt-1 text-xl font-semibold sm:text-2xl">Payment review</h1></div>
        <div className="flex items-center gap-3"><span className="hidden text-sm text-[#5b6962] sm:block">{adminName}</span><button onClick={() => void loadQueue()} className="rounded-xl border border-[#dfe5df] bg-white px-3 py-2 text-sm font-medium hover:bg-[#f5f7f5]">Refresh</button><button onClick={() => void logout()} className="rounded-xl px-3 py-2 text-sm font-medium text-[#5b6962] hover:bg-[#f5f7f5]">Keluar</button></div>
      </div>
    </header>
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
      {notice && <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</p>}
      {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/5 bg-white p-5"><p className="text-sm text-[#5b6962]">Menunggu verifikasi</p><p className="mt-2 text-3xl font-semibold">{queue.length}</p><p className="mt-1 text-xs text-[#84918a]">Transfer manual dan QRIS manual</p></div>
        <div className="rounded-2xl border border-black/5 bg-white p-5"><p className="text-sm text-[#5b6962]">Nilai antrean</p><p className="mt-2 text-2xl font-semibold">{money(queue.reduce((sum, order) => sum + order.grandTotal, 0))}</p><p className="mt-1 text-xs text-[#84918a]">Belum dianggap dana diterima</p></div>
        <div className="rounded-2xl border border-black/5 bg-white p-5"><p className="text-sm text-[#5b6962]">Prosedur</p><p className="mt-2 text-base font-semibold">Cocokkan dana aktual</p><p className="mt-1 text-xs leading-5 text-[#84918a]">Periksa mutasi bank atau settlement QRIS sebelum menyetujui.</p></div>
      </div>
      <section className="mt-7 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#edf0ed] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><h2 className="font-semibold">Antrean pembayaran</h2><p className="mt-1 text-sm text-[#84918a]">Urut dari permintaan verifikasi terlama.</p></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari order, nama, telepon…" className="w-full rounded-xl border border-[#dfe5df] px-3 py-2.5 text-sm outline-none focus:border-emerald-700 sm:max-w-xs" /></div>
        {loading ? <div className="p-10 text-center text-sm text-[#5b6962]">Memuat antrean…</div> : filtered.length === 0 ? <div className="p-12 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-900">✓</div><h3 className="mt-4 font-semibold">Tidak ada pembayaran menunggu</h3><p className="mt-1 text-sm text-[#84918a]">Antrean akan muncul setelah pelanggan mengonfirmasi pembayaran manual.</p></div> : <div className="divide-y divide-[#edf0ed]">{filtered.map((order) => <article key={order.id} className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{order.id}</span><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Perlu verifikasi</span><span className="rounded-full bg-[#f1f4f1] px-2.5 py-1 text-xs font-medium text-[#5b6962]">{order.payment.method === "manual_qris" ? "QRIS manual" : "Transfer bank"}</span></div><p className="mt-2 text-sm font-medium">{order.customer.name} <span className="font-normal text-[#84918a]">· {order.customer.phone}</span></p><p className="mt-1 text-xs text-[#84918a]">Diperbarui {dateTime(order.updatedAt)}</p><ul className="mt-3 space-y-1 text-sm text-[#5b6962]">{order.items.map((item, index) => <li key={`${order.id}-${index}`} className="flex justify-between gap-4"><span>{item.name}{item.variant ? ` · ${item.variant}` : ""} × {item.quantity}</span><span className="shrink-0">{money(item.subtotal)}</span></li>)}</ul><div className="mt-3 border-t border-dashed border-[#dfe5df] pt-3 text-xs text-[#84918a]">{order.shipping.addressLine} · {order.shipping.subdistrict ? `${order.shipping.subdistrict}, ` : ""}{order.shipping.district}{order.shipping.city ? `, ${order.shipping.city}` : ""}</div></div><div className="flex shrink-0 flex-row items-center justify-between gap-4 lg:w-56 lg:flex-col lg:items-end"><div className="lg:text-right"><p className="text-xs text-[#84918a]">Total tagihan</p><p className="mt-1 text-xl font-semibold">{money(order.grandTotal)}</p><p className="mt-1 text-xs text-[#84918a]">Termasuk ongkir {money(order.shippingCost)}</p></div><button onClick={() => { setSelected(order); setDecision("approve"); setReason(""); }} className="rounded-xl bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">Periksa pembayaran</button></div></div>
        </article>)}</div>}
      </section>
      <p className="mt-5 text-xs leading-5 text-[#84918a]">Dashboard ini hanya menampilkan pesanan tenant yang dikonfigurasi. Persetujuan manual akan menandai pembayaran lunas dan mencoba commit reservasi stok; jika commit gagal, lakukan rekonsiliasi sebelum fulfillment.</p>
    </div>
    {selected && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0b1510]/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) setSelected(null); }}><section role="dialog" aria-modal="true" aria-labelledby="decision-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">Keputusan pembayaran</p><h2 id="decision-title" className="mt-2 text-xl font-semibold">{selected.id}</h2><p className="mt-1 text-sm text-[#5b6962]">{selected.customer.name} · {selected.payment.method === "manual_qris" ? "QRIS manual" : "Transfer bank"}</p></div><button disabled={submitting} onClick={() => setSelected(null)} aria-label="Tutup" className="rounded-full px-3 py-1 text-xl text-[#84918a] hover:bg-[#f5f7f5]">×</button></div>
      <div className="mt-5 rounded-2xl bg-[#f5f7f5] p-4"><p className="text-sm text-[#5b6962]">Total yang wajib cocok dengan dana diterima</p><p className="mt-1 text-2xl font-semibold">{money(selected.grandTotal)}</p><p className="mt-2 text-sm text-[#5b6962]">Pelanggan: {selected.customer.name} · {selected.customer.phone}</p></div>
      <form onSubmit={submitDecision} className="mt-5 space-y-4"><fieldset><legend className="mb-2 text-sm font-semibold">Keputusan</legend><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => setDecision("approve")} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${decision === "approve" ? "border-emerald-800 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-800/10" : "border-[#dfe5df] text-[#5b6962]"}`}>✓ Setujui · dana cocok</button><button type="button" onClick={() => setDecision("reject")} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${decision === "reject" ? "border-red-700 bg-red-50 text-red-800 ring-2 ring-red-700/10" : "border-[#dfe5df] text-[#5b6962]"}`}>Tolak · dana tidak cocok</button></div></fieldset><label className="block text-sm font-medium">Catatan pemeriksaan / alasan {decision === "reject" ? "penolakan" : "persetujuan"}<textarea required minLength={5} maxLength={500} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder={decision === "approve" ? "Contoh: Mutasi bank diterima sesuai nominal pada 12 Okt 2026." : "Contoh: Dana belum masuk / nominal tidak sesuai."} className="mt-2 w-full resize-y rounded-xl border border-[#dfe5df] px-4 py-3 text-sm outline-none focus:border-emerald-700" /></label><p className="text-xs leading-5 text-[#84918a]">Nama admin, waktu tindakan, nominal, alasan, status sebelum/sesudah, dan hasil operasi akan dicatat di audit pembayaran.</p><div className="flex gap-3 pt-1"><button type="button" disabled={submitting} onClick={() => setSelected(null)} className="flex-1 rounded-xl border border-[#dfe5df] px-4 py-3 text-sm font-semibold">Batal</button><button type="submit" disabled={submitting || reason.trim().length < 5} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 ${decision === "approve" ? "bg-emerald-900 hover:bg-emerald-800" : "bg-red-700 hover:bg-red-600"}`}>{submitting ? "Menyimpan…" : decision === "approve" ? "Konfirmasi lunas" : "Konfirmasi penolakan"}</button></div></form></section></div>}
  </main>;
}
