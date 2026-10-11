import "server-only";

import { getCommerceConfig } from "./commerce-config";

/** Fail closed until marketplace-specific tenant routing is wired into an endpoint. */
export function assertSingleStoreMode(operation: string): void {
  const config = getCommerceConfig();
  if (config.mode !== "single_store") {
    throw new Error(`Operasi '${operation}' belum tersedia pada mode marketplace. Aktifkan endpoint tenant-aware terlebih dahulu.`);
  }
}
