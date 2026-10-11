import { NextResponse } from "next/server";
import { getCartService } from "@/core/cart";
import type { Cart } from "@/core/cart";
import { storeConfig } from "@/config/store";
import { assertSingleStoreMode } from "@/infrastructure/config/assert-single-store-mode";

export async function POST(request: Request) {
  try {
    assertSingleStoreMode("validate");
    const cart = (await request.json()) as Cart;

    if (!cart || cart.tenantId !== storeConfig.tenantId || !Array.isArray(cart.items)) {
      return NextResponse.json({ error: "Invalid cart payload." }, { status: 400 });
    }

    const resolved = await getCartService().resolveCartWithAvailability(cart);
    return NextResponse.json({
      currency: resolved.currency,
      subtotal: resolved.subtotal,
      itemCount: resolved.items.reduce((total, item) => total + item.quantity, 0),
      items: resolved.items.map((item) => ({
        id: item.id,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
        availability: item.availability,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to validate cart." },
      { status: 500 },
    );
  }
}
