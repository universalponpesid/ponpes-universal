
import { NextResponse } from "next/server";
import { assertSingleStoreMode } from "@/infrastructure/config/assert-single-store-mode";

import { storeConfig } from "@/config/store";
import type { PaymentMethod } from "@/core/payments";
import { getOrderService } from "@/infrastructure/commerce";

type RequestBody = {
  orderId?: string;
  method?: PaymentMethod;
};

export async function POST(request: Request) {
  try {
    assertSingleStoreMode("confirm");
    const body = (await request.json()) as RequestBody;

    if (
      !body.orderId?.trim() ||
      (body.method !== "manual_bank_transfer" &&
        body.method !== "manual_qris")
    ) {
      return NextResponse.json(
        { error: "Order and manual payment method are required." },
        { status: 400 },
      );
    }

    const service = getOrderService();
    const order = await service.getOrder(
      storeConfig.tenantId,
      body.orderId.trim(),
    );

    if (!order) {
      return NextResponse.json(
        { error: "Order was not found." },
        { status: 404 },
      );
    }

    if (order.payment.method !== body.method) {
      return NextResponse.json(
        { error: "Payment method does not match this order." },
        { status: 409 },
      );
    }

    if (order.payment.status !== "pending") {
      return NextResponse.json(
        { error: "Order payment is no longer pending." },
        { status: 409 },
      );
    }

    const updated = await service.markPaymentVerification({
      tenantId: storeConfig.tenantId,
      orderId: order.id,
    });

    return NextResponse.json({ order: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to confirm manual payment.",
      },
      { status: 400 },
    );
  }
}
