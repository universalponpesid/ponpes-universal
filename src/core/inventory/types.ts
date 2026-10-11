export type InventoryStatus = "active" | "inactive";

export type ReservationStatus = "active" | "committed" | "released" | "expired";

export type InventoryRecord = {
  id: string;
  tenantId: string;
  productId: string;
  variantId?: string;
  onHand: number;
  reserved: number;
  status: InventoryStatus;
  updatedAt?: string;
};

export type InventoryAvailability = {
  inventoryId: string;
  tenantId: string;
  productId: string;
  variantId?: string;
  onHand: number;
  reserved: number;
  available: number;
  status: InventoryStatus;
};

export type Reservation = {
  id: string;
  idempotencyKey: string;
  tenantId: string;
  inventoryId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ReserveInventoryInput = {
  tenantId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  expiresAt: string;
  idempotencyKey: string;
};

export type ReservationActionInput = {
  tenantId: string;
  reservationId: string;
};
