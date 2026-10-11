export type ShippingRate = {
  id: string;
  provider: string;
  company: string;
  courierName: string;
  serviceCode: string;
  serviceName: string;
  description?: string;
  duration?: string;
  price: number;
  currency: "IDR";
};

export type ShippingQuoteInput = {
  tenantId: string;
  cart: import("@/core/cart").Cart;
  destinationPostalCode: string;
  destinationAreaId?: string;
  courierCodes: readonly string[];
};

export type ShippingProvider = {
  quote(input: ShippingQuoteInput): Promise<readonly ShippingRate[]>;
};
