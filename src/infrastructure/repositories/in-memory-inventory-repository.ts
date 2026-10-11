import type { InventoryRepository } from "@/core/inventory";
import type {
  InventoryRecord,
  Reservation,
  ReservationActionInput,
  ReserveInventoryInput,
} from "@/core/inventory";

/**
 * Deterministic in-process repository for development/tests only.
 *
 * It deliberately contains no default stock. A record must be explicitly
 * seeded by the caller. Production persistence should implement the same
 * InventoryRepository contract with a transactional database.
 */
export class InMemoryInventoryRepository implements InventoryRepository {
  private readonly inventory = new Map<string, InventoryRecord>();
  private readonly reservations = new Map<string, Reservation>();

  constructor(records: readonly InventoryRecord[] = []) {
    for (const record of records) {
      this.inventory.set(this.inventoryKey(record), { ...record });
    }
  }

  async getInventory(input: {
    tenantId: string;
    productId: string;
    variantId?: string;
  }): Promise<InventoryRecord | null> {
    this.expireReservations();
    const record = this.inventory.get(this.inventoryKey(input));
    return record ? { ...record } : null;
  }

  async getReservation(input: ReservationActionInput): Promise<Reservation | null> {
    this.expireReservations();
    const reservation = this.reservations.get(input.reservationId);
    if (!reservation || reservation.tenantId !== input.tenantId) return null;
    return { ...reservation };
  }

  async reserve(input: ReserveInventoryInput): Promise<Reservation> {
    this.expireReservations();

    const existing = [...this.reservations.values()].find(
      (reservation) =>
        reservation.tenantId === input.tenantId &&
        reservation.idempotencyKey === input.idempotencyKey,
    );

    if (existing) {
      if (
        existing.productId !== input.productId ||
        existing.variantId !== input.variantId ||
        existing.quantity !== input.quantity
      ) {
        throw new Error("Idempotency key was already used for a different reservation.");
      }

      if (existing.status === "active" || existing.status === "committed") {
        return { ...existing };
      }

      this.reservations.delete(existing.id);
    }

    const key = this.inventoryKey(input);
    const record = this.inventory.get(key);

    if (!record) throw new Error("Inventory record was not found.");
    if (record.status !== "active") throw new Error("Inventory is inactive.");

    const available = record.onHand - record.reserved;
    if (available < input.quantity) throw new Error("Insufficient inventory.");

    const now = new Date().toISOString();
    const reservation: Reservation = {
      id: crypto.randomUUID(),
      idempotencyKey: input.idempotencyKey,
      tenantId: input.tenantId,
      inventoryId: record.id,
      productId: input.productId,
      variantId: input.variantId,
      quantity: input.quantity,
      status: "active",
      expiresAt: input.expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    record.reserved += input.quantity;
    record.updatedAt = now;
    this.reservations.set(reservation.id, reservation);

    return { ...reservation };
  }

  async release(input: ReservationActionInput): Promise<Reservation> {
    this.expireReservations();
    const reservation = this.requireReservation(input);

    if (reservation.status !== "active") return { ...reservation };

    const record = this.inventory.get(reservation.inventoryId);
    if (!record) throw new Error("Inventory record was not found.");

    const now = new Date().toISOString();
    record.reserved = Math.max(0, record.reserved - reservation.quantity);
    record.updatedAt = now;
    reservation.status = "released";
    reservation.updatedAt = now;

    return { ...reservation };
  }

  async commit(input: ReservationActionInput): Promise<Reservation> {
    this.expireReservations();
    const reservation = this.requireReservation(input);

    if (reservation.status === "committed") return { ...reservation };
    if (reservation.status !== "active") {
      throw new Error(`Reservation cannot be committed from status: ${reservation.status}.`);
    }

    const record = this.inventory.get(reservation.inventoryId);
    if (!record) throw new Error("Inventory record was not found.");
    if (record.onHand < reservation.quantity || record.reserved < reservation.quantity) {
      throw new Error("Inventory state is inconsistent with the reservation.");
    }

    const now = new Date().toISOString();
    record.onHand -= reservation.quantity;
    record.reserved -= reservation.quantity;
    record.updatedAt = now;
    reservation.status = "committed";
    reservation.updatedAt = now;

    return { ...reservation };
  }

  private requireReservation(input: ReservationActionInput): Reservation {
    const reservation = this.reservations.get(input.reservationId);
    if (!reservation || reservation.tenantId !== input.tenantId) {
      throw new Error("Reservation was not found.");
    }
    return reservation;
  }

  private expireReservations(): void {
    const now = Date.now();

    for (const reservation of this.reservations.values()) {
      if (reservation.status !== "active") continue;
      if (Date.parse(reservation.expiresAt) > now) continue;

      const record = this.inventory.get(reservation.inventoryId);
      if (record) {
        record.reserved = Math.max(0, record.reserved - reservation.quantity);
        record.updatedAt = new Date(now).toISOString();
      }

      reservation.status = "expired";
      reservation.updatedAt = new Date(now).toISOString();
    }
  }

  private inventoryKey(input: {
    tenantId: string;
    productId: string;
    variantId?: string;
  }): string {
    return [input.tenantId, input.productId, input.variantId ?? "__base__"].join("::");
  }
}
