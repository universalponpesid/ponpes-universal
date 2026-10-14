import "server-only";

import type { PaymentInstruction } from "@/core/payments";
import { paymentConfig } from "@/config/payment";
import { getCommerceConfig } from "@/infrastructure/config/commerce-config";
import { resolveTenantConfig } from "./resolver";
import { resolveProviderSecret } from "@/infrastructure/secrets";

export type MidtransRuntimeConfig = {
  enabled: boolean;
  environment: "sandbox" | "production";
  serverKey: string;
  clientKey: string;
  source: "tenant" | "legacy_env";
};

export type BiteshipRuntimeConfig = {
  enabled: boolean;
  apiKey: string;
  originPostalCode: number;
  source: "tenant" | "legacy_env";
};

export type TenantPaymentPresentation = {
  manualBank: PaymentInstruction;
  manualQris: PaymentInstruction;
  manualBankEnabled: boolean;
  manualQrisEnabled: boolean;
  source: "tenant" | "legacy_env";
};

function legacyPostalCode(): number {
  const value = Number(process.env.BITESHIP_ORIGIN_POSTAL_CODE ?? "0");
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("BITESHIP_ORIGIN_POSTAL_CODE belum dikonfigurasi.");
  }
  return value;
}

function assertTenantSecretRef(secretRef: string | null, tenantId: string, provider: "midtrans" | "biteship"): void {
  if (!secretRef) throw new Error(`Provider ${provider} aktif belum memiliki secret_ref.`);
  const expected = `tenant-secret:${tenantId}:${provider}`;
  if (secretRef.trim() !== expected) {
    throw new Error(`secret_ref provider ${provider} harus menunjuk kredensial khusus tenant '${tenantId}'.`);
  }
}

async function getTenantSecret(secretRef: string | null, tenantId: string, provider: "midtrans" | "biteship"): Promise<string> {
  assertTenantSecretRef(secretRef, tenantId, provider);
  return resolveProviderSecret(secretRef);
}

function instructionFromOptions(
  method: "manual_bank_transfer" | "manual_qris",
  options: Readonly<Record<string, string>> | undefined,
): PaymentInstruction {
  const values = options ?? {};
  if (method === "manual_bank_transfer") {
    return {
      method,
      title: values.title?.trim() || "Transfer Bank",
      description: values.description?.trim() || "Transfer sesuai nominal order, lalu konfirmasi pembayaran kepada admin.",
      bankName: values.bank_name?.trim() || "",
      accountName: values.account_name?.trim() || "",
      accountNumber: values.account_number?.trim() || "",
    };
  }

  const qrisImageUrl = values.qris_image_url?.trim() || "";
  if (qrisImageUrl) {
    let parsedUrl: URL;
    try { parsedUrl = new URL(qrisImageUrl); } catch { throw new Error("PaymentProviders.options_json.qris_image_url harus berupa URL absolut."); }
    if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost") {
      throw new Error("PaymentProviders.options_json.qris_image_url harus menggunakan HTTPS.");
    }
  }
  return {
    method,
    title: values.title?.trim() || "QRIS",
    description: values.description?.trim() || "Scan QRIS menggunakan aplikasi pembayaran pilihan Anda, lalu konfirmasi pembayaran.",
    qrisImageUrl,
  };
}

