import { NextResponse } from "next/server";
import { assertSingleStoreMode } from "@/infrastructure/config/assert-single-store-mode";

import { storeConfig } from "@/config/store";
import { getTenantMidtransProvider } from "@/infrastructure/payments";
import { getOrderService } from "@/infrastructure/commerce";

export async function POST(
  request: Request,
): Promise<Response> {
  try {
    assertSingleStoreMode("token");
    const body = (await request.json()) as {
      orderId?: string;
    };

    const orderId = body.orderId?.trim();

    if (!orderId) {
      return NextResponse.json(
        {
          error: "orderId is required.",
        },
        {
          status: 400,
        },
      );
    }


    const orderService =
      getOrderService();

    const order =
      await orderService.getOrder(
        storeConfig.tenantId,
        orderId,
      );

    if (!order) {
      return NextResponse.json(
        {
          error: "Order was not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      order.tenantId !==
      storeConfig.tenantId
    ) {
      return NextResponse.json(
        {
          error: "Order was not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      order.status !==
      "pending_payment"
    ) {
      return NextResponse.json(
        {
          error:
            "Order is no longer awaiting payment.",
        },
        {
          status: 409,
        },
      );
    }

    if (
      order.payment.status !==
      "pending"
    ) {
      return NextResponse.json(
        {
          error:
            "Order payment is no longer pending.",
        },
        {
          status: 409,
        },
      );
    }

    if (order.payment.method !== "midtrans") {
      return NextResponse.json({ error: "Order ini tidak menggunakan pembayaran Midtrans." }, { status: 409 });
    }

    const { provider, config } = await getTenantMidtransProvider(storeConfig.tenantId);
    const token = await provider.createSnapToken(order);

    return NextResponse.json({
      token,
      clientKey: config.clientKey,
      environment: config.environment,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create payment token.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 400,
      },
    );
  }
}
