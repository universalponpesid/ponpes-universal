"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type ProviderStatus = { provider: "midtrans" | "biteship"; configured: boolean; environment: string | null; updatedAt: string | null };
type StatusResponse = { authenticated?: boolean; adminName?: string; tenant?: { tenantId: string; name: string }; providers?: ProviderStatus[]; error?: string; message?: string };

export default function AdminProviderCredentialsPage() {
  const [token, setToken] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [adminName, setAdminName] = useState("Admin Operasional");
  const [tenantId, setTenantId] = useState("");
  const [provider, setProvider] = useState<"midtrans" | "biteship">("midtrans");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [credential, setCredential] = useState("");
  const [publicClientKey, setPublicClientKey] = useState("");
  const [originPostalCode, setOriginPostalCode] = useState("");
  const [statuses, setStatuses] = useState<ProviderStatus[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/provider-credentials", { cache: "no-store" });
      const data = await response.json() as StatusResponse;
      setAuthenticated(response.ok && data.authenticated === true);
      if (data.adminName) setAdminName(data.adminName);
    } catch { setAuthenticated(false); }
  }, []);
  useEffect(() => { void checkSession(); }, [checkSession]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const data = await response.json() as StatusResponse;
      if (!response.ok) throw new Error(data.error || "Login gagal.");
      setToken(""); setAuthenticated(true); setAdminName(data.adminName || "Admin Operasional");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Login gagal."); }
    finally { setBusy(false); }
  }

  async function loadStatus(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/provider-credentials?tenantId=${encodeURIComponent(tenantId.trim())}`, { cache: "no-store" });
      const data = await response.json() as StatusResponse;
      if (!response.ok) throw new Error(data.error || "Konfigurasi tenant gagal dibaca.");
      setStatuses(data.providers || []);
      setNotice(`Konfigurasi tenant ${data.tenant?.name || data.tenant?.tenantId || tenantId} berhasil dimuat.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal memuat status."); }
    finally { setBusy(false); }
  }

  async function saveCredential(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/provider-credentials", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenantId.trim(), provider, environment, credential, publicClientKey: provider === "midtrans" ? publicClientKey : undefined, originPostalCode: provider === "biteship" ? Number(originPostalCode) : undefined }),
      });
      const data = await response.json() as StatusResponse;
      if (!response.ok) throw new Error(data.error || "Kredensial gagal disimpan.");
      setCredential("");
      const successMessage = data.message || "Kredensial berhasil disimpan.";
      await loadStatus();
      setNotice(successMessage);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Kredensial gagal disimpan."); }
    finally { setBusy(false); }
  }

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    setAuthenticated(false); setStatuses([]); setNotice("");
  }

  if (!authenticated) return <main className="min-h-screen bg-[#f5f7f5] px-4 py-12 text-[#142019]"><section className="mx-auto max-w-md rounded-3xl border border-black/5 bg-white p-7 shadow-xl sm:p-9"><div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-900 font-bold text-white">UM</div><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-800">Universal Mart · Security</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Provider credentials</h1><p className="mt-3 text-sm leading-6 text-[#5b6962]">Login admin untuk menyimpan kredensial provider tenant. API Key dienkripsi di server dan tidak ditampilkan kembali.</p><form onSubmit={login} className="mt-7 space-y-4"><label className="block text-sm font-medium">Admin operations token<input autoComplete="current-password" type="password" value={token} onChange={(event) => setToken(event.target.value)} required className="mt-2 w-full rounded-xl border border-black/15 px-4 py-3 outline-none focus:border-emerald-700" /></label><button disabled={busy} className="w-full rounded-xl bg-emerald-900 px-4 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Memeriksa…" : "Login"}</button></form>{error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}</section></main>;

  return <main className="min-h-screen bg-[#f5f7f5] px-4 py-8 text-[#142019] sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-800">Universal Mart · Security</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Provider credentials</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#5b6962]">Kelola API Key per tenant. Server mengenkripsi secret menggunakan AES-256-GCM sebelum menyimpannya ke Google Sheets.</p></div><button onClick={logout} className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold">Keluar · {adminName}</button></header>
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Penting:</strong> buat tab <code>TenantSecrets</code> pada setiap spreadsheet tenant dengan header yang tersedia di panduan patch. Master key hanya boleh berada di environment server, bukan di Sheets atau browser.</div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[.9fr_1.1fr]"><section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-semibold">1. Pilih tenant</h2><p className="mt-1 text-sm text-[#5b6962]">Untuk marketplace, masukkan tenant ID yang terdaftar pada registry platform. Untuk single_store, gunakan tenant ID instalasi ini.</p><form onSubmit={loadStatus} className="mt-4 space-y-3"><label className="block text-sm font-medium">Tenant ID<input value={tenantId} onChange={(event) => setTenantId(event.target.value.toLowerCase())} required pattern="[a-z0-9][a-z0-9_-]{0,63}" className="mt-2 w-full rounded-xl border border-black/15 px-3 py-3" placeholder="universal" /></label><button disabled={busy} className="rounded-xl border border-emerald-900 px-4 py-2.5 text-sm font-semibold text-emerald-950 disabled:opacity-60">{busy ? "Memuat…" : "Periksa konfigurasi"}</button></form><div className="mt-5 space-y-2">{statuses.map((item) => <div key={item.provider} className="flex items-center justify-between gap-3 rounded-xl bg-[#f6f8f6] p-3"><div><p className="font-medium capitalize">{item.provider}</p><p className="text-xs text-[#5b6962]">{item.environment || "Environment belum tersimpan"}{item.updatedAt ? ` · ${new Date(item.updatedAt).toLocaleString("id-ID")}` : ""}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.configured ? "bg-emerald-100 text-emerald-900" : "bg-gray-100 text-gray-600"}`}>{item.configured ? "Terkonfigurasi" : "Belum aktif"}</span></div>)}</div></section>
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-semibold">2. Simpan atau ganti API Key</h2><form onSubmit={saveCredential} className="mt-4 space-y-4"><label className="block text-sm font-medium">Provider<select value={provider} onChange={(event) => setProvider(event.target.value as "midtrans" | "biteship")} className="mt-2 w-full rounded-xl border border-black/15 bg-white px-3 py-3"><option value="midtrans">Midtrans</option><option value="biteship">Biteship</option></select></label>{provider === "midtrans" && <label className="block text-sm font-medium">Environment<select value={environment} onChange={(event) => setEnvironment(event.target.value as "sandbox" | "production")} className="mt-2 w-full rounded-xl border border-black/15 bg-white px-3 py-3"><option value="sandbox">Sandbox</option><option value="production">Production</option></select></label>}{provider === "biteship" && <><p className="rounded-xl bg-[#f6f8f6] p-3 text-xs leading-5 text-[#5b6962]">Integrasi Biteship pada versi ini menggunakan endpoint API produksi. Gunakan API Key yang sesuai untuk endpoint tersebut.</p><label className="block text-sm font-medium">Kode pos asal<input inputMode="numeric" value={originPostalCode} onChange={(event) => setOriginPostalCode(event.target.value.replace(/[^0-9]/g, ""))} required pattern="[0-9]{5}" className="mt-2 w-full rounded-xl border border-black/15 px-3 py-3" placeholder="40294" /></label></>}
    <label className="block text-sm font-medium">{provider === "midtrans" ? "Server Key" : "API Key Biteship"}<input type="password" autoComplete="new-password" value={credential} onChange={(event) => setCredential(event.target.value)} required minLength={8} maxLength={8192} className="mt-2 w-full rounded-xl border border-black/15 px-3 py-3" placeholder="Masukkan key; tidak akan ditampilkan kembali" /></label>{provider === "midtrans" && <label className="block text-sm font-medium">Client Key publik<input value={publicClientKey} onChange={(event) => setPublicClientKey(event.target.value)} required className="mt-2 w-full rounded-xl border border-black/15 px-3 py-3" placeholder="Midtrans Client Key" /></label>}<button disabled={busy || !tenantId.trim()} className="w-full rounded-xl bg-emerald-900 px-4 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Menyimpan…" : "Enkripsi & simpan kredensial"}</button></form><p className="mt-3 text-xs leading-5 text-[#5b6962]">Tindakan ini mengaktifkan provider pada konfigurasi tenant. Untuk mengganti key, masukkan key baru dan simpan kembali.</p></section></div>
    {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}{notice && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</p>}
    <section className="mt-6 rounded-2xl border border-black/5 bg-white p-5 text-sm leading-6 text-[#5b6962] shadow-sm"><h2 className="font-semibold text-[#142019]">Catatan keamanan</h2><ul className="mt-2 list-disc space-y-1 pl-5"><li>API Key plaintext hanya dikirim melalui HTTPS dan diproses server-side.</li><li>Sheets menyimpan ciphertext, IV, authentication tag, dan versi kunci.</li><li>Master key harus terpisah dari spreadsheet dan tidak boleh memiliki prefix <code>NEXT_PUBLIC_</code>.</li><li>Akses admin memakai sesi HttpOnly yang sudah tersedia. Gunakan token admin kuat dan batasi siapa yang dapat mengaksesnya.</li></ul></section></div></main>;
}
