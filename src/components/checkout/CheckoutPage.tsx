"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { useCart } from "@/components/cart";
import { PaymentPanel } from "@/components/payment/PaymentPanel";
import type { CartReconciliation } from "@/core/cart";
import type { Order } from "@/core/commerce";
import { formatMoney } from "@/core/money";
import type { PaymentInstruction, PaymentMethod } from "@/core/payments";
import type { ShippingRate } from "@/core/shipping";

type CheckoutPageProps = {
  payment: {
    midtransEnabled: boolean;
    midtransClientKey: string;
    midtransEnvironment: "sandbox" | "production";
    manualBank: PaymentInstruction;
    manualQris: PaymentInstruction;
    manualBankEnabled: boolean;
    manualQrisEnabled: boolean;
  };
};

type ApiError = { error?: string };
type ReconciliationResponse = CartReconciliation & ApiError;
type ShippingRatesResponse = { rates?: readonly ShippingRate[] } & ApiError;
type ShippingArea = { id: string; name: string; postalCode: string; province: string; city: string; district: string };
type ShippingAreasResponse = { areas?: readonly ShippingArea[] } & ApiError;
type CheckoutResponse = { order?: Order } & ApiError;

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

const inputClassName =
  "min-h-12 w-full rounded-[var(--radius-sm)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-background))] px-4 text-sm text-[rgb(var(--color-text))] outline-none transition placeholder:text-[rgb(var(--color-text-subtle))] focus:border-[rgb(var(--color-primary))] focus:ring-2 focus:ring-[rgb(var(--color-primary))]/10";

