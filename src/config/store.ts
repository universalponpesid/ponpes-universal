/**
 * Store / tenant configuration.
 *
 * Universal Mart is tenant #001 today, but the shape is intentionally
 * tenant-aware so the core can later support multiple independent stores.
 */
export type StoreProductType =
  | "physical"
  | "digital"
  | "service"
  | "property"
  | "vehicle";

export type StorePaymentConfig = {
  midtrans: boolean;
  manualBankTransfer: boolean;
  manualQris: boolean;
};

export type StoreShippingConfig = {
  biteship: boolean;
  localCourier: boolean;
};

export type StoreFeatures = {
  reviews: boolean;
  ratings: boolean;
  wishlist: boolean;
  affiliates: boolean;
  coupons: boolean;
  productVariants: boolean;
  productTypes: StoreProductType[];
};

export type StoreConfig = {
  tenantId: string;
  storeId: string;
  name: string;
  shortName: string;
  description: string;
  locale: string;
  currency: "IDR";
  siteUrl: string;
  contact: {
    email?: string;
    whatsapp?: string;
  };
  payment: StorePaymentConfig;
  shipping: StoreShippingConfig;
  features: StoreFeatures;
};

export const storeConfig: StoreConfig = {
  tenantId: process.env.NEXT_PUBLIC_TENANT_ID ?? "universal",
  storeId: process.env.NEXT_PUBLIC_STORE_ID ?? "universal-mart",
  name: process.env.NEXT_PUBLIC_STORE_NAME ?? "Universal Mart",
  shortName: process.env.NEXT_PUBLIC_STORE_SHORT_NAME ?? "Universal Mart",
  description:
    process.env.NEXT_PUBLIC_STORE_DESCRIPTION ??
    "Official online store of Universal Pesantren.",
  locale: "id-ID",
  currency: "IDR",
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  contact: {
    email: process.env.NEXT_PUBLIC_STORE_EMAIL,
    whatsapp: process.env.NEXT_PUBLIC_STORE_WHATSAPP,
  },
  payment: {
    midtrans: true,
    manualBankTransfer: true,
    manualQris: true,
  },
  shipping: {
    biteship: true,
    localCourier: false,
  },
  features: {
    reviews: true,
    ratings: true,
    wishlist: true,
    affiliates: true,
    coupons: false,
    productVariants: true,
    productTypes: ["physical"],
  },
};
