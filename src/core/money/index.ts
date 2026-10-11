export type CurrencyCode = "IDR";

export type Money = {
  amount: number;
  currency: CurrencyCode;
};

export function money(amount: number, currency: CurrencyCode = "IDR"): Money {
  if (!Number.isFinite(amount)) {
    throw new Error("Invalid monetary amount");
  }

  return {
    amount: Math.round(amount),
    currency,
  };
}

export function formatMoney(
  amount: number,
  currency: CurrencyCode = "IDR"
): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function addMoney(...values: Money[]): Money {
  if (values.length === 0) return money(0);

  const currency = values[0].currency;
  if (values.some((value) => value.currency !== currency)) {
    throw new Error("Currency mismatch");
  }

  return money(
    values.reduce((total, value) => total + value.amount, 0),
    currency
  );
}
