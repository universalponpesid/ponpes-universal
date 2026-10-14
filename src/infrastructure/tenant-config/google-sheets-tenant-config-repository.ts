import "server-only";

import type {
  ProviderEnvironment,
  ProviderId,
  TenantCommissionRule,
  TenantFeeRule,
  TenantKeyValueSettings,
  TenantPaymentProviderConfig,
  TenantRuntimeConfig,
  TenantShippingProviderConfig,
  TenantStoreSettings,
  TenantConfigRepository,
} from "@/core/tenant-config/types";
import { GoogleSheetsDataProvider } from "@/infrastructure/providers/google-sheets";

type Row = readonly string[];
type Table = { headers: string[]; rows: Row[] };

const DEFAULT_STORE: TenantStoreSettings = {
  storeName: "",
  shortName: "",
  description: "",
  siteUrl: "",
  currency: "IDR",
  contactEmail: "",
  contactWhatsapp: "",
  logoUrl: "",
  primaryColor: "#16834A",
};

function headerKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function asRecord(table: Table, row: Row): Record<string, string> {
  const record: Record<string, string> = {};
  table.headers.forEach((header, index) => { record[header] = (row[index] ?? "").trim(); });
  return record;
}

function parseTable(sheet: string, values: readonly Row[]): Table {
  if (!values.length || !values[0].some((value) => value.trim() !== "")) {
    return { headers: [], rows: [] };
  }
  const headers = values[0].map(headerKey);
  if (new Set(headers.filter(Boolean)).size !== headers.filter(Boolean).length) {
    throw new Error(`Tab ${sheet} memiliki header duplikat.`);
  }
  return { headers, rows: values.slice(1).filter((row) => row.some((cell) => cell.trim() !== "")) };
}

function booleanValue(value: string | undefined, fallback = false): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "active", "enabled"].includes(normalized)) return true;
  if (["false", "0", "no", "inactive", "disabled"].includes(normalized)) return false;
  throw new Error(`Nilai boolean konfigurasi '${value}' tidak valid.`);
}

function required(record: Record<string, string>, key: string, tab: string): string {
  const value = record[key]?.trim();
  if (!value) throw new Error(`Kolom '${key}' wajib diisi pada tab ${tab}.`);
  return value;
}

function optional(record: Record<string, string>, key: string): string | null {
  return record[key]?.trim() || null;
}

function parseEnvironment(value: string | undefined): ProviderEnvironment | null {
  if (!value) return null;
  if (value === "sandbox" || value === "production") return value;
  throw new Error(`Environment provider '${value}' tidak valid.`);
}

function parseJsonOptions(value: string | undefined): Readonly<Record<string, string>> {
  if (!value?.trim()) return {};
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error("Kolom options_json berisi JSON yang tidak valid."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Kolom options_json harus berupa objek JSON.");
  }
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(parsed)) {
    if (/(^|_)(secret|token|password|api_key|private_key|server_key|access_key)(_|$)/i.test(key)) {
      throw new Error(`options_json tidak boleh menyimpan kredensial pada key '${key}'. Simpan melalui UI admin kredensial tenant; jangan menaruh kredensial pada options_json.`);
    }
    if (typeof item !== "string" && typeof item !== "number" && typeof item !== "boolean") {
      throw new Error(`Nilai options_json '${key}' harus berupa string, number, atau boolean.`);
    }
    result[key] = String(item);
  }
  return result;
}

function keyValues(table: Table): TenantKeyValueSettings {
  const result: Record<string, string> = {};
  for (const row of table.rows) {
    const record = asRecord(table, row);
    const key = record.key?.trim();
    if (!key) throw new Error("Setiap baris konfigurasi key-value wajib memiliki kolom key.");
    if (Object.prototype.hasOwnProperty.call(result, key)) throw new Error(`Key konfigurasi '${key}' duplikat.`);
    result[key] = record.value ?? "";
  }
  return result;
}

function mapStore(table: Table, fallback: TenantStoreSettings): TenantStoreSettings {
  const values = keyValues(table);
  const merged: TenantStoreSettings = {
    storeName: values.store_name || fallback.storeName,
    shortName: values.short_name || fallback.shortName,
    description: values.description || fallback.description,
    siteUrl: values.site_url || fallback.siteUrl,
    currency: "IDR",
    contactEmail: values.contact_email || fallback.contactEmail,
    contactWhatsapp: values.contact_whatsapp || fallback.contactWhatsapp,
    logoUrl: values.logo_url || fallback.logoUrl,
    primaryColor: values.primary_color || fallback.primaryColor,
  };
  if (merged.primaryColor && !/^#[0-9a-fA-F]{6}$/.test(merged.primaryColor)) {
    throw new Error("StoreConfig.primary_color harus menggunakan format hex #RRGGBB.");
  }
  return merged;
}

function mapPaymentProviders(table: Table): TenantPaymentProviderConfig[] {
  const allowed = new Set<ProviderId>(["midtrans", "manual_bank_transfer", "manual_qris"]);
  const seen = new Set<ProviderId>();
  return table.rows.map((row) => {
    const record = asRecord(table, row);
    const providerId = required(record, "provider_id", "PaymentProviders") as ProviderId;
    if (!allowed.has(providerId)) throw new Error(`Payment provider '${providerId}' belum didukung platform.`);
    if (seen.has(providerId)) throw new Error(`PaymentProviders memiliki provider_id duplikat '${providerId}'.`);
    seen.add(providerId);
    const secretRef = optional(record, "secret_ref");
    const publicClientKey = optional(record, "public_client_key");
    if (providerId !== "midtrans" && secretRef) {
      throw new Error(`Provider '${providerId}' tidak memerlukan secret_ref pada konfigurasi pembayaran manual.`);
    }
    if (providerId !== "midtrans" && publicClientKey) {
      throw new Error(`Provider '${providerId}' tidak boleh memiliki public_client_key.`);
    }
    return {
      providerId,
      enabled: booleanValue(record.enabled),
      environment: parseEnvironment(record.environment),
      secretRef,
      publicClientKey,
      options: parseJsonOptions(record.options_json),
    };
  });
}

