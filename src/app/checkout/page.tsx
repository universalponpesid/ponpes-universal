import { CheckoutPage } from "@/components/checkout";
import { paymentConfig } from "@/config/payment";
import { storeConfig } from "@/config/store";
import { resolveMidtransRuntimeConfig } from "@/infrastructure/tenant-config/provider-config";

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

  return (
    <CheckoutPage
      payment={{
        midtransEnabled: midtrans.enabled,
        midtransClientKey: midtrans.clientKey,
        midtransEnvironment: midtrans.environment,
        manualBank: paymentConfig.manualBankTransfer,
        manualQris: paymentConfig.manualQris,
      }}
    />
  );
}
