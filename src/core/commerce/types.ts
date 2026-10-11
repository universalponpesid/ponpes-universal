export type ProductMedia = {
  id: string;
  publicId: string;
  alt: string;
  sortOrder: number;
};

export type RatingSummary = {
  average: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export type Customer = {
  id: string;
  tenantId: string;
  name: string;
  email?: string;
  phone?: string;
};

export type Address = {
  id: string;
  customerId: string;
  label: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  city: string;
  province: string;
  postalCode: string;
};

export type OrderStatus =
  | "pending_payment"
  | "payment_verification"
  | "paid"
  | "processing"
  | "ready_to_ship"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled"
  | "expired"
  | "refunded";

export type PaymentStatus =
  | "pending"
  | "verification"
  | "paid"
  | "failed"
  | "expired"
  | "refunded";

export type ShipmentStatus =
  | "pending"
  | "booked"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "failed";

export type ReservationStatus =
  | "active"
  | "committed"
  | "released"
  | "expired";

export type Attribution = {
  affiliateRef?: string;
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  sessionId?: string;
};
