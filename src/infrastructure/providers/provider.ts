/**
 * Marker interfaces for future provider adapters.
 * The first deployment can use Google Sheets for catalog data and a
 * transactional database later without changing storefront contracts.
 */
export type DataProviderName = "google-sheets" | "postgres";

export type PaymentProviderName = "midtrans" | "manual";

export type ShippingProviderName = "biteship" | "manual" | "custom";
