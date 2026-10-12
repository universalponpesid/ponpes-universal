import "server-only";

import { createHash } from "node:crypto";
import type { DataProvider } from "@/infrastructure/providers/data-provider";

const SHEET = "payment_events";
const HEADERS = [
  "event_id",
  "tenant_id",
  "order_id",
  "provider",
  "provider_event_key",
  "transaction_id",
  "transaction_status",
  "status_code",
  "gross_amount",
  "payload_hash",
  "processing_status",
  "received_at",
  "processed_at",
  "error_message",
] as const;

type EventInput = {
  tenantId: string;
  orderId: string;
  transactionId?: string;
  transactionStatus?: string;
  statusCode: string;
  grossAmount: string;
  payloadHash: string;
};

type EventRow = {
  rowNumber: number;
  values: Record<string, string>;
  raw: readonly string[];
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function stableKey(input: EventInput): string {
  return createHash("sha256")
    .update([
      input.tenantId,
      input.orderId,
      input.transactionId ?? "no-transaction-id",
      input.transactionStatus ?? "unknown-status",
      input.statusCode,
      input.grossAmount,
    ].join("|"))
    .digest("hex");
}

export type BeginPaymentEventResult = {
  eventKey: string;
  rowNumber: number;
  alreadyProcessed: boolean;
  inProgress: boolean;
};

/**
 * Best-effort webhook event ledger for Google Sheets. The order/payment domain
 * remains idempotent as well; Sheets does not provide a unique constraint or
 * transactional compare-and-set, so this ledger is an audit/retry aid, not a DB lock.
 */
export class SheetsPaymentEventRepository {
  constructor(private readonly provider: DataProvider) {}

  private async getRows(): Promise<{ headers: readonly string[]; rows: EventRow[] }> {
    const rawRows = await this.provider.getRows(SHEET);
    if (rawRows.length === 0) {
      throw new Error(`Sheet "${SHEET}" belum memiliki header. Buat tab payment_events sesuai dokumentasi MT-02C.2.`);
    }
    const headers = rawRows[0].map(normalizeHeader);
    const missing = HEADERS.filter((header) => !headers.includes(header));
    if (missing.length) {
      throw new Error(`Header sheet "${SHEET}" belum lengkap: ${missing.join(", ")}.`);
    }
    const rows = rawRows.slice(1).flatMap((raw, index) => {
      const values: Record<string, string> = {};
      headers.forEach((header, column) => { values[header] = raw[column] ?? ""; });
      if (!values.provider_event_key) return [];
      return [{ rowNumber: index + 2, values, raw }];
    });
    return { headers, rows };
  }

  async begin(input: EventInput): Promise<BeginPaymentEventResult> {
    const eventKey = stableKey(input);
    const { headers, rows } = await this.getRows();
    const existing = rows.find((row) => row.values.provider_event_key === eventKey);
    const now = new Date().toISOString();

    if (existing) {
      if (existing.values.processing_status === "processed") {
        return { eventKey, rowNumber: existing.rowNumber, alreadyProcessed: true, inProgress: false };
      }
      const receivedAt = Date.parse(existing.values.received_at ?? "");
      const processingAgeMs = Date.now() - receivedAt;
      if (existing.values.processing_status === "processing" && Number.isFinite(receivedAt) && processingAgeMs >= 0 && processingAgeMs < 120_000) {
        return { eventKey, rowNumber: existing.rowNumber, alreadyProcessed: false, inProgress: true };
      }
      const values: Record<string, string> = {
        ...existing.values,
        processing_status: "processing",
        received_at: now,
        processed_at: "",
        error_message: "",
      };
      await this.provider.updateRow(SHEET, existing.rowNumber, headers.map((header, index) =>
        Object.prototype.hasOwnProperty.call(values, header) ? values[header] : existing.raw[index] ?? "",
      ));
      return { eventKey, rowNumber: existing.rowNumber, alreadyProcessed: false, inProgress: false };
    }

    const eventId = `pev_${eventKey.slice(0, 24)}`;
    const values: Record<string, string> = {
      event_id: eventId,
      tenant_id: input.tenantId,
      order_id: input.orderId,
      provider: "midtrans",
      provider_event_key: eventKey,
      transaction_id: input.transactionId ?? "",
      transaction_status: input.transactionStatus ?? "unknown",
      status_code: input.statusCode,
      gross_amount: input.grossAmount,
      payload_hash: input.payloadHash,
      processing_status: "processing",
      received_at: now,
      processed_at: "",
      error_message: "",
    };
    await this.provider.appendRow(SHEET, headers.map((header) => values[header] ?? ""));
    // Re-read to obtain the persisted row number rather than assuming append position.
    const persisted = await this.getRows();
    const row = persisted.rows.find((entry) => entry.values.provider_event_key === eventKey);
    if (!row) throw new Error("Payment event appended but could not be read back for audit.");
    return { eventKey, rowNumber: row.rowNumber, alreadyProcessed: false, inProgress: false };
  }

  async finish(eventKey: string, status: "processed" | "failed", errorMessage?: string): Promise<void> {
    const { headers, rows } = await this.getRows();
    const event = rows.find((row) => row.values.provider_event_key === eventKey);
    if (!event) throw new Error("Payment event audit row was not found.");
    const values: Record<string, string> = {
      ...event.values,
      processing_status: status,
      processed_at: status === "processed" ? new Date().toISOString() : "",
      error_message: errorMessage?.slice(0, 500) ?? "",
    };
    await this.provider.updateRow(SHEET, event.rowNumber, headers.map((header, index) =>
      Object.prototype.hasOwnProperty.call(values, header) ? values[header] : event.raw[index] ?? "",
    ));
  }
}
