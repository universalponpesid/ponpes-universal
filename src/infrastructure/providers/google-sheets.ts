import "server-only";

import { google } from "googleapis";

import type { DataProvider } from "./data-provider";

const DEFAULT_RANGE = "A:ZZ";

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}`,
    );
  }

  return value;
}

function getPrivateKey(): string {
  return getRequiredEnv(
    "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
  ).replace(/\\n/g, "\n");
}

function createSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: getRequiredEnv(
        "GOOGLE_SERVICE_ACCOUNT_EMAIL",
      ),
      private_key: getPrivateKey(),
    },
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });

  return google.sheets({
    version: "v4",
    auth,
  });
}

export class GoogleSheetsDataProvider
  implements DataProvider
{
  private readonly spreadsheetId: string;

  constructor(spreadsheetId?: string) {
    this.spreadsheetId =
      spreadsheetId ??
      getRequiredEnv(
        "GOOGLE_SHEETS_SPREADSHEET_ID",
      );
  }

  async getRows(
    sheet: string,
    options?: {
      range?: string;
    },
  ): Promise<readonly (readonly string[])[]> {
    const sheets = createSheetsClient();

    const range = options?.range
      ? `${sheet}!${options.range}`
      : `${sheet}!${DEFAULT_RANGE}`;

    const response =
      await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range,
        majorDimension: "ROWS",
      });

    return response.data.values ?? [];
  }

  async appendRow(
    sheet: string,
    values: readonly string[],
  ): Promise<void> {
    const sheets = createSheetsClient();

    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${sheet}!A:ZZ`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [Array.from(values)],
      },
    });
  }

  async updateRow(
    sheet: string,
    rowNumber: number,
    values: readonly string[],
  ): Promise<void> {
    if (rowNumber < 2) {
      throw new Error(
        `Invalid sheet row: ${rowNumber}`,
      );
    }

    const sheets = createSheetsClient();

    await sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${sheet}!A${rowNumber}:ZZ${rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [Array.from(values)],
      },
    });
  }
}