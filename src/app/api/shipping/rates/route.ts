import { NextResponse } from "next/server";
import { assertSingleStoreMode } from "@/infrastructure/config/assert-single-store-mode";

import { storeConfig } from "@/config/store";
import type { Cart } from "@/core/cart";
import { getTenantShippingService } from "@/infrastructure/shipping";

type RequestBody = {
  cart: Cart;
  destinationPostalCode: string;
  destinationAreaId?: string;
  courierCodes?: string[];
};

export async function POST(request: Request) {
  try {
    assertSingleStoreMode("rates");
    const body = (await request.json()) as RequestBody;
    if (!body.cart || body.cart.tenantId !== storeConfig.tenantId) {
      return NextResponse.json({ error: "Invalid shipping cart." }, { status: 400 });
    }

    const shippingService = await getTenantShippingService(storeConfig.tenantId);
    const rates = await shippingService.quote({
      tenantId: storeConfig.tenantId,
      cart: body.cart,
      destinationPostalCode: body.destinationPostalCode,
      destinationAreaId: body.destinationAreaId,
      courierCodes: body.courierCodes ?? ["jne", "jnt", "sicepat"],
    });

    return NextResponse.json({ rates });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to retrieve shipping rates." },
      { status: 400 },
    );
  }
}
