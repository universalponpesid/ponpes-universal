import { NextResponse } from "next/server";
import { storeConfig } from "@/config/store";
import { getCartService } from "@/core/cart";
import type { Cart } from "@/core/cart";
import { assertSingleStoreMode } from "@/infrastructure/config/assert-single-store-mode";

export async function POST(request: Request) {
  try {
    assertSingleStoreMode("reconcile");
    const cart = (await request.json()) as Cart;

    if (!cart || cart.tenantId !== storeConfig.tenantId || !Array.isArray(cart.items)) {
      return NextResponse.json({ error: "Invalid cart payload." }, { status: 400 });
    }

    const reconciliation = await getCartService().reconcileCart(cart);
    return NextResponse.json(reconciliation);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to reconcile cart." },
      { status: 500 },
    );
  }
}
