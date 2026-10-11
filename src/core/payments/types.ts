export type PaymentMethod = "midtrans" | "manual_bank_transfer" | "manual_qris";

export type PaymentInstruction = {
  method: PaymentMethod;
  title: string;
  description: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  qrisImageUrl?: string;
};
