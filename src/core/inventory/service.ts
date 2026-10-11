import type { InventoryRepository } from "./repository";
import { ReservationEngine } from "./reservation-engine";
import type {
  InventoryAvailability,
  Reservation,
  ReserveInventoryInput,
} from "./types";

export class InventoryService {
  private readonly reservations: ReservationEngine;

  constructor(private readonly repository: InventoryRepository) {
    this.reservations = new ReservationEngine(repository);
  }

  async getAvailability(input: {
    tenantId: string;
    productId: string;
    variantId?: string;
  }): Promise<InventoryAvailability | null> {
    const record = await this.repository.getInventory(input);
    if (!record) return null;

    return {
      inventoryId: record.id,
      tenantId: record.tenantId,
      productId: record.productId,
      variantId: record.variantId,
      onHand: record.onHand,
      reserved: record.reserved,
      available: Math.max(0, record.onHand - record.reserved),
      status: record.status,
    };
  }

  async assertAvailable(input: {
    tenantId: string;
    productId: string;
    variantId?: string;
    quantity: number;
  }): Promise<InventoryAvailability> {
    if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 99) {
      throw new Error("Inventory quantity must be an integer between 1 and 99.");
    }

    const availability = await this.getAvailability(input);
    if (!availability) throw new Error("Inventory record was not found.");
    if (availability.status !== "active") throw new Error("Inventory is inactive.");
    if (availability.available < input.quantity) throw new Error("Insufficient inventory.");

    return availability;
  }

  reserve(input: ReserveInventoryInput): Promise<Reservation> {
    return this.reservations.reserve(input);
  }

  getReservation(input: {
    tenantId: string;
    reservationId: string;
  }): Promise<Reservation | null> {
    return this.reservations.get(input);
  }

  release(input: {
    tenantId: string;
    reservationId: string;
  }): Promise<Reservation> {
    return this.reservations.release(input);
  }

  commit(input: {
    tenantId: string;
    reservationId: string;
  }): Promise<Reservation> {
    return this.reservations.commit(input);
  }
}
