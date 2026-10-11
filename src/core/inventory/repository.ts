import type {
  InventoryRecord,
  Reservation,
  ReservationActionInput,
  ReserveInventoryInput,
} from "./types";

/**
 * Transaction boundary for inventory.
 *
 * `reserve` MUST be implemented atomically by a production provider:
 * availability check + reserved increment + reservation creation must be
 * one transaction. The domain service intentionally does not split those
 * operations into separate calls.
 */
export interface InventoryRepository {
  getInventory(input: {
    tenantId: string;
    productId: string;
    variantId?: string;
  }): Promise<InventoryRecord | null>;

  getReservation(input: ReservationActionInput): Promise<Reservation | null>;

  reserve(input: ReserveInventoryInput): Promise<Reservation>;

  release(input: ReservationActionInput): Promise<Reservation>;

  commit(input: ReservationActionInput): Promise<Reservation>;
}
