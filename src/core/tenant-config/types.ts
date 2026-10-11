/** Typed, server-only configuration loaded for a single tenant. Never serialize secrets to clients. */
export type ProviderEnvironment = "sandbox" | "production";
export type ProviderId = "midtrans" | "biteship" | "manual_bank_transfer" | "manual_qris";

export interface TenantStoreSettings {
  storeName: string;
  shortName: string;
  description: string;
  siteUrl: string;
  currency: "IDR";
  contactEmail: string;
  contactWhatsapp: string;
  logoUrl: string;
  primaryColor: string;
}

export interface TenantPaymentProviderConfig {
  providerId: ProviderId;
  enabled: boolean;
  environment: ProviderEnvironment | null;
  /** Reference to a secret store entry; never a raw credential. */
  secretRef: string | null;
  /** Public client key only; may be exposed to the payment widget when explicitly needed. */
  publicClientKey: string | null;
  options: Readonly<Record<string, string>>;
}

export interface TenantShippingProviderConfig {
  providerId: "biteship";
  enabled: boolean;
  secretRef: string | null;
  originPostalCode: number | null;
  options: Readonly<Record<string, string>>;
}

export interface TenantKeyValueSettings {
  readonly [key: string]: string;
}

export interface TenantCommissionRule {
  ruleId: string;
  status: "draft" | "active" | "suspended";
  rateType: "percentage" | "fixed";
  rateValue: number;
  startsAt: string | null;
  endsAt: string | null;
  version: string;
}

export interface TenantFeeRule {
  ruleId: string;
  status: "draft" | "active" | "suspended";
  feeType: "percentage" | "fixed";
  feeValue: number;
  startsAt: string | null;
  endsAt: string | null;
  version: string;
}

export interface TenantRuntimeConfig {
  tenantId: string;
  configVersion: string;
  store: TenantStoreSettings;
  paymentProviders: readonly TenantPaymentProviderConfig[];
  shippingProviders: readonly TenantShippingProviderConfig[];
  checkout: TenantKeyValueSettings;
  affiliate: TenantKeyValueSettings;
  commissionRules: readonly TenantCommissionRule[];
  feeRules: readonly TenantFeeRule[];
}

export interface TenantConfigRepository {
  load(tenantId: string, spreadsheetId: string, configVersion: string): Promise<TenantRuntimeConfig>;
}
