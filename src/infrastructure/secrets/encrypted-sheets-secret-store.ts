import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { resolveTenantContext } from "@/infrastructure/tenancy/tenant-resolver";
import { GoogleSheetsDataProvider } from "@/infrastructure/providers/google-sheets";
import type { SecretStore } from "@/core/tenant-config/secret-store";

type Provider = "midtrans" | "biteship";
type RowRecord = Record<string, string>;
const SHEET = "TenantSecrets";
const HEADERS = ["secret_id", "tenant_id", "provider", "environment", "ciphertext", "iv", "auth_tag", "key_version", "status", "updated_at"] as const;
const SECRET_REF_PREFIX = "tenant-secret:";

function normalizedHeader(value: string): string { return value.trim().toLowerCase().replace(/[\s-]+/g, "_"); }
function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} belum dikonfigurasi pada environment server.`);
  return value;
}
function activeKeyVersion(): string {
  const version = process.env.TENANT_CREDENTIALS_ACTIVE_KEY_VERSION?.trim() || "1";
  if (!/^[1-9][0-9]{0,2}$/.test(version)) throw new Error("TENANT_CREDENTIALS_ACTIVE_KEY_VERSION harus berupa angka versi positif.");
  return version;
}
function keyForVersion(version: string): Buffer {
  const encoded = requiredEnv(`TENANT_CREDENTIALS_ENCRYPTION_KEY_V${version}`);
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32 || key.toString("base64").replace(/=+$/, "") !== encoded.replace(/=+$/, "")) {
    throw new Error(`TENANT_CREDENTIALS_ENCRYPTION_KEY_V${version} harus berupa Base64 valid dari tepat 32 byte.`);
  }
  return key;
}
function aad(tenantId: string, provider: Provider, environment: string, version: string): Buffer {
  return Buffer.from(`universal-mart|${tenantId}|${provider}|${environment}|${version}`, "utf8");
}
function encrypt(plaintext: string, tenantId: string, provider: Provider, environment: string) {
  const version = activeKeyVersion();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyForVersion(version), iv);
  cipher.setAAD(aad(tenantId, provider, environment, version));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), authTag: cipher.getAuthTag().toString("base64"), keyVersion: version };
}
function decrypt(row: RowRecord): string {
  const tenantId = row.tenant_id;
  const provider = row.provider as Provider;
  const environment = row.environment;
  const version = row.key_version;
  if (!tenantId || !["midtrans", "biteship"].includes(provider) || !["sandbox", "production"].includes(environment) || !version) {
    throw new Error("Metadata kredensial tenant tidak valid.");
  }
  const decipher = createDecipheriv("aes-256-gcm", keyForVersion(version), Buffer.from(row.iv, "base64"));
  decipher.setAAD(aad(tenantId, provider, environment, version));
  decipher.setAuthTag(Buffer.from(row.auth_tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(row.ciphertext, "base64")), decipher.final()]).toString("utf8");
}
function rowToRecord(headers: readonly string[], row: readonly string[]): RowRecord {
  const result: RowRecord = {};
  headers.forEach((header, index) => { result[header] = row[index] ?? ""; });
  return result;
}
function parseSecretRef(secretRef: string): { tenantId: string; provider: Provider } {
  const match = /^tenant-secret:([a-z0-9][a-z0-9_-]{0,63}):(midtrans|biteship)$/.exec(secretRef.trim());
  if (!match) throw new Error("secret_ref harus menggunakan format tenant-secret:<tenant_id>:<provider>.");
  return { tenantId: match[1], provider: match[2] as Provider };
}

/** Encrypts and persists credentials in the tenant spreadsheet. Plaintext is never written to Sheets. */
export async function saveTenantProviderCredential(input: {
  tenantId: string;
  provider: Provider;
  environment: "sandbox" | "production";
  credential: string;
  publicClientKey?: string;
  originPostalCode?: number;
}): Promise<void> {
  const tenant = await resolveTenantContext({ tenantId: input.tenantId });
  const tenantId = tenant.tenantId;
  const credential = input.credential.trim();
  if (!credential || credential.length > 8192) throw new Error("API Key wajib diisi dan maksimal 8192 karakter.");
  if (input.provider === "midtrans" && !input.publicClientKey?.trim()) throw new Error("Midtrans membutuhkan Client Key publik.");
  if (input.provider === "biteship" && (!Number.isSafeInteger(input.originPostalCode) || Number(input.originPostalCode) <= 0)) {
    throw new Error("Kode pos asal Biteship harus berupa angka positif.");
  }

  // Fail before writing any data if the active encryption key is missing or malformed.
  const encrypted = encrypt(credential, tenantId, input.provider, input.environment);
  const provider = new GoogleSheetsDataProvider(tenant.spreadsheetId);
  const secretId = `${tenantId}:${input.provider}`;
  const secretRef = `${SECRET_REF_PREFIX}${secretId}`;
  await upsertSheetRow(provider, SHEET, "secret_id", secretId, {
    secret_id: secretId, tenant_id: tenantId, provider: input.provider, environment: input.environment,
    ciphertext: encrypted.ciphertext, iv: encrypted.iv, auth_tag: encrypted.authTag,
    key_version: encrypted.keyVersion, status: "active", updated_at: new Date().toISOString(),
  }, HEADERS);

  if (input.provider === "midtrans") {
    await upsertSheetRow(provider, "PaymentProviders", "provider_id", "midtrans", {
      provider_id: "midtrans", enabled: "true", environment: input.environment, secret_ref: secretRef,
      public_client_key: input.publicClientKey!.trim(),
    }, ["provider_id", "enabled", "environment", "secret_ref", "public_client_key", "options_json"]);
  } else {
    await upsertSheetRow(provider, "ShippingProviders", "provider_id", "biteship", {
      provider_id: "biteship", enabled: "true", secret_ref: secretRef, origin_postal_code: String(input.originPostalCode),
    }, ["provider_id", "enabled", "secret_ref", "origin_postal_code", "options_json"]);
  }
}

async function upsertSheetRow(
  provider: GoogleSheetsDataProvider,
  sheet: string,
  keyHeader: string,
  keyValue: string,
  updates: RowRecord,
  requiredHeaders: readonly string[],
): Promise<void> {
  const values = await provider.getRows(sheet);
  if (!values.length || !values[0].some((cell) => cell.trim())) throw new Error(`Tab ${sheet} belum dibuat atau belum memiliki header.`);
  const headers = values[0].map(normalizedHeader);
  const missing = requiredHeaders.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`Header tab ${sheet} belum lengkap: ${missing.join(", ")}.`);
  const keyIndex = headers.indexOf(keyHeader);
  const foundIndex = values.slice(1).findIndex((row) => (row[keyIndex] ?? "").trim() === keyValue);
  const existing = foundIndex >= 0 ? rowToRecord(headers, values[foundIndex + 1]) : {};
  const next = headers.map((header) => Object.prototype.hasOwnProperty.call(updates, header) ? updates[header] : (existing[header] ?? ""));
  if (foundIndex >= 0) await provider.updateRow(sheet, foundIndex + 2, next);
  else await provider.appendRow(sheet, next);
}

export class EncryptedSheetsSecretStore implements SecretStore {
  async getSecret(secretRef: string): Promise<string> {
    const { tenantId, provider: expectedProvider } = parseSecretRef(secretRef);
    const tenant = await resolveTenantContext({ tenantId });
    const dataProvider = new GoogleSheetsDataProvider(tenant.spreadsheetId);
    const values = await dataProvider.getRows(SHEET);
    if (!values.length) throw new Error(`Tab ${SHEET} belum dibuat pada spreadsheet tenant.`);
    const headers = values[0].map(normalizedHeader);
    const missing = HEADERS.filter((header) => !headers.includes(header));
    if (missing.length) throw new Error(`Header tab ${SHEET} belum lengkap: ${missing.join(", ")}.`);
    const records = values.slice(1).filter((row) => row.some((cell) => cell.trim())).map((row) => rowToRecord(headers, row));
    const matches = records.filter((row) => row.secret_id === `${tenantId}:${expectedProvider}` && row.tenant_id === tenantId && row.provider === expectedProvider && row.status === "active");
    if (matches.length !== 1) throw new Error(`Kredensial aktif ${expectedProvider} untuk tenant '${tenantId}' tidak ditemukan atau duplikat.`);
    const record = matches[0];
    if (expectedProvider === "midtrans") {
      const config = (await dataProvider.getRows("PaymentProviders"));
      const providerRow = findConfigRow(config, "provider_id", "midtrans");
      if (providerRow.environment && providerRow.environment !== record.environment) throw new Error("Environment Midtrans tidak cocok dengan kredensial terenkripsi.");
    }
    const plaintext = decrypt(record);
    if (!plaintext.trim()) throw new Error("Kredensial terdekripsi kosong.");
    return plaintext;
  }
}

function findConfigRow(values: readonly (readonly string[])[], key: string, expected: string): RowRecord {
  if (!values.length) throw new Error("Konfigurasi provider tenant tidak ditemukan.");
  const headers = values[0].map(normalizedHeader);
  const index = headers.indexOf(key);
  const matches = values.slice(1).filter((row) => (row[index] ?? "").trim() === expected);
  if (matches.length !== 1) throw new Error("Konfigurasi provider tidak ditemukan atau duplikat.");
  return rowToRecord(headers, matches[0]);
}

export function tenantSecretRef(tenantId: string, provider: Provider): string {
  return `${SECRET_REF_PREFIX}${tenantId}:${provider}`;
}
