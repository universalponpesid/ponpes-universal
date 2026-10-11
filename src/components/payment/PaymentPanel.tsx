"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Copy, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import type { Order } from "@/core/commerce";
import type { PaymentMethod } from "@/core/payments";
import { formatMoney } from "@/core/money";

type Props = {
  order: Order;
  midtransEnabled: boolean;
  midtransClientKey: string;
  midtransEnvironment: "sandbox" | "production";
  manualBank: {
    title: string;
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
  };
  manualQris: {
    title: string;
    qrisImageUrl?: string;
  };
};

type Snap = { pay: (token: string, callbacks: { onSuccess: () => void; onPending: () => void; onError: () => void; onClose: () => void }) => void };

declare global {
  interface Window {
    snap?: Snap;
  }
}

export function PaymentPanel({ order, midtransEnabled, midtransClientKey, midtransEnvironment, manualBank, manualQris }: Props) {
  const [method] = useState<PaymentMethod>(order.payment.method);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!midtransEnabled || !midtransClientKey || document.querySelector('script[data-midtrans-snap="true"]')) return;
    const script = document.createElement("script");
    script.dataset.midtransSnap = "true";
    script.src = midtransEnvironment === "production" ? "https://app.midtrans.com/snap/snap.js" : "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", midtransClientKey);
    document.body.appendChild(script);
  }, [midtransClientKey, midtransEnabled, midtransEnvironment]);

  async function startMidtrans() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/payment/midtrans/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const payload = (await response.json()) as { token?: string; error?: string };
      if (!response.ok || !payload.token) throw new Error(payload.error ?? "Pembayaran Midtrans belum dapat dimulai.");
      if (!window.snap) throw new Error("Midtrans belum siap. Silakan tunggu sebentar lalu coba lagi.");
      window.snap.pay(payload.token, {
        onSuccess: () => setMessage("Pembayaran berhasil diteruskan ke Midtrans. Status final akan dikonfirmasi oleh server."),
        onPending: () => setMessage("Pembayaran masih menunggu penyelesaian. Status akan diperbarui setelah notifikasi diterima server."),
        onError: () => setMessage("Pembayaran gagal. Silakan pilih metode lain atau coba kembali."),
        onClose: () => setMessage("Jendela pembayaran ditutup. Order tetap tersimpan selama masa pembayaran."),
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Pembayaran belum dapat dimulai.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmManual() {
    if (!method) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/payment/manual/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId: order.id, method }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Konfirmasi belum dapat dikirim.");
      setConfirmed(true);
      setMessage("Konfirmasi pembayaran diterima. Admin akan melakukan verifikasi sebelum pesanan diproses.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Konfirmasi belum dapat dikirim.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 rounded-[var(--radius-lg)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-5 shadow-[var(--shadow-sm)] sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[rgb(var(--color-primary))]">Pembayaran</p>
          <h2 className="mt-2 text-xl font-semibold text-[rgb(var(--color-text))]">Pilih cara pembayaran</h2>
          <p className="mt-2 text-sm leading-6 text-[rgb(var(--color-text-muted))]">Total yang harus dibayar <strong className="text-[rgb(var(--color-text))]">{formatMoney(order.grandTotal)}</strong>.</p>
        </div>
        <ShieldCheck className="hidden text-[rgb(var(--color-primary))] sm:block" size={22} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {midtransEnabled && order.payment.method === "midtrans" ? <div className="rounded-[var(--radius-md)] border border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary-soft))] p-4 text-left"><p className="text-sm font-semibold text-[rgb(var(--color-text))]">Midtrans</p><p className="mt-1 text-xs leading-5 text-[rgb(var(--color-text-muted))]">Pembayaran online</p></div> : null}
        {order.payment.method === "manual_bank_transfer" ? <div className="rounded-[var(--radius-md)] border border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary-soft))] p-4 text-left"><p className="text-sm font-semibold text-[rgb(var(--color-text))]">Transfer Bank</p><p className="mt-1 text-xs leading-5 text-[rgb(var(--color-text-muted))]">Konfirmasi manual</p></div> : null}
        {order.payment.method === "manual_qris" ? <div className="rounded-[var(--radius-md)] border border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary-soft))] p-4 text-left"><p className="text-sm font-semibold text-[rgb(var(--color-text))]">QRIS</p><p className="mt-1 text-xs leading-5 text-[rgb(var(--color-text-muted))]">Scan & konfirmasi</p></div> : null}
      </div>

      {method === "midtrans" ? <div className="mt-5 rounded-[var(--radius-md)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-background))] p-5"><p className="text-sm font-semibold text-[rgb(var(--color-text))]">Pembayaran aman melalui Midtrans</p><p className="mt-1 text-sm leading-6 text-[rgb(var(--color-text-muted))]">Anda akan diarahkan ke jendela pembayaran Midtrans. Status pembayaran tetap diverifikasi oleh server.</p><button type="button" disabled={loading} onClick={() => void startMidtrans()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] bg-[rgb(var(--color-primary))] px-5 text-sm font-semibold text-white disabled:opacity-50">{loading ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}Bayar dengan Midtrans</button></div> : null}

      {method === "manual_bank_transfer" ? <div className="mt-5 rounded-[var(--radius-md)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-background))] p-5"><p className="text-sm font-semibold text-[rgb(var(--color-text))]">{manualBank.title}</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-[rgb(var(--color-text-muted))]">Bank</p><p className="mt-1 text-sm font-semibold text-[rgb(var(--color-text))]">{manualBank.bankName || "Belum dikonfigurasi"}</p></div><div><p className="text-xs text-[rgb(var(--color-text-muted))]">Nomor rekening</p><div className="mt-1 flex items-center gap-2"><p className="text-sm font-semibold text-[rgb(var(--color-text))]">{manualBank.accountNumber || "Belum dikonfigurasi"}</p>{manualBank.accountNumber ? <button type="button" aria-label="Salin nomor rekening" onClick={() => void navigator.clipboard.writeText(manualBank.accountNumber ?? "")}><Copy size={15} /></button> : null}</div></div><div><p className="text-xs text-[rgb(var(--color-text-muted))]">Atas nama</p><p className="mt-1 text-sm font-semibold text-[rgb(var(--color-text))]">{manualBank.accountName || "Belum dikonfigurasi"}</p></div></div><button type="button" disabled={loading || confirmed} onClick={() => void confirmManual()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] bg-[rgb(var(--color-primary))] px-5 text-sm font-semibold text-white disabled:opacity-50">{confirmed ? <CheckCircle2 size={16} /> : null}{confirmed ? "Konfirmasi terkirim" : loading ? "Mengirim…" : "Saya sudah transfer"}</button></div> : null}

      {method === "manual_qris" ? <div className="mt-5 rounded-[var(--radius-md)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-background))] p-5"><p className="text-sm font-semibold text-[rgb(var(--color-text))]">{manualQris.title}</p>{manualQris.qrisImageUrl ? <img src={manualQris.qrisImageUrl} alt="QRIS Universal Mart" className="mx-auto mt-5 aspect-square w-full max-w-[280px] rounded-xl border border-[rgb(var(--color-border))] bg-white object-contain p-3" /> : <div className="mt-5 rounded-xl border border-dashed border-[rgb(var(--color-border))] p-8 text-center text-sm text-[rgb(var(--color-text-muted))]">QRIS belum dikonfigurasi. Tambahkan URL gambar QRIS pada environment.</div>}<button type="button" disabled={loading || confirmed || !manualQris.qrisImageUrl} onClick={() => void confirmManual()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] bg-[rgb(var(--color-primary))] px-5 text-sm font-semibold text-white disabled:opacity-50">{confirmed ? <CheckCircle2 size={16} /> : null}{confirmed ? "Konfirmasi terkirim" : loading ? "Mengirim…" : "Saya sudah membayar"}</button></div> : null}

      {message ? <div role="status" className="mt-5 rounded-[var(--radius-md)] bg-[rgb(var(--color-surface-secondary))] p-4 text-sm leading-6 text-[rgb(var(--color-text-muted))]">{message}</div> : null}
    </section>
  );
}
