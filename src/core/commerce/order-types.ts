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

export type PaymentMethod =
  | "midtrans"
  | "manual_bank_transfer"
  | "manual_qris";

export type OrderCurrency = "IDR";

export type OrderItem = {
  productId: string;
  variantId?: string;
  productName: string;
  variantLabel?: string;
  sku?: string;
  imagePublicId?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  /** Reservation ID is persisted with the line so paid webhooks can commit stock idempotently. */
  reservationId?: string;
};

export type OrderCustomer = {
  name: string;
  phone: string;
  email?: string;
};

export type OrderShipping = {
  destinationPostalCode: string;
  destinationAreaId?: string;
  addressLine: string;
  province?: string;
  city?: string;
  district: string;
  subdistrict?: string;
  latitude?: number;
  longitude?: number;
  recipientNote?: string;
  rateId: string;
  provider?: string;
  serviceName?: string;
  cost: number;
};

export type OrderPayment = {
  method: PaymentMethod;
  status: PaymentStatus;
  providerReference?: string;
  transactionId?: string;
  paidAt?: string;
};

export type Order = {
  id: string;
  tenantId: string;
  /** Stable client-generated key, scoped to tenant, used only for retry deduplication. */
  idempotencyKey?: string;
  status: OrderStatus;
  currency: OrderCurrency;
  customer: OrderCustomer;
  items: readonly OrderItem[];
  subtotal: number;
  shipping: OrderShipping;
  grandTotal: number;
  payment: OrderPayment;
  createdAt: string;
  updatedAt: string;
};

export type CreatePendingOrderInput = {
  tenantId: string;
  cart: import("@/core/cart").Cart;
  customer: OrderCustomer;
  idempotencyKey: string;
  reservationTtlMinutes?: number;
  shipping: OrderShipping;
  paymentMethod: PaymentMethod;
};

export type UpdatePaymentInput = {
  tenantId: string;
  orderId: string;
  status: PaymentStatus;
  orderStatus?: OrderStatus;
  providerReference?: string;
  transactionId?: string;
  paidAt?: string;
};
