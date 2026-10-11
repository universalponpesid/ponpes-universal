export interface DataProvider {
  getRows(
    sheet: string,
    options?: {
      range?: string;
    },
  ): Promise<readonly (readonly string[])[]>;

  appendRow(
    sheet: string,
    values: readonly string[],
  ): Promise<void>;

  updateRow(
    sheet: string,
    rowNumber: number,
    values: readonly string[],
  ): Promise<void>;
}