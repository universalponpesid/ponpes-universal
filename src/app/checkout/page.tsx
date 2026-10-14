import { CheckoutPage } from "@/components/checkout";
import { paymentConfig } from "@/config/payment";
import { storeConfig } from "@/config/store";
import { resolveMidtransRuntimeConfig, resolveTenantPaymentPresentation } from "@/infrastructure/tenant-config/provider-config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Checkout",
};

export default async function CheckoutRoute() {
  let midtrans = {
    enabled: paymentConfig.midtrans.enabled,
    environment: paymentConfig.midtrans.environment,
    clientKey: paymentConfig.midtrans.clientKey,
  };

  try {
    const tenantPayment = await resolveMidtransRuntimeConfig(storeConfig.tenantId);
    midtrans = {
      enabled: tenantPayment.enabled,
      environment: tenantPayment.environment,
      clientKey: tenantPayment.clientKey,
    };
  } catch {
    // Do not advertise a provider as available when its tenant configuration cannot be verified.
    // Manual payment methods remain available from the existing single-store configuration.
    midtrans = {
      enabled: false,
      environment: paymentConfig.midtrans.environment,
      clientKey: "",
    };
  }

  let manualBank = paymentConfig.manualBankTransfer;
  let manualQris = paymentConfig.manualQris;
  let manualBankEnabled = true;
  let manualQrisEnabled = true;

  try {
    const presentation = await resolveTenantPaymentPresentation(storeConfig.tenantId);
    manualBank = presentation.manualBank;
    manualQris = presentation.manualQris;
    manualBankEnabled = presentation.manualBankEnabled;
    manualQrisEnabled = presentation.manualQrisEnabled;
  } catch {
    // Never fall back to another tenant's instructions when tenant config is invalid.
    manualBankEnabled = false;
    manualQrisEnabled = false;
    manualBank = {
      method: "manual_bank_transfer",
      title: "Transfer Bank",
      description: "Instruksi pembayaran belum dapat dimuat. Hubungi admin toko sebelum melakukan transfer.",
      bankName: "",
      accountName: "",
      accountNumber: "",
    };
    manualQris = {
      method: "manual_qris",
      title: "QRIS",
      description: "Instruksi QRIS belum dapat dimuat. Hubungi admin toko sebelum melakukan pembayaran.",
      qrisImageUrl: "",
    };
  }

  return (
    <CheckoutPage
      payment={{
        midtransEnabled: midtrans.enabled,
        midtransClientKey: midtrans.clientKey,
        midtransEnvironment: midtrans.environment,
        manualBank,
        manualQris,
        manualBankEnabled,
        manualQrisEnabled,
      }}
    />
  );
}
