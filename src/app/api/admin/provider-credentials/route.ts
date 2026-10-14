import { NextResponse } from "next/server";
import { isAdminRequest, isSameOriginRequest, adminDisplayName } from "@/infrastructure/admin/auth";
import { resolveTenantContext } from "@/infrastructure/tenancy/tenant-resolver";
import { GoogleSheetsDataProvider } from "@/infrastructure/providers/google-sheets";
import { saveTenantProviderCredential } from "@/infrastructure/secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) { return NextResponse.json({ error: message }, { status }); }
function normalizeHeader(value: string): string { return value.trim().toLowerCase().replace(/[\s-]+/g, "_"); }

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return jsonError("Sesi admin tidak valid. Silakan login kembali.", 401);
  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenantId")?.trim();
  if (!tenantId) return NextResponse.json({ authenticated: true, adminName: adminDisplayName() });
  try {
    const tenant = await resolveTenantContext({ tenantId });
    const provider = new GoogleSheetsDataProvider(tenant.spreadsheetId);
    const [secrets, payments, shipping] = await Promise.all([
      provider.getRows("TenantSecrets"), provider.getRows("PaymentProviders"), provider.getRows("ShippingProviders"),
    ]);
    const secretHeaders = (secrets[0] ?? []).map(normalizeHeader);
    const secretRows = secrets.slice(1).map((row) => Object.fromEntries(secretHeaders.map((header, index) => [header, row[index] ?? ""])));
    const paymentHeaders = (payments[0] ?? []).map(normalizeHeader);
    const paymentRows = payments.slice(1).map((row) => Object.fromEntries(paymentHeaders.map((header, index) => [header, row[index] ?? ""])));
    const shippingHeaders = (shipping[0] ?? []).map(normalizeHeader);
    const shippingRows = shipping.slice(1).map((row) => Object.fromEntries(shippingHeaders.map((header, index) => [header, row[index] ?? ""])));
    const statuses = ["midtrans", "biteship"].map((name) => {
      const secret = secretRows.find((row) => row.secret_id === `${tenant.tenantId}:${name}` && row.tenant_id === tenant.tenantId && row.provider === name && row.status === "active");
      const config = name === "midtrans" ? paymentRows.find((row) => row.provider_id === name) : shippingRows.find((row) => row.provider_id === name);
      return { provider: name, configured: Boolean(secret && config?.enabled?.toLowerCase() === "true"), environment: secret?.environment ?? null, updatedAt: secret?.updated_at ?? null };
    });
    return NextResponse.json({ tenant: { tenantId: tenant.tenantId, name: tenant.name }, providers: statuses, adminName: adminDisplayName() }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    return jsonError(cause instanceof Error ? cause.message : "Gagal membaca konfigurasi tenant.", 400);
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return jsonError("Origin request tidak valid.", 403);
  if (!isAdminRequest(request)) return jsonError("Sesi admin tidak valid. Silakan login kembali.", 401);
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError("Body JSON tidak valid.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return jsonError("Body request tidak valid.", 400);
  const input = body as Record<string, unknown>;
  const tenantId = typeof input.tenantId === "string" ? input.tenantId.trim().toLowerCase() : "";
  const provider = input.provider;
  const environment = input.environment;
  const credential = typeof input.credential === "string" ? input.credential : "";
  if (!tenantId || !["midtrans", "biteship"].includes(String(provider))) return jsonError("Tenant dan provider yang valid wajib dipilih.", 400);
  if (environment !== "sandbox" && environment !== "production") return jsonError("Environment harus sandbox atau production.", 400);
  try {
    await saveTenantProviderCredential({
      tenantId,
      provider: provider as "midtrans" | "biteship",
      environment: provider === "biteship" ? "production" : environment,
      credential,
      publicClientKey: typeof input.publicClientKey === "string" ? input.publicClientKey : undefined,
      originPostalCode: typeof input.originPostalCode === "number" ? input.originPostalCode : Number(input.originPostalCode),
    });
    return NextResponse.json({ ok: true, message: `Kredensial ${String(provider)} berhasil dienkripsi dan disimpan. Nilai rahasia tidak akan ditampilkan kembali.` }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    // Deliberately return controlled errors only; never include credential values in logs or responses.
    return jsonError(cause instanceof Error ? cause.message : "Kredensial gagal disimpan.", 400);
  }
}
