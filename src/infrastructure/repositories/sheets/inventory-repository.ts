
import type { DataProvider } from "@/infrastructure/providers/data-provider";
import type {
  InventoryRecord,
  InventoryRepository,
  Reservation,
  ReservationActionInput,
  ReserveInventoryInput,
} from "@/core/inventory";
import { dataConfig } from "@/config/data";
import {
  parseNumber,
  rowsToObjects,
  type SheetRow,
} from "./row-utils";

type VariantInventoryRow = SheetRow & {
  id?: string;
  tenant_id?: string;
  product_id?: string;
  stock?: string;
  reserved_stock?: string;
  status?: string;
};

type ReservationRow = SheetRow & {
  id?: string;
  tenant_id?: string;
  variant_id?: string;
  product_id?: string;
  session_id?: string;
  order_id?: string;
  qty?: string;
  status?: string;
  expires_at?: string;
  created_at?: string;
  released_at?: string;
  committed_at?: string;
  idempotency_key?: string;
  updated_at?: string;
};

const RESERVATION_STATUSES = new Set([
  "active",
  "committed",
  "released",
  "expired",
]);

export class SheetsInventoryRepository
  implements InventoryRepository
{
  constructor(
    private readonly provider: DataProvider,
  ) {}

  async getInventory(input: {
    tenantId: string;
    productId: string;
    variantId?: string;
  }): Promise<InventoryRecord | null> {
    if (!input.variantId) return null;

    const rows = await this.provider.getRows(
      dataConfig.sheets.productVariants,
    );

    const objects = rowsToObjects(rows);

    const row = objects.find(
      (candidate) =>
        candidate.tenant_id === input.tenantId &&
        candidate.product_id === input.productId &&
        candidate.id === input.variantId,
    ) as VariantInventoryRow | undefined;

    if (!row?.id || !row.product_id || !row.tenant_id) {
      return null;
    }

    return {
      id: row.id,
      tenantId: row.tenant_id,
      productId: row.product_id,
      variantId: row.id,
      onHand: parseNumber(row.stock),
      reserved: parseNumber(row.reserved_stock),
      status: row.status === "active" ? "active" : "inactive",
      updatedAt: new Date().toISOString(),
    };
  }

  async getReservation(
    input: ReservationActionInput,
  ): Promise<Reservation | null> {
    const rows = await this.provider.getRows(
      dataConfig.sheets.reservations,
    );

    const row = rowsToObjects(rows).find(
      (candidate) =>
        candidate.id === input.reservationId &&
        candidate.tenant_id === input.tenantId,
    ) as ReservationRow | undefined;

    return row ? this.mapReservation(row) : null;
  }

  async reserve(
    input: ReserveInventoryInput,
  ): Promise<Reservation> {
    const existing = await this.findByIdempotencyKey(
      input.tenantId,
      input.idempotencyKey,
    );

    if (existing) {
      if (existing.status === "committed") return existing;
      if (existing.status === "active" && Date.parse(existing.expiresAt) > Date.now()) {
        return existing;
      }
      throw new Error(
        "Idempotency key reservasi ini sudah pernah dipakai. Gunakan checkout key baru untuk percobaan baru.",
      );
    }

    const inventory = await this.getInventory(input);

    if (!inventory) {
      throw new Error("Inventory record was not found.");
    }

    if (inventory.status !== "active") {
      throw new Error("Inventory is inactive.");
    }

    if (
      inventory.onHand - inventory.reserved <
      input.quantity
    ) {
      throw new Error("Insufficient inventory.");
    }

    const updatedReserved =
      inventory.reserved + input.quantity;

    await this.updateInventoryRow(
      input.tenantId,
      input.variantId,
      updatedReserved,
      inventory.onHand,
    );

    const now = new Date().toISOString();

    const reservation: Reservation = {
      id: crypto.randomUUID(),
      idempotencyKey: input.idempotencyKey,
      tenantId: input.tenantId,
      inventoryId: inventory.id,
      productId: input.productId,
      variantId: input.variantId,
      quantity: input.quantity,
      status: "active",
      expiresAt: input.expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    await this.appendReservation(reservation);

    return reservation;
  }

  async release(
    input: ReservationActionInput,
  ): Promise<Reservation> {
    const reservation = await this.getReservation(input);

    if (!reservation) {
      throw new Error("Reservation was not found.");
    }

    if (reservation.status !== "active") {
      return reservation;
    }

    const inventory = await this.getInventory({
      tenantId: input.tenantId,
      productId: reservation.productId,
      variantId: reservation.variantId,
    });

    if (!inventory) {
      throw new Error("Inventory record was not found.");
    }

    await this.updateInventoryRow(
      input.tenantId,
      reservation.variantId,
      Math.max(
        0,
        inventory.reserved - reservation.quantity,
      ),
      inventory.onHand,
    );

    const updated: Reservation = {
      ...reservation,
      status: "released",
      updatedAt: new Date().toISOString(),
    };

    await this.updateReservationRow(updated);

    return updated;
  }

  async commit(
    input: ReservationActionInput,
  ): Promise<Reservation> {
    const reservation = await this.getReservation(input);

    if (!reservation) {
      throw new Error("Reservation was not found.");
    }

    if (reservation.status === "committed") {
      return reservation;
    }

    if (reservation.status !== "active") {
      throw new Error(
        `Reservation cannot be committed from status: ${reservation.status}.`,
      );
    }

    const inventory = await this.getInventory({
      tenantId: input.tenantId,
      productId: reservation.productId,
      variantId: reservation.variantId,
    });

    if (
      !inventory ||
      inventory.onHand < reservation.quantity ||
      inventory.reserved < reservation.quantity
    ) {
      throw new Error(
        "Inventory state is inconsistent with the reservation.",
      );
    }

    await this.updateInventoryRow(
      input.tenantId,
      reservation.variantId,
      inventory.reserved - reservation.quantity,
      inventory.onHand - reservation.quantity,
    );

    const updated: Reservation = {
      ...reservation,
      status: "committed",
      updatedAt: new Date().toISOString(),
    };

    await this.updateReservationRow(updated);

    return updated;
  }

  private async findByIdempotencyKey(
    tenantId: string,
    key: string,
  ): Promise<Reservation | null> {
    const rows = await this.provider.getRows(
      dataConfig.sheets.reservations,
    );

    const row = rowsToObjects(rows).find(
      (candidate) =>
        candidate.tenant_id === tenantId &&
        candidate.idempotency_key === key,
    ) as ReservationRow | undefined;

    return row ? this.mapReservation(row) : null;
  }

  private mapReservation(
    row: ReservationRow,
  ): Reservation {
    const status = row.status;
    if (!status || !RESERVATION_STATUSES.has(status)) {
      throw new Error("Invalid stock reservation status.");
    }

    if (
      !row.id ||
      !row.tenant_id ||
      !row.product_id ||
      !row.expires_at ||
      !row.created_at ||
      !row.updated_at
    ) {
      throw new Error("Invalid stock reservation row.");
    }

    return {
      id: row.id,
      idempotencyKey: row.idempotency_key ?? row.id,
      tenantId: row.tenant_id,
      inventoryId: row.variant_id ?? row.product_id,
      productId: row.product_id,
      variantId: row.variant_id || undefined,
      quantity: parseNumber(row.qty, 1),
      status: status as Reservation["status"],
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private async appendReservation(
    reservation: Reservation,
  ): Promise<void> {
    await this.provider.appendRow(
      dataConfig.sheets.reservations,
      [
        reservation.id,
        reservation.tenantId,
        reservation.variantId ?? "",
        reservation.productId,
        "",
        "",
        String(reservation.quantity),
        reservation.status,
        reservation.expiresAt,
        reservation.createdAt,
        "",
        "",
        reservation.idempotencyKey,
        reservation.updatedAt,
      ],
    );
  }

  private async updateReservationRow(
    reservation: Reservation,
  ): Promise<void> {
    const rows = await this.provider.getRows(
      dataConfig.sheets.reservations,
    );

    const headers =
      rows[0]?.map((value) =>
        value.trim().toLowerCase().replace(/\s+/g, "_"),
      ) ?? [];

    const idIndex = headers.indexOf("id");
    const tenantIndex = headers.indexOf("tenant_id");
    if (idIndex < 0 || tenantIndex < 0) {
      throw new Error("Reservation sheet requires id and tenant_id headers.");
    }

    const rowIndex = rows.slice(1).findIndex(
      (row) =>
        row[idIndex] === reservation.id &&
        row[tenantIndex] === reservation.tenantId,
    );

    if (rowIndex < 0) {
      throw new Error("Stock reservation row was not found.");
    }

    const values = Array.from(rows[rowIndex + 1]);

    const set = (name: string, value: string) => {
      const index = headers.indexOf(name);
      if (index >= 0) values[index] = value;
    };

    set("status", reservation.status);
    set("updated_at", reservation.updatedAt);
    set(
      "released_at",
      reservation.status === "released"
        ? reservation.updatedAt
        : "",
    );
    set(
      "committed_at",
      reservation.status === "committed"
        ? reservation.updatedAt
        : "",
    );

    await this.provider.updateRow(
      dataConfig.sheets.reservations,
      rowIndex + 2,
      values,
    );
  }

  private async updateInventoryRow(
    tenantId: string,
    variantId: string | undefined,
    reserved: number,
    onHand: number,
  ): Promise<void> {
    if (!variantId) {
      throw new Error(
        "variantId is required for inventory-backed variants.",
      );
    }

    const rows = await this.provider.getRows(
      dataConfig.sheets.productVariants,
    );

    const headers =
      rows[0]?.map((value) =>
        value.trim().toLowerCase().replace(/\s+/g, "_"),
      ) ?? [];

    const idIndex = headers.indexOf("id");
    const tenantIndex = headers.indexOf("tenant_id");
    if (idIndex < 0 || tenantIndex < 0) {
      throw new Error("Product variant sheet requires id and tenant_id headers.");
    }

    const rowIndex = rows.slice(1).findIndex(
      (row) => row[idIndex] === variantId && row[tenantIndex] === tenantId,
    );

    if (rowIndex < 0) {
      throw new Error("Inventory variant row was not found.");
    }

    const stockIndex = headers.indexOf("stock");
    const reservedIndex = headers.indexOf("reserved_stock");

    if (stockIndex < 0 || reservedIndex < 0) {
      throw new Error(
        "Inventory columns stock/reserved_stock are required.",
      );
    }

    const values = Array.from(rows[rowIndex + 1]);
    values[stockIndex] = String(onHand);
    values[reservedIndex] = String(reserved);

    await this.provider.updateRow(
      dataConfig.sheets.productVariants,
      rowIndex + 2,
      values,
    );
  }
}