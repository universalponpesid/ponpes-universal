import type { InventoryRepository } from "./repository";
import type { Reservation, ReserveInventoryInput } from "./types";

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 99;

/**
 * Reservation lifecycle engine.
 *
 * This class owns lifecycle validation, while the repository owns the
 * persistence/transaction boundary.
 */
export class ReservationEngine {
  constructor(private readonly repository: InventoryRepository) {}

  async reserve(input: ReserveInventoryInput): Promise<Reservation> {
    this.validateQuantity(input.quantity);
    this.validateTenantAndProduct(input.tenantId, input.productId);
    this.validateIdempotencyKey(input.idempotencyKey);
    this.validateExpiry(input.expiresAt);

    return this.repository.reserve(input);
  }

  get(input: {
    tenantId: string;
    reservationId: string;
  }): Promise<Reservation | null> {
    return this.repository.getReservation(input);
  }

  release(input: {
    tenantId: string;
    reservationId: string;
  }): Promise<Reservation> {
    return this.repository.release(input);
  }

  commit(input: {
    tenantId: string;
    reservationId: string;
  }): Promise<Reservation> {
    return this.repository.commit(input);
  }

  private validateQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) {
      throw new Error(`Inventory quantity must be an integer between ${MIN_QUANTITY} and ${MAX_QUANTITY}.`);
    }
  }

  private validateTenantAndProduct(tenantId: string, productId: string): void {
    if (!tenantId.trim()) throw new Error("tenantId is required.");
    if (!productId.trim()) throw new Error("productId is required.");
  }

  private validateIdempotencyKey(key: string): void {
    if (!key.trim()) {
      throw new Error("idempotencyKey is required for inventory reservation.");
    }
  }

  private validateExpiry(expiresAt: string): void {
    const timestamp = Date.parse(expiresAt);
    if (!Number.isFinite(timestamp)) {
      throw new Error("expiresAt must be a valid ISO date.");
    }
    if (timestamp <= Date.now()) {
      throw new Error("expiresAt must be in the future.");
    }
  }
}