function mapShippingProviders(table: Table): TenantShippingProviderConfig[] {
  const seen = new Set<string>();
  return table.rows.map((row) => {
    const record = asRecord(table, row);
    const providerId = required(record, "provider_id", "ShippingProviders");
    if (providerId !== "biteship") throw new Error(`Shipping provider '${providerId}' belum didukung platform.`);
    if (seen.has(providerId)) throw new Error(`ShippingProviders memiliki provider_id duplikat '${providerId}'.`);
    seen.add(providerId);
    const rawPostalCode = optional(record, "origin_postal_code");
    const originPostalCode = rawPostalCode ? Number(rawPostalCode) : null;
    if (originPostalCode !== null && (!Number.isInteger(originPostalCode) || originPostalCode <= 0)) {
      throw new Error("ShippingProviders.origin_postal_code harus berupa kode pos numerik yang valid.");
    }
    return {
      providerId,
      enabled: booleanValue(record.enabled),
      secretRef: optional(record, "secret_ref"),
      originPostalCode,
      options: parseJsonOptions(record.options_json),
    };
  });
}

function mapCommissionRules(table: Table): TenantCommissionRule[] {
  return table.rows.map((row) => {
    const record = asRecord(table, row);
    const status = required(record, "status", "CommissionRules");
    const rateType = required(record, "rate_type", "CommissionRules");
    const rateValue = Number(required(record, "rate_value", "CommissionRules"));
    if (!(["draft", "active", "suspended"] as const).includes(status as TenantCommissionRule["status"])) throw new Error("CommissionRules.status tidak valid.");
    if (rateType !== "percentage" && rateType !== "fixed") throw new Error("CommissionRules.rate_type harus percentage atau fixed.");
    if (!Number.isFinite(rateValue) || rateValue < 0 || (rateType === "percentage" && rateValue > 100)) throw new Error("CommissionRules.rate_value tidak valid.");
    return { ruleId: required(record, "rule_id", "CommissionRules"), status: status as TenantCommissionRule["status"], rateType, rateValue, startsAt: optional(record, "starts_at"), endsAt: optional(record, "ends_at"), version: record.version || "1" };
  });
}

function mapFeeRules(table: Table): TenantFeeRule[] {
  return table.rows.map((row) => {
    const record = asRecord(table, row);
    const status = required(record, "status", "FeeRules");
    const feeType = required(record, "fee_type", "FeeRules");
    const feeValue = Number(required(record, "fee_value", "FeeRules"));
    if (!(["draft", "active", "suspended"] as const).includes(status as TenantFeeRule["status"])) throw new Error("FeeRules.status tidak valid.");
    if (feeType !== "percentage" && feeType !== "fixed") throw new Error("FeeRules.fee_type harus percentage atau fixed.");
    if (!Number.isFinite(feeValue) || feeValue < 0 || (feeType === "percentage" && feeValue > 100)) throw new Error("FeeRules.fee_value tidak valid.");
    return { ruleId: required(record, "rule_id", "FeeRules"), status: status as TenantFeeRule["status"], feeType, feeValue, startsAt: optional(record, "starts_at"), endsAt: optional(record, "ends_at"), version: record.version || "1" };
  });
}

async function getOptionalRows(provider: GoogleSheetsDataProvider, sheet: string): Promise<readonly Row[]> {
  try {
    return await provider.getRows(sheet) as readonly Row[];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // During the single-store migration, legacy deployments may not have created
    // configuration tabs yet. Only treat a missing range/tab as optional; auth,
    // network and permission failures must still fail loudly.
    if (/unable to parse range|range .*not found|sheet .*not found|unable to find sheet/i.test(message)) return [];
    throw error;
  }
}

export class GoogleSheetsTenantConfigRepository implements TenantConfigRepository {
  constructor(private readonly providerFactory: (spreadsheetId: string) => GoogleSheetsDataProvider = (id) => new GoogleSheetsDataProvider(id)) {}

  async load(tenantId: string, spreadsheetId: string, configVersion: string): Promise<TenantRuntimeConfig> {
    const provider = this.providerFactory(spreadsheetId);
    const sheetNames = ["StoreConfig", "PaymentProviders", "ShippingProviders", "CheckoutSettings", "AffiliateSettings", "CommissionRules", "FeeRules"] as const;
    const tables = await Promise.all(sheetNames.map(async (name) => [name, parseTable(name, await getOptionalRows(provider, name))] as const));
    const byName = new Map(tables);
    const store = mapStore(byName.get("StoreConfig") ?? { headers: [], rows: [] }, DEFAULT_STORE);
    const paymentProviders = mapPaymentProviders(byName.get("PaymentProviders") ?? { headers: [], rows: [] });
    const shippingProviders = mapShippingProviders(byName.get("ShippingProviders") ?? { headers: [], rows: [] });
    return {
      tenantId,
      configVersion,
      store,
      paymentProviders,
      shippingProviders,
      checkout: keyValues(byName.get("CheckoutSettings") ?? { headers: [], rows: [] }),
      affiliate: keyValues(byName.get("AffiliateSettings") ?? { headers: [], rows: [] }),
      commissionRules: mapCommissionRules(byName.get("CommissionRules") ?? { headers: [], rows: [] }),
      feeRules: mapFeeRules(byName.get("FeeRules") ?? { headers: [], rows: [] }),
    };
  }
}
