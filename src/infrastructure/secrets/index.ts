import "server-only";

import type { SecretStore } from "@/core/tenant-config/secret-store";
import { EncryptedSheetsSecretStore } from "./encrypted-sheets-secret-store";

let secretStore: SecretStore | null = null;

export function getSecretStore(): SecretStore {
  if (!secretStore) secretStore = new EncryptedSheetsSecretStore();
  return secretStore;
}

export async function resolveProviderSecret(secretRef: string | null): Promise<string> {
  if (!secretRef) throw new Error("Provider aktif belum memiliki secret_ref.");
  return getSecretStore().getSecret(secretRef);
}

export { saveTenantProviderCredential } from "./encrypted-sheets-secret-store";
