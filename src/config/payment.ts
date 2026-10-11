import "server-only";

import type { PaymentInstruction } from "@/core/payments";

export const paymentConfig: {
  midtrans: {
    enabled: boolean;
    environment: "sandbox" | "production";
    serverKey: string;
    clientKey: string;
  };
  manualBankTransfer: PaymentInstruction;
  manualQris: PaymentInstruction;
} = {
  midtrans: {
    enabled: process.env.MIDTRANS_ENABLED !== "false",
    environment: process.env.MIDTRANS_ENVIRONMENT === "production" ? "production" : "sandbox",
    serverKey: process.env.MIDTRANS_SERVER_KEY ?? "",
    clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "",
  },
  manualBankTransfer: {
    method: "manual_bank_transfer",
    title: process.env.NEXT_PUBLIC_MANUAL_BANK_NAME
      ? `Transfer Bank ${process.env.NEXT_PUBLIC_MANUAL_BANK_NAME}`
      : "Transfer Bank",
    description: "Transfer sesuai nominal order, lalu konfirmasi pembayaran kepada admin.",
    bankName: process.env.NEXT_PUBLIC_MANUAL_BANK_NAME ?? "",
    accountName: process.env.NEXT_PUBLIC_MANUAL_BANK_ACCOUNT_NAME ?? "",
    accountNumber: process.env.NEXT_PUBLIC_MANUAL_BANK_ACCOUNT_NUMBER ?? "",
  },
  manualQris: {
    method: "manual_qris",
    title: "QRIS",
    description: "Scan QRIS menggunakan aplikasi pembayaran pilihan Anda, lalu konfirmasi pembayaran.",
    qrisImageUrl: process.env.NEXT_PUBLIC_MANUAL_QRIS_IMAGE_URL ?? "",
  },
};
