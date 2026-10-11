import type {
  Order,
  OrderItem,
  OrderPayment,
  UpdatePaymentInput,
} from "@/core/commerce/order-types";
import type { OrderRepository } from "@/core/commerce/order-repository";
import type { DataProvider } from "@/infrastructure/providers/data-provider";

type SheetRow = Record<string, string>;
type StoredOrderRow = { order: Order; rowIndex: number; raw: readonly string[] };

const ORDERS_SHEET = "orders";
const REQUIRED_HEADERS = [
  "id",
  "tenant_id",
  "status",
  "currency",
  "customer_name",
  "customer_phone",
  "customer_email",
  "subtotal",
  "shipping_cost",
  "grand_total",
  "shipping_destination_postal_code",
  "shipping_destination_area_id",
  "shipping_address_line",
  "shipping_province",
  "shipping_city",
  "shipping_district",
  "shipping_subdistrict",
  "shipping_latitude",
  "shipping_longitude",
  "shipping_recipient_note",
  "shipping_rate_id",
  "shipping_provider",
  "shipping_service_name",
  "payment_method",
  "payment_status",
  "payment_provider_reference",
  "payment_transaction_id",
  "payment_paid_at",
  "items_json",
  "created_at",
  "updated_at",
  "idempotency_key",
] as const;

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function toObjects(
  rows: readonly (readonly string[])[],
): readonly { rowIndex: number; values: SheetRow; raw: readonly string[] }[] {
  if (rows.length === 0) return [];
  const headers = rows[0].map(normalizeHeader);

  return rows.slice(1).map((raw, index) => {
    const values: SheetRow = {};
    headers.forEach((header, columnIndex) => {
      if (header) values[header] = raw[columnIndex] ?? "";
    });
    return { rowIndex: index + 2, values, raw };
  }).filter(({ values }) => Object.values(values).some((value) => value.trim() !== ""));
}

function assertHeaders(rows: readonly (readonly string[])[]): readonly string[] {
  if (rows.length === 0) {
    throw new Error(
      `Sheet "${ORDERS_SHEET}" belum memiliki header. Tambahkan header order sesuai dokumentasi refaktor.`,
    );
  }
  const headers = rows[0].map(normalizeHeader);
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length > 0) {
    throw new Error(
      `Header sheet "${ORDERS_SHEET}" belum lengkap. Tambahkan kolom: ${missing.join(", ")}.`,
    );
  }
  return headers;
}

