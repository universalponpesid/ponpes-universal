import "server-only";

import { MidtransProvider } from "./midtrans";
import { paymentConfig } from "@/config/payment";
import { resolveMidtransRuntimeConfig } from "@/infrastructure/tenant-config/provider-config";

/** Legacy factory retained for code paths not yet migrated. */
export function getMidtransProvider(): MidtransProvider {
  return new MidtransProvider(paymentConfig.midtrans.serverKey, paymentConfig.midtrans.environment);
}

export async function getTenantMidtransProvider(tenantId: string) {
  const config = await resolveMidtransRuntimeConfig(tenantId);
  if (!config.enabled) throw new Error("Midtrans dinonaktifkan untuk tenant ini.");
  if (!config.serverKey.trim()) throw new Error("Midtrans Server Key belum dikonfigurasi untuk tenant ini.");
  return {
    provider: new MidtransProvider(config.serverKey, config.environment),
    config,
  };
}
