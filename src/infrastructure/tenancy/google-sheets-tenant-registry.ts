import "server-only";

import type { TenantRegistry, TenantRegistryRecord, TenantStatus } from "@/core/tenancy/types";
import { GoogleSheetsDataProvider } from "@/infrastructure/providers/google-sheets";

const TENANTS_SHEET = "tenants";
const REQUIRED_HEADERS = ["tenant_id", "slug", "name", "spreadsheet_id", "status", "config_version"] as const;

type RegistryRow = Record<string, string>;

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function parseStatus(value: string): TenantStatus {
  if (value === "active" || value === "suspended") return value;
  throw new Error(`Status tenant '${value}' tidak valid. Gunakan active atau suspended.`);
}

function mapRecord(row: RegistryRow): TenantRegistryRecord {
  const tenantId = (row.tenant_id ?? "").trim().toLowerCase();
  const slug = (row.slug ?? "").trim().toLowerCase();
  const name = (row.name ?? "").trim();
  const spreadsheetId = (row.spreadsheet_id ?? "").trim();
  const configVersion = (row.config_version ?? "1").trim() || "1";

  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(tenantId)) {
    throw new Error("Registry tenants berisi tenant_id yang tidak valid.");
  }
  if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(slug)) {
    throw new Error(`Slug tenant '${tenantId}' tidak valid.`);
  }
  if (!name || !spreadsheetId) {
    throw new Error(`Tenant '${tenantId}' wajib memiliki name dan spreadsheet_id.`);
  }

  return {
    tenantId,
    slug,
    name,
    spreadsheetId,
    status: parseStatus((row.status ?? "").trim().toLowerCase()),
    configVersion,
  };
}

export class GoogleSheetsTenantRegistry implements TenantRegistry {
  private readonly provider: GoogleSheetsDataProvider;

  constructor(platformSpreadsheetId: string) {
    if (!platformSpreadsheetId.trim()) {
      throw new Error("PLATFORM_GOOGLE_SHEETS_SPREADSHEET_ID wajib diisi untuk mode marketplace.");
    }
    this.provider = new GoogleSheetsDataProvider(platformSpreadsheetId.trim());
  }

  private async getRecords(): Promise<readonly TenantRegistryRecord[]> {
    const rows = await this.provider.getRows(TENANTS_SHEET);
    if (rows.length === 0) {
      throw new Error('Sheet "tenants" belum memiliki header.');
    }

    const headers = rows[0].map(normalizeHeader);
    const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
    if (missing.length > 0) {
      throw new Error(`Header sheet tenants belum lengkap: ${missing.join(", ")}.`);
    }

    const records = rows.slice(1)
      .filter((row) => row.some((cell) => cell.trim() !== ""))
      .map((row) => {
        const object: RegistryRow = {};
        headers.forEach((header, index) => { object[header] = row[index] ?? ""; });
        return mapRecord(object);
      });

    const ids = new Set<string>();
    const slugs = new Set<string>();
    for (const record of records) {
      if (ids.has(record.tenantId)) throw new Error(`Duplikat tenant_id '${record.tenantId}' di registry.`);
      if (slugs.has(record.slug)) throw new Error(`Duplikat slug '${record.slug}' di registry.`);
      ids.add(record.tenantId);
      slugs.add(record.slug);
    }
    return records;
  }

  async getByTenantId(tenantId: string): Promise<TenantRegistryRecord | null> {
    const records = await this.getRecords();
    return records.find((record) => record.tenantId === tenantId) ?? null;
  }

  async listActive(): Promise<readonly TenantRegistryRecord[]> {
    return (await this.getRecords()).filter((record) => record.status === "active");
  }
}
