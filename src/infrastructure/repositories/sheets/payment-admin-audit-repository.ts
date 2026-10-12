import "server-only";

import { randomUUID } from "node:crypto";
import type { DataProvider } from "@/infrastructure/providers/data-provider";

const SHEET = "payment_admin_audit";
const HEADERS = [
  "audit_id", "tenant_id", "order_id", "action", "previous_payment_status",
  "next_payment_status", "admin_id", "reason", "amount", "created_at",
  "result", "error_message",
] as const;

type AuditInput = {
  tenantId: string;
  orderId: string;
  action: "approve" | "reject";
  previousPaymentStatus: string;
  nextPaymentStatus: string;
  adminId: string;
  reason: string;
  amount: number;
  result: "started" | "succeeded" | "failed";
  errorMessage?: string;
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

export class SheetsPaymentAdminAuditRepository {
  constructor(private readonly provider: DataProvider) {}

  async append(input: AuditInput): Promise<string> {
    const rows = await this.provider.getRows(SHEET);
    if (!rows.length) throw new Error(`Sheet "${SHEET}" belum memiliki header.`);
    const headers = rows[0].map(normalizeHeader);
    const missing = HEADERS.filter((header) => !headers.includes(header));
    if (missing.length) throw new Error(`Header ${SHEET} belum lengkap: ${missing.join(", ")}.`);
    const auditId = `pma_${randomUUID()}`;
    const values: Record<string, string> = {
      audit_id: auditId,
      tenant_id: input.tenantId,
      order_id: input.orderId,
      action: input.action,
      previous_payment_status: input.previousPaymentStatus,
      next_payment_status: input.nextPaymentStatus,
      admin_id: input.adminId,
      reason: input.reason,
      amount: String(input.amount),
      created_at: new Date().toISOString(),
      result: input.result,
      error_message: input.errorMessage?.slice(0, 500) ?? "",
    };
    await this.provider.appendRow(SHEET, headers.map((header) => values[header] ?? ""));
    return auditId;
  }

  async finish(auditId: string, result: "succeeded" | "failed", errorMessage?: string): Promise<void> {
    const rows = await this.provider.getRows(SHEET);
    if (!rows.length) throw new Error(`Sheet "${SHEET}" belum memiliki header.`);
    const headers = rows[0].map(normalizeHeader);
    const idIndex = headers.indexOf("audit_id");
    const resultIndex = headers.indexOf("result");
    const errorIndex = headers.indexOf("error_message");
    if (idIndex < 0 || resultIndex < 0 || errorIndex < 0) throw new Error(`Header ${SHEET} tidak valid.`);
    const index = rows.slice(1).findIndex((row) => row[idIndex] === auditId);
    if (index < 0) throw new Error(`Audit ${auditId} tidak ditemukan.`);
    const rowNumber = index + 2;
    const updated = [...rows[rowNumber - 1]];
    while (updated.length < headers.length) updated.push("");
    updated[resultIndex] = result;
    updated[errorIndex] = errorMessage?.slice(0, 500) ?? "";
    await this.provider.updateRow(SHEET, rowNumber, updated);
  }
}