export function CheckoutPage({ payment }: CheckoutPageProps) {
  const { cart, itemCount, subtotalSnapshot, applyReconciliation, removePurchasedItems } = useCart();

  const [reconciling, setReconciling] = useState(true);
  const [reconciled, setReconciled] = useState(false);
  const [reconciliationMessage, setReconciliationMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [areaQuery, setAreaQuery] = useState("");
  const [areas, setAreas] = useState<readonly ShippingArea[]>([]);
  const [areaSearching, setAreaSearching] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [subdistrict, setSubdistrict] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [recipientNote, setRecipientNote] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    payment.midtransEnabled
      ? "midtrans"
      : payment.manualBankEnabled
        ? "manual_bank_transfer"
        : payment.manualQrisEnabled
          ? "manual_qris"
          : "manual_bank_transfer",
  );
  const hasAvailablePaymentMethod = payment.midtransEnabled || payment.manualBankEnabled || payment.manualQrisEnabled;
  const [shippingRates, setShippingRates] = useState<readonly ShippingRate[]>([]);
  const [shippingRateId, setShippingRateId] = useState("");
  const [shippingLoading, setShippingLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  // Reuse the same key for retries while this checkout attempt is mounted.
  // This prevents a timeout/retry from intentionally creating a fresh order key.
  const idempotencyKeyRef = useRef<string>(createIdempotencyKey());
  const itemLabel = useMemo(
    () => `${itemCount} ${itemCount === 1 ? "item" : "item"}`,
    [itemCount],
  );

  const reconcileBeforeCheckout = useCallback(async (): Promise<boolean> => {
    if (cart.items.length === 0) {
      setReconciling(false);
      setReconciled(false);
      return false;
    }

    setReconciling(true);
    setReconciliationMessage(null);
    setReconciled(false);

    try {
      const response = await fetch("/api/cart/reconcile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cart),
      });
      const payload = (await response.json()) as ReconciliationResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Keranjang belum dapat diperiksa.");
      }
      if (payload.hasBlockingIssues) {
        const blockingIssue = payload.items
          .flatMap((item) => item.issues)
          .find((issue) => issue.action !== "keep");
        throw new Error(
          blockingIssue?.message ??
            "Ada item yang perlu disesuaikan sebelum checkout.",
        );
      }
      if (payload.hasChanges) {
        applyReconciliation(payload);
        setReconciliationMessage(
          "Harga atau jumlah produk berubah. Keranjang telah diperbarui dari data server. Periksa kembali ringkasan sebelum melanjutkan.",
        );
        return false;
      }

      setReconciled(true);
      const untrackedIssue = payload.items
        .flatMap((item) => item.issues)
        .find((issue) => issue.code === "inventory_untracked");
      setReconciliationMessage(
        untrackedIssue
          ? "Stok produk belum tersinkron ke inventory. Checkout dapat dilanjutkan, tetapi ketersediaan fisik perlu dipastikan oleh pengelola toko."
          : null,
      );
      return true;
    } catch (reconcileError) {
      setReconciliationMessage(
        getErrorMessage(reconcileError, "Keranjang belum dapat diperiksa."),
      );
      return false;
    } finally {
      setReconciling(false);
    }
  }, [applyReconciliation, cart]);

  useEffect(() => {
    void reconcileBeforeCheckout();
  }, [reconcileBeforeCheckout]);

  async function searchShippingAreas(): Promise<void> {
    const query = areaQuery.trim();
    if (query.length < 3) {
      setError("Ketik minimal 3 karakter nama kecamatan, kota, atau kode pos.");
      return;
    }
    setAreaSearching(true);
    setAreas([]);
    setError(null);
    try {
      const response = await fetch(`/api/shipping/areas?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      const payload = await response.json() as ShippingAreasResponse;
      if (!response.ok) throw new Error(payload.error ?? "Wilayah belum dapat dicari.");
      setAreas(Array.isArray(payload.areas) ? payload.areas : []);
      if (!payload.areas?.length) setError("Wilayah tidak ditemukan. Coba nama kecamatan atau kota yang lebih lengkap.");
    } catch (searchError) {
      setError(getErrorMessage(searchError, "Wilayah belum dapat dicari."));
    } finally {
      setAreaSearching(false);
    }
  }

  function selectShippingArea(area: ShippingArea): void {
    setSelectedAreaId(area.id);
    setAreaQuery(area.name);
    setProvince(area.province);
    setCity(area.city);
    setDistrict(area.district);
    if (/^\d{5}$/.test(area.postalCode)) setPostalCode(area.postalCode);
    setAreas([]);
    setShippingRates([]);
    setShippingRateId("");
    setError(null);
  }

  async function loadShippingRates(): Promise<void> {
    setError(null);
    setShippingRateId("");
    setShippingRates([]);

    const normalizedPostalCode = postalCode.trim();
    if (!/^\d{5}$/.test(normalizedPostalCode)) {
      setError("Kode pos tujuan harus terdiri dari 5 digit.");
      return;
    }

    setShippingLoading(true);
    try {
      const response = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cart,
          destinationPostalCode: normalizedPostalCode,
          destinationAreaId: selectedAreaId || undefined,
          courierCodes: ["jne", "jnt", "sicepat"],
        }),
      });
      const payload = (await response.json()) as ShippingRatesResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Ongkir belum dapat dihitung.");
      }

      const rates = Array.isArray(payload.rates) ? payload.rates : [];
      setShippingRates(rates);
      if (rates.length === 0) {
        setError("Belum ada layanan ekspedisi yang tersedia untuk kode pos ini.");
      }
    } catch (shippingError) {
      setShippingRates([]);
      setError(getErrorMessage(shippingError, "Ongkir belum dapat dihitung."));
    } finally {
      setShippingLoading(false);
    }
  }

  async function submitCheckout(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const normalizedPostalCode = postalCode.trim();

    if (trimmedName.length < 2) {
      setError("Nama lengkap minimal 2 karakter.");
      return;
    }
    if (!trimmedPhone) {
      setError("Nomor WhatsApp atau telepon wajib diisi.");
      return;
    }
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Format email belum valid.");
      return;
    }
    if (cart.items.length === 0) {
      setError("Keranjang masih kosong.");
      return;
    }
    if (!hasAvailablePaymentMethod) {
      setError("Belum ada metode pembayaran aktif. Hubungi admin toko sebelum melanjutkan.");
      return;
    }
    if (
      (paymentMethod === "midtrans" && !payment.midtransEnabled) ||
      (paymentMethod === "manual_bank_transfer" && !payment.manualBankEnabled) ||
      (paymentMethod === "manual_qris" && !payment.manualQrisEnabled)
    ) {
      setError("Metode pembayaran yang dipilih tidak aktif. Silakan muat ulang checkout.");
      return;
    }
    if (!reconciled) {
      const ready = await reconcileBeforeCheckout();
      if (!ready) return;
    }
    if (!/^\d{5}$/.test(normalizedPostalCode) || !shippingRateId) {
      setError("Masukkan kode pos, cek ongkir, lalu pilih layanan pengiriman.");
      return;
    }
    if (addressLine.trim().length < 8 || district.trim().length < 2) {
      setError("Lengkapi alamat jalan dan kecamatan agar kurir dapat menemukan tujuan.");
      return;
    }
    if (!shippingRates.some((rate) => rate.id === shippingRateId)) {
      setError("Pilihan pengiriman sudah tidak valid. Silakan cek ongkir kembali.");
      setShippingRateId("");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/checkout/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cart,
          customer: {
            name: trimmedName,
            email: trimmedEmail || undefined,
            phone: trimmedPhone,
          },
          idempotencyKey: idempotencyKeyRef.current,
          reservationTtlMinutes: 15,
          paymentMethod,
          shipping: {
            destinationPostalCode: normalizedPostalCode,
            destinationAreaId: selectedAreaId || undefined,
            province: province.trim() || undefined,
            city: city.trim() || undefined,
            district: district.trim(),
            subdistrict: subdistrict.trim() || undefined,
            addressLine: addressLine.trim(),
            recipientNote: recipientNote.trim() || undefined,
            latitude: coordinates?.latitude,
            longitude: coordinates?.longitude,
            rateId: shippingRateId,
          },
        }),
      });
      const payload = (await response.json()) as CheckoutResponse;
      if (!response.ok || !payload.order) {
        throw new Error(payload.error ?? "Order belum dapat dibuat.");
      }
      // Clear only quantities confirmed on the order, and only after the API
      // confirms success. Items added while checkout was in flight remain in cart.
      removePurchasedItems(payload.order.items);
      setOrder(payload.order);
    } catch (checkoutError) {
      setError(
        getErrorMessage(
          checkoutError,
          "Checkout belum dapat diproses. Silakan coba lagi.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (order) {
    return (
      <main className="mx-auto max-w-[760px] px-4 py-10 sm:px-6 sm:py-16">
        <section className="rounded-[var(--radius-xl)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-6 shadow-[var(--shadow-sm)] sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--color-primary))]">
            Order dibuat
          </p>
          <h1 className="mt-3 break-words font-[var(--font-heading)] text-2xl font-semibold text-[rgb(var(--color-text))] sm:text-3xl">
            Pesanan {order.id}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[rgb(var(--color-text-muted))]">
            Pesanan sudah dibuat. Gunakan panel pembayaran di bawah untuk
            melanjutkan transaksi. Simpan nomor pesanan ini jika perlu menghubungi admin.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--color-surface-secondary))] p-4">
              <p className="text-xs text-[rgb(var(--color-text-muted))]">Status pesanan</p>
              <p className="mt-1 text-sm font-semibold text-[rgb(var(--color-text))]">
                {order.payment.status === "paid" ? "Pembayaran terverifikasi" : "Menunggu pembayaran"}
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--color-surface-secondary))] p-4">
              <p className="text-xs text-[rgb(var(--color-text-muted))]">Total pembayaran</p>
              <p className="mt-1 text-sm font-semibold text-[rgb(var(--color-primary))]">
                {formatMoney(order.grandTotal)}
              </p>
            </div>
          </div>

          <div className="mt-7 border-t border-[rgb(var(--color-border))] pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--color-text-muted))]">
              Data pemesan
            </p>
            <p className="mt-2 text-sm font-semibold text-[rgb(var(--color-text))]">{order.customer.name}</p>
            <p className="mt-1 text-sm text-[rgb(var(--color-text-muted))]">{order.customer.phone}</p>
            {order.customer.email ? (
              <p className="mt-1 break-all text-sm text-[rgb(var(--color-text-muted))]">{order.customer.email}</p>
            ) : null}
          </div>

          <div className="mt-7 space-y-3">
            {order.items.map((item) => (
              <div
                key={`${item.productId}:${item.variantId ?? "default"}`}
                className="flex items-start justify-between gap-4 rounded-lg border border-[rgb(var(--color-border))] p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[rgb(var(--color-text))]">{item.productName}</p>
                  {item.variantLabel ? (
                    <p className="mt-1 text-xs text-[rgb(var(--color-text-muted))]">{item.variantLabel}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-[rgb(var(--color-text-muted))]">
                    {item.quantity} × {formatMoney(item.unitPrice)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-[rgb(var(--color-text))]">
                  {formatMoney(item.subtotal)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-[rgb(var(--color-border))] pt-5">
            <span className="text-sm text-[rgb(var(--color-text-muted))]">Total</span>
            <strong className="text-lg text-[rgb(var(--color-text))]">{formatMoney(order.grandTotal)}</strong>
          </div>

          <PaymentPanel
            order={order}
            midtransEnabled={payment.midtransEnabled}
            midtransClientKey={payment.midtransClientKey}
            midtransEnvironment={payment.midtransEnvironment}
            manualBank={payment.manualBank}
            manualQris={payment.manualQris}
          />

          <Link
            href="/"
            className="mt-6 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] bg-[rgb(var(--color-primary))] px-5 text-sm font-semibold text-white"
          >
            Kembali ke toko
          </Link>
        </section>
      </main>
    );
  }

  if (cart.items.length === 0) {
    return (
      <main className="mx-auto max-w-[760px] px-4 py-16 sm:px-6 sm:py-24">
        <section className="rounded-[var(--radius-xl)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-8 text-center shadow-[var(--shadow-sm)] sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--color-primary))]">Checkout</p>
          <h1 className="mt-3 font-[var(--font-heading)] text-2xl font-semibold text-[rgb(var(--color-text))]">Keranjang masih kosong</h1>
          <p className="mt-3 text-sm leading-6 text-[rgb(var(--color-text-muted))]">Tambahkan produk terlebih dahulu sebelum melanjutkan checkout.</p>
          <Link href="/produk" className="mt-7 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] bg-[rgb(var(--color-primary))] px-5 text-sm font-semibold text-white">Belanja sekarang</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="container-commerce py-8 sm:py-12">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--color-primary))]">Checkout</p>
        <h1 className="mt-2 font-[var(--font-heading)] text-2xl font-semibold text-[rgb(var(--color-text))] sm:text-3xl">Data pemesan & pengiriman</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[rgb(var(--color-text-muted))]">
          Lengkapi data penerima dan alamat sedetail mungkin. Tarif ekspedisi dihitung dari kode pos, sementara kecamatan, detail jalan, dan koordinat membantu kurir menemukan lokasi dengan akurat.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {reconciling ? (
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4 text-sm text-[rgb(var(--color-text-muted))]">
            <Loader2 size={18} className="animate-spin text-[rgb(var(--color-primary))]" />
            Memeriksa harga dan ketersediaan terbaru…
          </div>
        ) : null}
        {!reconciling && reconciliationMessage ? (
          <div role="alert" className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[rgb(var(--color-warning))]/25 bg-[rgb(var(--color-warning-soft))] p-4 text-sm leading-5 text-[rgb(var(--color-text))]">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-[rgb(var(--color-warning))]" />
            <span>{reconciliationMessage}</span>
          </div>
        ) : null}
        {!reconciling && reconciled ? (
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[rgb(var(--color-success))]/20 bg-[rgb(var(--color-success-soft))] p-4 text-sm text-[rgb(var(--color-text))]">
            <CheckCircle2 size={18} className="text-[rgb(var(--color-success))]" />
            Harga dan ketersediaan sudah diperiksa dari server.
          </div>
        ) : null}
      </div>

      <form onSubmit={submitCheckout} className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-[var(--radius-lg)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-5 shadow-[var(--shadow-sm)] sm:p-7">
          <div className="grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[rgb(var(--color-text))]">Nama lengkap <span className="text-[rgb(var(--color-sale))]">*</span></span>
              <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required minLength={2} className={inputClassName} placeholder="Nama lengkap penerima" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[rgb(var(--color-text))]">Nomor WhatsApp / telepon <span className="text-[rgb(var(--color-sale))]">*</span></span>
              <input value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required className={inputClassName} placeholder="08xxxxxxxxxx" inputMode="tel" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[rgb(var(--color-text))]">Email <span className="font-normal text-[rgb(var(--color-text-subtle))]">(opsional)</span></span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" type="email" className={inputClassName} placeholder="nama@email.com" inputMode="email" />
            </label>
          </div>

          <div className="mt-7 border-t border-[rgb(var(--color-border))] pt-7">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[rgb(var(--color-primary-soft))] text-[rgb(var(--color-primary))]"><Truck size={19} /></div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--color-primary))]">Pengiriman ekspedisi</p>
                <h2 className="mt-1 text-lg font-semibold text-[rgb(var(--color-text))]">Pilih layanan pengiriman</h2>
                <p className="mt-1 text-sm leading-6 text-[rgb(var(--color-text-muted))]">Saat ini endpoint mendukung quote ekspedisi JNE, J&amp;T, dan SiCepat melalui Biteship. Biaya akan dihitung ulang oleh server saat order dibuat.</p>
              </div>
            </div>

            <div className="mt-4 rounded-[var(--radius-md)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-background))] p-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-[rgb(var(--color-text))]">Cari wilayah tujuan <span className="font-normal text-[rgb(var(--color-text-subtle))]">(kecamatan / kota / kode pos)</span></span>
                <span className="flex flex-col gap-2 sm:flex-row">
                  <input value={areaQuery} onChange={(event) => { setAreaQuery(event.target.value); setAreas([]); setSelectedAreaId(""); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchShippingAreas(); } }} placeholder="Contoh: Cibiru, Bandung atau 40614" className={inputClassName} />
                  <button type="button" disabled={areaSearching || areaQuery.trim().length < 3} onClick={() => void searchShippingAreas()} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[rgb(var(--color-primary))] px-5 text-sm font-semibold text-white disabled:opacity-50">{areaSearching ? <Loader2 size={16} className="animate-spin" /> : null}{areaSearching ? "Mencari…" : "Cari wilayah"}</button>
                </span>
              </label>
              {areas.length ? <div className="mt-3 grid gap-2" role="listbox" aria-label="Hasil pencarian wilayah">{areas.map((area) => <button key={area.id} type="button" role="option" aria-selected={selectedAreaId === area.id} onClick={() => selectShippingArea(area)} className="rounded-[var(--radius-sm)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-3 py-3 text-left transition hover:border-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-primary-soft))]"><span className="block text-sm font-semibold text-[rgb(var(--color-text))]">{area.name}</span><span className="mt-1 block text-xs text-[rgb(var(--color-text-muted))]">{area.district}{area.city ? ` · ${area.city}` : ""}{area.postalCode ? ` · ${area.postalCode}` : ""}</span></button>)}</div> : null}
              {selectedAreaId ? <p className="mt-3 flex items-center gap-2 text-xs text-[rgb(var(--color-success))]"><CheckCircle2 size={15} />Wilayah terpilih. Tarif ongkir akan menggunakan area ID Biteship.</p> : <p className="mt-2 text-xs leading-5 text-[rgb(var(--color-text-muted))]">Pilih salah satu hasil pencarian agar kecamatan dan kode pos terisi konsisten.</p>}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-[rgb(var(--color-text))]">Provinsi <span className="font-normal text-[rgb(var(--color-text-subtle))]">(opsional)</span></span>
                <input value={province} onChange={(event) => setProvince(event.target.value)} autoComplete="address-level1" placeholder="Contoh: Jawa Barat" className={inputClassName} />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-[rgb(var(--color-text))]">Kota / kabupaten <span className="font-normal text-[rgb(var(--color-text-subtle))]">(opsional)</span></span>
                <input value={city} onChange={(event) => setCity(event.target.value)} autoComplete="address-level2" placeholder="Contoh: Kota Bandung" className={inputClassName} />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-[rgb(var(--color-text))]">Kecamatan <span className="text-[rgb(var(--color-sale))]">*</span></span>
                <input value={district} onChange={(event) => { setDistrict(event.target.value); setSelectedAreaId(""); setShippingRates([]); setShippingRateId(""); }} autoComplete="address-level3" required placeholder="Cari / tulis nama kecamatan" className={inputClassName} />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-[rgb(var(--color-text))]">Kelurahan / desa <span className="font-normal text-[rgb(var(--color-text-subtle))]">(opsional)</span></span>
                <input value={subdistrict} onChange={(event) => setSubdistrict(event.target.value)} autoComplete="address-level4" placeholder="Nama kelurahan atau desa" className={inputClassName} />
              </label>
              <label className="grid gap-2 sm:col-span-2">
                <span className="text-sm font-medium text-[rgb(var(--color-text))]">Alamat jalan, nomor rumah, RT/RW <span className="text-[rgb(var(--color-sale))]">*</span></span>
                <textarea value={addressLine} onChange={(event) => setAddressLine(event.target.value)} autoComplete="street-address" required minLength={8} rows={3} placeholder="Nama jalan, nomor rumah, RT/RW, patokan lokasi" className={`${inputClassName} resize-y py-3`} />
              </label>
              <label className="grid gap-2 sm:col-span-2">
                <span className="text-sm font-medium text-[rgb(var(--color-text))]">Catatan untuk kurir <span className="font-normal text-[rgb(var(--color-text-subtle))]">(opsional)</span></span>
                <input value={recipientNote} onChange={(event) => setRecipientNote(event.target.value)} placeholder="Contoh: rumah pagar hitam, dekat masjid" className={inputClassName} />
              </label>
            </div>
            <div className="mt-4 flex flex-col gap-3 rounded-[var(--radius-md)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-background))] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[rgb(var(--color-text))]">Titik koordinat alamat</p>
                <p className="mt-1 text-xs leading-5 text-[rgb(var(--color-text-muted))]">{coordinates ? `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}` : "Tambahkan lokasi GPS agar alamat lebih mudah ditemukan kurir."}</p>
              </div>
              <button type="button" disabled={locationLoading || typeof navigator === "undefined" || !navigator.geolocation} onClick={() => {
                if (!navigator.geolocation) return;
                setLocationLoading(true);
                navigator.geolocation.getCurrentPosition(
                  (position) => { setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude }); setLocationLoading(false); },
                  () => { setError("Lokasi tidak berhasil diambil. Izinkan akses lokasi atau isi alamat secara manual."); setLocationLoading(false); },
                  { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
                );
              }} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[rgb(var(--color-primary))] px-4 text-sm font-semibold text-[rgb(var(--color-primary))] transition hover:bg-[rgb(var(--color-primary-soft))] disabled:opacity-50">
                {locationLoading ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                {locationLoading ? "Mengambil lokasi…" : coordinates ? "Perbarui lokasi" : "Gunakan lokasi saya"}
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="grid flex-1 gap-2">
                <span className="text-sm font-medium text-[rgb(var(--color-text))]">Kode pos tujuan <span className="text-[rgb(var(--color-sale))]">*</span></span>
                <input value={postalCode} onChange={(event) => {
                  setPostalCode(event.target.value.replace(/\D/g, "").slice(0, 5));
                  setShippingRates([]);
                  setShippingRateId("");
                  setError(null);
                }} inputMode="numeric" autoComplete="postal-code" maxLength={5} required placeholder="Contoh: 40614" className={inputClassName} />
              </label>
              <button type="button" disabled={shippingLoading || postalCode.length !== 5} onClick={() => void loadShippingRates()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[rgb(var(--color-primary))] px-5 text-sm font-semibold text-[rgb(var(--color-primary))] transition hover:bg-[rgb(var(--color-primary-soft))] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                {shippingLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                {shippingLoading ? "Menghitung ongkir…" : "Cek ongkir"}
              </button>
            </div>

            {shippingRates.length > 0 ? (
              <fieldset className="mt-4 grid gap-3">
                <legend className="mb-2 text-sm font-semibold text-[rgb(var(--color-text))]">Pilih salah satu layanan</legend>
                {shippingRates.map((rate) => (
                  <label key={rate.id} className={`flex cursor-pointer items-center justify-between gap-4 rounded-[var(--radius-md)] border p-4 transition ${shippingRateId === rate.id ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary-soft))]" : "border-[rgb(var(--color-border))] bg-[rgb(var(--color-background))] hover:border-[rgb(var(--color-primary))]/40"}`}>
                    <span className="flex min-w-0 items-start gap-3">
                      <input type="radio" name="shippingRate" value={rate.id} checked={shippingRateId === rate.id} onChange={() => setShippingRateId(rate.id)} className="mt-1 accent-[rgb(var(--color-primary))]" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[rgb(var(--color-text))]">{rate.courierName} · {rate.serviceName}</span>
                        <span className="mt-1 block text-xs text-[rgb(var(--color-text-muted))]">{rate.duration ?? "Estimasi mengikuti layanan kurir"}</span>
                      </span>
                    </span>
                    <strong className="shrink-0 text-sm text-[rgb(var(--color-text))]">{formatMoney(rate.price)}</strong>
                  </label>
                ))}
              </fieldset>
            ) : null}
            <p className="mt-4 text-xs leading-5 text-[rgb(var(--color-text-subtle))]">
              Tarif ekspedisi saat ini dihitung Biteship berdasarkan kode pos. Nama wilayah, detail jalan, dan koordinat disimpan sebagai petunjuk pengantaran; pencarian wilayah otomatis berbasis database area dan peta interaktif merupakan tahap integrasi berikutnya.
            </p>
          </div>

          <div className="mt-7 border-t border-[rgb(var(--color-border))] pt-7">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--color-primary))]">Pembayaran</p>
            <h2 className="mt-1 text-lg font-semibold text-[rgb(var(--color-text))]">Pilih metode pembayaran</h2>
            <p className="mt-1 text-sm leading-6 text-[rgb(var(--color-text-muted))]">Pilihan ini akan disimpan bersama order agar instruksi pembayaran sesuai dengan metode yang dipilih.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {payment.midtransEnabled ? <label className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border p-4 transition ${paymentMethod === "midtrans" ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary-soft))]" : "border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-primary))]/40"}`}><input type="radio" name="checkoutPaymentMethod" checked={paymentMethod === "midtrans"} onChange={() => setPaymentMethod("midtrans")} className="mt-1 accent-[rgb(var(--color-primary))]" /><span><span className="block text-sm font-semibold text-[rgb(var(--color-text))]">Midtrans</span><span className="mt-1 block text-xs leading-5 text-[rgb(var(--color-text-muted))]">Virtual account, e-wallet, kartu, dan metode tersedia di Snap</span></span></label> : null}
              {payment.manualBankEnabled ? <label className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border p-4 transition ${paymentMethod === "manual_bank_transfer" ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary-soft))]" : "border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-primary))]/40"}`}><input type="radio" name="checkoutPaymentMethod" checked={paymentMethod === "manual_bank_transfer"} onChange={() => setPaymentMethod("manual_bank_transfer")} className="mt-1 accent-[rgb(var(--color-primary))]" /><span><span className="block text-sm font-semibold text-[rgb(var(--color-text))]">Transfer Bank</span><span className="mt-1 block text-xs leading-5 text-[rgb(var(--color-text-muted))]">Transfer lalu konfirmasi manual</span></span></label> : null}
              {payment.manualQrisEnabled ? <label className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border p-4 transition ${paymentMethod === "manual_qris" ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary-soft))]" : "border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-primary))]/40"}`}><input type="radio" name="checkoutPaymentMethod" checked={paymentMethod === "manual_qris"} onChange={() => setPaymentMethod("manual_qris")} className="mt-1 accent-[rgb(var(--color-primary))]" /><span><span className="block text-sm font-semibold text-[rgb(var(--color-text))]">QRIS</span><span className="mt-1 block text-xs leading-5 text-[rgb(var(--color-text-muted))]">Scan QRIS toko lalu konfirmasi</span></span></label> : null}
              {!hasAvailablePaymentMethod ? <p className="rounded-[var(--radius-md)] border border-[rgb(var(--color-border))] p-4 text-sm text-[rgb(var(--color-text-muted))]">Belum ada metode pembayaran aktif. Silakan hubungi admin toko.</p> : null}
            </div>
          </div>

          {error ? <div role="alert" className="mt-6 rounded-[var(--radius-md)] border border-[rgb(var(--color-sale))]/20 bg-[rgb(var(--color-sale))]/5 p-4 text-sm leading-5 text-[rgb(var(--color-sale))]">{error}</div> : null}

          <button type="submit" disabled={submitting || shippingLoading || reconciling || !reconciled || !hasAvailablePaymentMethod} aria-busy={submitting} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[rgb(var(--color-primary))] px-5 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
            {submitting ? <><Loader2 size={17} className="animate-spin" />Menyimpan pesanan…</> : reconciling ? <><Loader2 size={17} className="animate-spin" />Memeriksa keranjang…</> : shippingLoading ? <><Loader2 size={17} className="animate-spin" />Menghitung ongkir…</> : reconciled ? "Buat pesanan" : "Periksa kembali keranjang"}
          </button>
          {submitting ? <p role="status" aria-live="polite" className="mt-3 flex items-center gap-2 text-sm text-[rgb(var(--color-text-muted))]"><Loader2 size={15} className="animate-spin" />Sedang memvalidasi harga, tarif pengiriman, dan menyimpan order. Jangan tutup halaman ini.</p> : null}
          <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-[rgb(var(--color-text-subtle))]"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-[rgb(var(--color-primary))]" />Harga produk dan ongkir final ditentukan server sebelum order disimpan.</div>
        </section>

        <aside className="h-fit rounded-[var(--radius-lg)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-5 shadow-[var(--shadow-sm)] lg:sticky lg:top-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[rgb(var(--color-primary))]">Ringkasan</p>
            <Link href="/keranjang" className="text-xs font-semibold text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-primary))]">Ubah keranjang</Link>
          </div>
          <div className="mt-5 space-y-4">
            {cart.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[rgb(var(--color-text))]">{item.productName}</p>
                  {item.variantLabel ? <p className="mt-0.5 text-xs text-[rgb(var(--color-text-muted))]">{item.variantLabel}</p> : null}
                  <p className="mt-0.5 text-xs text-[rgb(var(--color-text-subtle))]">{item.quantity} × {formatMoney(item.unitPriceSnapshot)}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-[rgb(var(--color-text))]">{formatMoney(item.unitPriceSnapshot * item.quantity)}</p>
              </div>
            ))}
          </div>
          {shippingRateId ? (
            <div className="mt-4 flex items-start justify-between gap-4 border-t border-[rgb(var(--color-border))] pt-4 text-sm">
              <span className="text-[rgb(var(--color-text-muted))]">{shippingRates.find((rate) => rate.id === shippingRateId)?.courierName ?? "Pengiriman"}</span>
              <strong className="text-[rgb(var(--color-text))]">{formatMoney(shippingRates.find((rate) => rate.id === shippingRateId)?.price ?? 0)}</strong>
            </div>
          ) : null}
          <div className="mt-5 border-t border-[rgb(var(--color-border))] pt-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-[rgb(var(--color-text-muted))]">Subtotal · {itemLabel}</span>
              <strong className="text-[rgb(var(--color-text))]">{formatMoney(subtotalSnapshot)}</strong>
            </div>
            <p className="mt-3 text-xs leading-5 text-[rgb(var(--color-text-subtle))]">Subtotal di atas adalah snapshot keranjang. Server akan menghitung ulang harga produk dan biaya pengiriman sebelum membuat order.</p>
          </div>
        </aside>
      </form>
    </main>
  );
}