/** Legacy environment fallback is intentionally limited to single_store migration. */
export async function resolveMidtransRuntimeConfig(tenantId: string): Promise<MidtransRuntimeConfig> {
  const commerce = getCommerceConfig();
  const config = await resolveTenantConfig(tenantId);
  const provider = config.paymentProviders.find((item) => item.providerId === "midtrans");
  if (!provider) {
    if (commerce.mode === "marketplace") {
      return { enabled: false, environment: "sandbox", serverKey: "", clientKey: "", source: "tenant" };
    }
    return {
      enabled: paymentConfig.midtrans.enabled,
      environment: paymentConfig.midtrans.environment,
      serverKey: paymentConfig.midtrans.serverKey,
      clientKey: paymentConfig.midtrans.clientKey,
      source: "legacy_env",
    };
  }
  if (!provider.enabled) return { enabled: false, environment: provider.environment ?? "sandbox", serverKey: "", clientKey: provider.publicClientKey ?? "", source: "tenant" };
  if (!provider.environment) throw new Error("PaymentProviders.environment wajib sandbox atau production untuk Midtrans aktif.");
  if (!provider.publicClientKey) throw new Error("PaymentProviders.public_client_key wajib diisi untuk Midtrans aktif.");
  return {
    enabled: true,
    environment: provider.environment,
    serverKey: await getTenantSecret(provider.secretRef, config.tenantId, "midtrans"),
    clientKey: provider.publicClientKey,
    source: "tenant",
  };
}

export async function resolveBiteshipRuntimeConfig(tenantId: string): Promise<BiteshipRuntimeConfig> {
  const commerce = getCommerceConfig();
  const config = await resolveTenantConfig(tenantId);
  const provider = config.shippingProviders.find((item) => item.providerId === "biteship");
  if (!provider) {
    if (commerce.mode === "marketplace") {
      return { enabled: false, apiKey: "", originPostalCode: 0, source: "tenant" };
    }
    const apiKey = process.env.BITESHIP_API_KEY?.trim() ?? "";
    return {
      enabled: Boolean(apiKey),
      apiKey,
      originPostalCode: apiKey ? legacyPostalCode() : 0,
      source: "legacy_env",
    };
  }
  if (!provider.enabled) return { enabled: false, apiKey: "", originPostalCode: provider.originPostalCode ?? 0, source: "tenant" };
  if (!provider.originPostalCode) throw new Error("ShippingProviders.origin_postal_code wajib diisi untuk Biteship aktif.");
  return {
    enabled: true,
    apiKey: await getTenantSecret(provider.secretRef, config.tenantId, "biteship"),
    originPostalCode: provider.originPostalCode,
    source: "tenant",
  };
}

/** Public/manual payment instructions may live in tenant Sheets; provider credentials never do. */
export async function resolveTenantPaymentPresentation(tenantId: string): Promise<TenantPaymentPresentation> {
  const commerce = getCommerceConfig();
  const config = await resolveTenantConfig(tenantId);
  const bankProvider = config.paymentProviders.find((item) => item.providerId === "manual_bank_transfer");
  const qrisProvider = config.paymentProviders.find((item) => item.providerId === "manual_qris");
  const hasTenantPresentation = Boolean(bankProvider || qrisProvider);

  if (!hasTenantPresentation && commerce.mode === "single_store") {
    return {
      manualBank: paymentConfig.manualBankTransfer,
      manualQris: paymentConfig.manualQris,
      manualBankEnabled: true,
      manualQrisEnabled: true,
      source: "legacy_env",
    };
  }

  const manualBankEnabled = bankProvider?.enabled ?? false;
  const manualQrisEnabled = qrisProvider?.enabled ?? false;
  const bankOptions = bankProvider?.options;
  const qrisOptions = qrisProvider?.options;

  if (manualBankEnabled && (!bankOptions?.bank_name?.trim() || !bankOptions.account_name?.trim() || !bankOptions.account_number?.trim())) {
    throw new Error("Provider transfer bank aktif wajib memiliki bank_name, account_name, dan account_number pada options_json.");
  }
  if (manualQrisEnabled && !qrisOptions?.qris_image_url?.trim()) {
    throw new Error("Provider QRIS aktif wajib memiliki qris_image_url pada options_json.");
  }

  return {
    manualBank: instructionFromOptions("manual_bank_transfer", manualBankEnabled ? bankOptions : undefined),
    manualQris: instructionFromOptions("manual_qris", manualQrisEnabled ? qrisOptions : undefined),
    manualBankEnabled,
    manualQrisEnabled,
    source: "tenant",
  };
}
