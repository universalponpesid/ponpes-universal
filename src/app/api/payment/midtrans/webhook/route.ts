import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { assertSingleStoreMode } from "@/infrastructure/config/assert-single-store-mode";

import { storeConfig } from "@/config/store";
import { getOrderService } from "@/infrastructure/commerce";
import { resolveMidtransRuntimeConfig } from "@/infrastructure/tenant-config/provider-config";
import { GoogleSheetsDataProvider } from "@/infrastructure/providers/google-sheets";
import { SheetsPaymentEventRepository } from "@/infrastructure/repositories/sheets/payment-event-repository";

type MidtransNotification = {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_status?: string;
  fraud_status?: string;
  transaction_id?: string;
  transaction_time?: string;
  settlement_time?: string;
};

function isValidSignature(
  notification: MidtransNotification,
  serverKey: string,
): boolean {
  if (
    !notification.order_id ||
    !notification.status_code ||
    !notification.gross_amount ||
    !notification.signature_key
  ) {
    return false;
  }

  const expected = createHash("sha512")
    .update(
      `${notification.order_id}${notification.status_code}${notification.gross_amount}${serverKey}`,
    )
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(notification.signature_key, "utf8");

  return expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function POST(request: Request) {
  let eventRepository: SheetsPaymentEventRepository | undefined;
  let currentEventKey: string | undefined;
  try {
    assertSingleStoreMode("webhook");
    const runtimeConfig = await resolveMidtransRuntimeConfig(storeConfig.tenantId);
    if (!runtimeConfig.enabled || !runtimeConfig.serverKey) {
      return NextResponse.json(
        { error: "Midtrans belum aktif atau kredensial tenant belum dikonfigurasi." },
        { status: 503 },
      );
    }

    const notification = (await request.json()) as MidtransNotification;
    if (!isValidSignature(notification, runtimeConfig.serverKey)) {
      return NextResponse.json({ error: "Invalid Midtrans signature." }, { status: 401 });
    }

    const orderId = notification.order_id;
    if (!orderId) {
      return NextResponse.json({ error: "Missing order_id." }, { status: 400 });
    }

    const orderService = getOrderService();
    const order = await orderService.getOrder(storeConfig.tenantId, orderId);

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (order.payment.method !== "midtrans") {
      return NextResponse.json({ error: "Order ini tidak menggunakan Midtrans." }, { status: 409 });
    }

    const receivedAmount = Number(notification.gross_amount);
    if (
      !Number.isFinite(receivedAmount) ||
      Math.abs(receivedAmount - order.grandTotal) >= 0.01
    ) {
      return NextResponse.json(
        { error: "Midtrans gross_amount does not match the order total." },
        { status: 400 },
      );
    }

    eventRepository = new SheetsPaymentEventRepository(new GoogleSheetsDataProvider());
    const event = await eventRepository.begin({
      tenantId: storeConfig.tenantId,
      orderId,
      transactionId: notification.transaction_id,
      transactionStatus: notification.transaction_status,
      statusCode: notification.status_code ?? "",
      grossAmount: notification.gross_amount ?? "",
      payloadHash: createHash("sha256").update(JSON.stringify(notification)).digest("hex"),
    });
    currentEventKey = event.eventKey;
    if (event.alreadyProcessed) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const transactionStatus = notification.transaction_status;
    const isSuccessful =
      transactionStatus === "settlement" ||
      (transactionStatus === "capture" && notification.fraud_status === "accept");

    if (isSuccessful) {
      const paidAt =
        notification.settlement_time ??
        notification.transaction_time ??
        new Date().toISOString();

      await orderService.markPaymentPaid({
        tenantId: storeConfig.tenantId,
        orderId,
        providerReference: orderId,
        transactionId: notification.transaction_id,
        paidAt,
      });
      await eventRepository.finish(event.eventKey, "processed");
      currentEventKey = undefined;
      return NextResponse.json({ received: true });
    }

    if (transactionStatus === "expire") {
      await orderService.markPaymentExpired({
        tenantId: storeConfig.tenantId,
        orderId,
        transactionId: notification.transaction_id,
      });
      await eventRepository.finish(event.eventKey, "processed");
      currentEventKey = undefined;
      return NextResponse.json({ received: true });
    }

    if (transactionStatus === "deny" || transactionStatus === "cancel") {
      await orderService.markPaymentFailed({
        tenantId: storeConfig.tenantId,
        orderId,
        transactionId: notification.transaction_id,
      });
      await eventRepository.finish(event.eventKey, "processed");
      currentEventKey = undefined;
      return NextResponse.json({ received: true });
    }

    // Pending or other non-terminal Midtrans states do not mark the order paid.
    await eventRepository.finish(event.eventKey, "processed");
    currentEventKey = undefined;
    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to process Midtrans notification.";
    if (eventRepository && currentEventKey) {
      try {
        await eventRepository.finish(currentEventKey, "failed", message);
      } catch {
        // Preserve the original webhook error; failed event rows can be reconciled manually.
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
