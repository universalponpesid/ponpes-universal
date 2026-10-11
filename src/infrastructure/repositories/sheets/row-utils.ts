export type SheetRow = Record<string, string>;

export function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function rowsToObjects(
  rows: readonly (readonly string[])[],
): readonly SheetRow[] {
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map(normalizeHeader);

  return rows.slice(1).map((row) => {
    const object: SheetRow = {};

    headers.forEach((header, index) => {
      object[header] = row[index] ?? "";
    });

    return object;
  });
}

export function parseOptionalNumber(
  value: string | undefined,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const raw = value.trim();

  if (raw === "") {
    return undefined;
  }

  const normalized = raw
    .replace(/\s+/g, "")
    .replace(/[^\d,.-]/g, "");

  if (
    normalized === "" ||
    normalized === "-" ||
    normalized === "." ||
    normalized === ","
  ) {
    return undefined;
  }

  const comma = normalized.lastIndexOf(",");
  const dot = normalized.lastIndexOf(".");

  let numericValue: string;

  if (comma !== -1 && dot !== -1) {
    const lastSeparator = Math.max(comma, dot);
    const fractionalDigits =
      normalized.length - lastSeparator - 1;

    if (fractionalDigits > 0 && fractionalDigits <= 2) {
      numericValue =
        normalized
          .slice(0, lastSeparator)
          .replace(/[.,]/g, "") +
        "." +
        normalized.slice(lastSeparator + 1);
    } else {
      numericValue = normalized.replace(/[.,]/g, "");
    }
  } else if (comma !== -1 || dot !== -1) {
    const separator = comma !== -1 ? "," : ".";
    const index = normalized.lastIndexOf(separator);
    const trailingDigits =
      normalized.length - index - 1;

    if (trailingDigits === 3) {
      numericValue = normalized.replace(/[.,]/g, "");
    } else {
      numericValue = normalized.replace(separator, ".");

      const otherSeparator =
        separator === "," ? "." : ",";

      numericValue = numericValue.replace(
        otherSeparator,
        "",
      );
    }
  } else {
    numericValue = normalized;
  }

  const parsed = Number(numericValue);

  return Number.isFinite(parsed)
    ? parsed
    : undefined;
}

export function parseNumber(
  value: string | undefined,
  fallback = 0,
): number {
  const parsed = parseOptionalNumber(value);

  return parsed ?? fallback;
}

export function parseBoolean(
  value: string | undefined,
  fallback = false,
): boolean {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  return ["true", "1", "yes", "y"].includes(
    value.trim().toLowerCase(),
  );
}

export function parseJson<T>(
  value: string | undefined,
  fallback: T,
): T {
  if (!value || value.trim() === "") {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function parseCsv(
  value: string | undefined,
): string[] {
  if (!value || value.trim() === "") {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}