function parseJson<T>(value: string, fallback: T): T {
  if (!value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseNumber(value: string): number {
  const parsed = Number(value.replace(/[^\d.-]/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized || undefined;
}

function rowToOrder(row: SheetRow): Order {
  const items = parseJson<readonly OrderItem[]>(row.items_json ?? "", []);
  const paymentStatus = row.payment_status;
  const payment: OrderPayment = {
    method:
      row.payment_method === "manual_bank_transfer"
        ? "manual_bank_transfer"
        : row.payment_method === "manual_qris"
          ? "manual_qris"
          : "midtrans",
    status:
      paymentStatus === "verification" ||
      paymentStatus === "paid" ||
      paymentStatus === "failed" ||
      paymentStatus === "expired" ||
      paymentStatus === "refunded"
        ? paymentStatus
        : "pending",
    providerReference: optionalString(row.payment_provider_reference ?? ""),
    transactionId: optionalString(row.payment_transaction_id ?? ""),
    paidAt: optionalString(row.payment_paid_at ?? ""),
  };

  const validStatuses: readonly Order["status"][] = [
    "pending_payment", "payment_verification", "paid", "processing",
    "ready_to_ship", "shipped", "delivered", "completed",
    "cancelled", "expired", "refunded",
  ];
  const storedStatus = row.status as Order["status"];

  return {
    id: row.id ?? "",
    tenantId: row.tenant_id ?? "",
    idempotencyKey: optionalString(row.idempotency_key ?? ""),
    status: validStatuses.includes(storedStatus) ? storedStatus : "pending_payment",
    currency: "IDR",
    customer: {
      name: row.customer_name ?? "",
      phone: row.customer_phone ?? "",
      email: optionalString(row.customer_email ?? ""),
    },
    items,
    subtotal: parseNumber(row.subtotal ?? ""),
    shipping: {
      destinationPostalCode: row.shipping_destination_postal_code ?? "",
      destinationAreaId: optionalString(row.shipping_destination_area_id ?? ""),
      addressLine: row.shipping_address_line ?? "",
      province: optionalString(row.shipping_province ?? ""),
      city: optionalString(row.shipping_city ?? ""),
      district: row.shipping_district ?? "",
      subdistrict: optionalString(row.shipping_subdistrict ?? ""),
      latitude: optionalString(row.shipping_latitude ?? "") ? Number(row.shipping_latitude) : undefined,
      longitude: optionalString(row.shipping_longitude ?? "") ? Number(row.shipping_longitude) : undefined,
      recipientNote: optionalString(row.shipping_recipient_note ?? ""),
      rateId: row.shipping_rate_id ?? "",
      provider: optionalString(row.shipping_provider ?? ""),
      serviceName: optionalString(row.shipping_service_name ?? ""),
      cost: parseNumber(row.shipping_cost ?? ""),
    },
    grandTotal: parseNumber(row.grand_total ?? ""),
    payment,
    createdAt: row.created_at || new Date(0).toISOString(),
    updatedAt: row.updated_at || new Date(0).toISOString(),
  };
}

function orderToValues(order: Order): Record<string, string> {
  return {
    id: order.id,
    tenant_id: order.tenantId,
    status: order.status,
    currency: order.currency,
    customer_name: order.customer.name,
    customer_phone: order.customer.phone,
    customer_email: order.customer.email ?? "",
    subtotal: String(order.subtotal),
    shipping_cost: String(order.shipping.cost),
    grand_total: String(order.grandTotal),
    shipping_destination_postal_code: order.shipping.destinationPostalCode,
    shipping_destination_area_id: order.shipping.destinationAreaId ?? "",
    shipping_address_line: order.shipping.addressLine,
    shipping_province: order.shipping.province ?? "",
    shipping_city: order.shipping.city ?? "",
    shipping_district: order.shipping.district,
    shipping_subdistrict: order.shipping.subdistrict ?? "",
    shipping_latitude: order.shipping.latitude === undefined ? "" : String(order.shipping.latitude),
    shipping_longitude: order.shipping.longitude === undefined ? "" : String(order.shipping.longitude),
    shipping_recipient_note: order.shipping.recipientNote ?? "",
    shipping_rate_id: order.shipping.rateId,
    shipping_provider: order.shipping.provider ?? "",
    shipping_service_name: order.shipping.serviceName ?? "",
    payment_method: order.payment.method,
    payment_status: order.payment.status,
    payment_provider_reference: order.payment.providerReference ?? "",
    payment_transaction_id: order.payment.transactionId ?? "",
    payment_paid_at: order.payment.paidAt ?? "",
    items_json: JSON.stringify(order.items),
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    idempotency_key: order.idempotencyKey ?? "",
  };
}

function serializeByHeaders(
  headers: readonly string[],
  order: Order,
  existing?: readonly string[],
): readonly string[] {
  const values = orderToValues(order);
  return headers.map((header, index) => {
    const normalized = normalizeHeader(header);
    return Object.prototype.hasOwnProperty.call(values, normalized)
      ? values[normalized]
      : existing?.[index] ?? "";
  });
}

export class SheetsOrderRepository implements OrderRepository {
  public constructor(private readonly provider: DataProvider) {}

  private async getOrderRows(): Promise<{
    headers: readonly string[];
    entries: readonly StoredOrderRow[];
  }> {
    const rows = await this.provider.getRows(ORDERS_SHEET);
    const headers = assertHeaders(rows);
    const entries = toObjects(rows).map((entry) => ({
      rowIndex: entry.rowIndex,
      raw: entry.raw,
      order: rowToOrder(entry.values),
    }));
    return { headers, entries };
  }

  async create(order: Order): Promise<Order> {
    const { headers, entries } = await this.getOrderRows();
    const existing = entries.find(
      ({ order: saved }) =>
        saved.tenantId === order.tenantId &&
        (saved.id === order.id ||
          Boolean(order.idempotencyKey && saved.idempotencyKey === order.idempotencyKey)),
    );
    if (existing) return existing.order;

    await this.provider.appendRow(
      ORDERS_SHEET,
      serializeByHeaders(headers, order),
    );
    return order;
  }

  async getById(input: { tenantId: string; orderId: string }): Promise<Order | null> {
    const { entries } = await this.getOrderRows();
    return entries.find(({ order }) =>
      order.id === input.orderId && order.tenantId === input.tenantId
    )?.order ?? null;
  }

  async updatePayment(input: UpdatePaymentInput): Promise<Order> {
    const { headers, entries } = await this.getOrderRows();
    const match = entries.find(({ order }) =>
      order.id === input.orderId && order.tenantId === input.tenantId
    );
    if (!match) throw new Error("Order not found.");

    const existing = match.order;
    const updated: Order = {
      ...existing,
      status: input.orderStatus ?? existing.status,
      payment: {
        ...existing.payment,
        status: input.status,
        providerReference: input.providerReference ?? existing.payment.providerReference,
        transactionId: input.transactionId ?? existing.payment.transactionId,
        paidAt: input.paidAt ?? existing.payment.paidAt,
      },
      updatedAt: new Date().toISOString(),
    };

    await this.provider.updateRow(
      ORDERS_SHEET,
      match.rowIndex,
      serializeByHeaders(headers, updated, match.raw),
    );
    return updated;
  }

  async updateStatus(input: {
    tenantId: string;
    orderId: string;
    status: Order["status"];
  }): Promise<Order> {
    const { headers, entries } = await this.getOrderRows();
    const match = entries.find(({ order }) =>
      order.id === input.orderId && order.tenantId === input.tenantId
    );
    if (!match) throw new Error("Order not found.");

    const updated: Order = {
      ...match.order,
      status: input.status,
      updatedAt: new Date().toISOString(),
    };
    await this.provider.updateRow(
      ORDERS_SHEET,
      match.rowIndex,
      serializeByHeaders(headers, updated, match.raw),
    );
    return updated;
  }

  async listByTenant(input: { tenantId: string }): Promise<readonly Order[]> {
    const { entries } = await this.getOrderRows();
    return entries
      .filter(({ order }) => order.tenantId === input.tenantId)
      .map(({ order }) => order);
  }
}
