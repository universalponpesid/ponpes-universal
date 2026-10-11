/** Stable identity and server-only routing data for one tenant. */
export type TenantStatus = "active" | "suspended";

export interface TenantContext {
  tenantId: string;
  slug: string;
  name: string;
  status: TenantStatus;
  configVersion: string;
  /** Server-only Google Spreadsheet routing metadata. Never serialize to the client. */
  spreadsheetId: string;
}

export interface TenantRegistryRecord {
  tenantId: string;
  slug: string;
  name: string;
  spreadsheetId: string;
  status: TenantStatus;
  configVersion: string;
}

export interface TenantRegistry {
  getByTenantId(tenantId: string): Promise<TenantRegistryRecord | null>;
  listActive(): Promise<readonly TenantRegistryRecord[]>;
}

export interface ResolveTenantInput {
  /** Must be resolved/validated by server code; never trust a spreadsheet ID from a request. */
  tenantId?: string;
}
