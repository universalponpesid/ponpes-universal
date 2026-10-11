import "server-only";

import { paymentConfig } from "@/config/payment";
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

function legacyPostalCode(): number {
  const value = Number(process.env.BITESHIP_ORIGIN_POSTAL_CODE ?? "0");
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("BITESHIP_ORIGIN_POSTAL_CODE belum dikonfigurasi.");
  }
  return value;
}

/** Tenant row wins when present. Legacy environment fallback keeps existing single-store deployments working during migration. */
export async function resolveMidtransRuntimeConfig(tenantId: string): Promise<MidtransRuntimeConfig> {
  const config = await resolveTenantConfig(tenantId);
  const provider = config.paymentProviders.find((item) => item.providerId === "midtrans");
  if (!provider) {
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
    serverKey: await resolveProviderSecret(provider.secretRef),
    clientKey: provider.publicClientKey,
    source: "tenant",
  };
}

export async function resolveBiteshipRuntimeConfig(tenantId: string): Promise<BiteshipRuntimeConfig> {
  const config = await resolveTenantConfig(tenantId);
  const provider = config.shippingProviders.find((item) => item.providerId === "biteship");
  if (!provider) {
    return {
      enabled: Boolean(process.env.BITESHIP_API_KEY?.trim()),
      apiKey: process.env.BITESHIP_API_KEY?.trim() ?? "",
      originPostalCode: legacyPostalCode(),
      source: "legacy_env",
    };
  }
  if (!provider.enabled) return { enabled: false, apiKey: "", originPostalCode: provider.originPostalCode ?? 0, source: "tenant" };
  if (!provider.originPostalCode) throw new Error("ShippingProviders.origin_postal_code wajib diisi untuk Biteship aktif.");
  return {
    enabled: true,
    apiKey: await resolveProviderSecret(provider.secretRef),
    originPostalCode: provider.originPostalCode,
    source: "tenant",
  };
}
